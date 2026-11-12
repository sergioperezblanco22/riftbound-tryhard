import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  coachCompareDeckVersions,
  coachMatchupMatrix,
  coachPerformanceSummary,
  coachSearchNotes,
  getEventList,
  getFilterOptions,
  getMatches,
} from "@/lib/db/queries";
import { getCoachConfig } from "@/lib/env";
import type { MatchFilters } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// El coach puede recorrer una cadena de modelos y tardar hasta 150 s. En Vercel
// (plan Hobby) el maximo permitido es 300 s; en un servidor propio se ignora.
export const maxDuration = 300;

// =============================================================================
// AI Coach: route handler server-side. La API key NUNCA llega al navegador.
// El modelo solo puede leer datos a traves de las herramientas declaradas, que
// respetan las mismas reglas estadisticas y la RLS del usuario.
// =============================================================================

const SYSTEM_PROMPT = `Eres el "AI Coach" de Riftbound Competitive Tracker, un asistente para jugadores competitivos de Riftbound.

Tu trabajo:
- Analizar los datos REALES del jugador usando las herramientas disponibles antes de responder. No inventes cifras.
- Detectar patrones: mazos y versiones mas fuertes o debiles, matchups favorables y desfavorables, errores recurrentes en las notas.
- Proponer mejoras concretas y accionables (sideboard, plan de partida, mulligan, cambios de lista), no consejos genericos.

Reglas estadisticas que DEBES respetar al comunicar resultados:
1. Winrate = victorias / (victorias + derrotas) * 100. Los empates quedan FUERA del denominador pero se muestran aparte.
2. Si el denominador es 0, el winrate es "—" (sin datos), NUNCA 0%.
3. Byes y partidas anuladas nunca cuentan en las estadisticas.
4. Los matchups solo consideran partidas con leyenda rival identificada.
5. Siempre indica el tamano de muestra (n = numero de partidas).
6. Si la muestra es menor que 5, avisa explicitamente de que la conclusion es debil y puede ser ruido.

Estilo: espanol, directo, claro, sin relleno. Usa listas cortas. Empieza por la conclusion.
Cuando cites numeros, acompana el dato con su muestra, por ejemplo: "62% de winrate contra Jinx (n=13)".`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_catalog",
      description:
        "Lista los mazos (con sus versiones), leyendas, sets y torneos del jugador, incluyendo sus IDs. Usala primero para resolver nombres a IDs antes de llamar a otras herramientas.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_performance_summary",
      description:
        "Resumen de rendimiento: partidas, victorias, derrotas, empates, winrate y winrate por juegos. Los filtros se aplican antes de calcular porcentajes.",
      parameters: {
        type: "object",
        properties: {
          set_id: { type: "string", description: "ID del set (opcional)" },
          deck_id: { type: "string", description: "ID del mazo (opcional)" },
          deck_version_id: {
            type: "string",
            description: "ID de la version del mazo (opcional)",
          },
          event_id: { type: "string", description: "ID del torneo (opcional)" },
          opponent_legend_id: {
            type: "string",
            description: "ID de la leyenda rival (opcional)",
          },
          from: { type: "string", description: "Fecha ISO inicial (opcional)" },
          to: { type: "string", description: "Fecha ISO final (opcional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_matchup_matrix",
      description:
        "Matriz de winrate por version de mazo y leyenda rival. Excluye partidas sin leyenda rival identificada.",
      parameters: {
        type: "object",
        properties: {
          set_id: { type: "string" },
          deck_id: { type: "string" },
          deck_version_id: { type: "string" },
          event_id: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_deck_versions",
      description:
        "Compara el rendimiento de todas las versiones de un mazo concreto. Requiere el ID del mazo.",
      parameters: {
        type: "object",
        properties: {
          deck_id: { type: "string", description: "ID del mazo (obligatorio)" },
        },
        required: ["deck_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_match_notes",
      description:
        "Busca en las anotaciones del jugador por texto, categoria, etiquetas o partida concreta. Util para detectar errores recurrentes.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto a buscar" },
          category: {
            type: "string",
            description:
              "Categoria: mulligan | error_decision | problema_tempo | sideboard | plan_partida | error_ejecucion | otros",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Etiquetas a buscar",
          },
          match_id: { type: "string" },
          limit: { type: "integer", description: "Maximo de resultados" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_matches",
      description:
        "Devuelve las partidas mas recientes con resultado, mazo, version, rival, marcador y torneo.",
      parameters: {
        type: "object",
        properties: {
          set_id: { type: "string" },
          deck_id: { type: "string" },
          deck_version_id: { type: "string" },
          event_id: { type: "string" },
          opponent_legend_id: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          limit: { type: "integer", description: "Maximo de partidas (1-50)" },
        },
      },
    },
  },
];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

// =============================================================================
// Resiliencia del proveedor: Google responde 503 UNAVAILABLE ("high demand") o
// directamente no contesta, con frecuencia, en los modelos flash. En vez de
// reintentar el mismo modelo (que suele seguir saturado) pasamos al siguiente de
// la cadena de respaldo. El ultimo modelo que funciono se prueba primero en la
// siguiente peticion.
// =============================================================================

/** Reintentamos el mismo modelo solo cuando tiene sentido (cuota puntual). */
const RETRY_SAME_MODEL_STATUS = new Set([429]);
/** Tiempo maximo por intento contra el proveedor. */
const PROVIDER_TIMEOUT_MS = 45_000;
/** Presupuesto total para recorrer la cadena de modelos. */
const TOTAL_BUDGET_MS = 150_000;

let lastGoodModel: string | null = null;

function errorStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeCoachError(error: unknown): string {
  const status = errorStatus(error);
  if (status === 503 || status === 429) {
    return "El proveedor tiene los modelos saturados ahora mismo (respuesta 503/429). Espera unos segundos y vuelve a intentarlo.";
  }
  if (status === 401 || status === 403) {
    return "La clave del AI Coach no es válida o no tiene permisos.";
  }
  if (status === 404) {
    return "El modelo configurado ya no está disponible. Revisa GEMINI_MODEL / OPENAI_MODEL.";
  }
  return error instanceof Error ? error.message : "Error desconocido";
}

/**
 * Llama al modelo recorriendo la cadena: si uno responde 503, 404, se cuelga o
 * falla la red, se pasa al siguiente. Devuelve tambien que modelo ha respondido.
 */
async function createCompletion(
  client: OpenAI,
  models: string[],
  params: Omit<
    OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    "model"
  >
): Promise<{
  completion: OpenAI.Chat.Completions.ChatCompletion;
  model: string;
}> {
  const startedAt = Date.now();
  let lastError: unknown = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      if (Date.now() - startedAt > TOTAL_BUDGET_MS) {
        throw lastError instanceof Error
          ? lastError
          : new Error("El proveedor del AI Coach no responde.");
      }

      try {
        const completion = await client.chat.completions.create({
          ...params,
          model,
        });
        lastGoodModel = model;
        return { completion, model };
      } catch (error) {
        lastError = error;
        const status = errorStatus(error);
        if (status === null || !RETRY_SAME_MODEL_STATUS.has(status)) break;
        if (attempt === 1) await sleep(600);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Ningún modelo del AI Coach está disponible.");
}

function toFilters(args: Record<string, unknown>): MatchFilters {
  return {
    set_id: asString(args.set_id),
    deck_id: asString(args.deck_id),
    deck_version_id: asString(args.deck_version_id),
    event_id: asString(args.event_id),
    opponent_legend_id: asString(args.opponent_legend_id),
    from: asString(args.from),
    to: asString(args.to),
  };
}

async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "list_catalog": {
      const [options, events] = await Promise.all([
        getFilterOptions(),
        getEventList(),
      ]);
      return {
        decks: options.decks,
        legends: options.legends.map((legend) => ({
          id: legend.id,
          name: legend.name,
        })),
        sets: options.sets.map((set) => ({
          id: set.id,
          code: set.code,
          name: set.name,
        })),
        events: events.map((event) => ({
          id: event.id,
          name: event.name,
          start_date: event.start_date,
        })),
      };
    }
    case "get_performance_summary": {
      const result = await coachPerformanceSummary(toFilters(args));
      return result;
    }
    case "get_matchup_matrix": {
      const result = await coachMatchupMatrix(toFilters(args));
      return {
        summary: result.summary,
        cells: result.cells.map((cell) => ({
          deck: cell.deck_name,
          version: cell.version_label ?? `V${cell.version_number}`,
          opponent_legend: cell.opponent_legend_name,
          matches: cell.matches,
          wins: cell.wins,
          losses: cell.losses,
          draws: cell.draws,
          winrate: cell.winrate,
        })),
      };
    }
    case "compare_deck_versions": {
      const deckId = asString(args.deck_id);
      if (!deckId) return { error: "Falta deck_id" };
      const result = await coachCompareDeckVersions(deckId);
      if (!result) return { error: "Mazo no encontrado" };
      return result;
    }
    case "search_match_notes": {
      const limit =
        typeof args.limit === "number" ? Math.min(args.limit, 50) : 25;
      const notes = await coachSearchNotes({
        query: asString(args.query),
        category: asString(args.category),
        tags: Array.isArray(args.tags)
          ? (args.tags.filter((tag) => typeof tag === "string") as string[])
          : null,
        match_id: asString(args.match_id),
        limit,
      });
      return {
        total: notes.length,
        notes: notes.map((note) => ({
          category: note.category,
          content: note.content,
          tags: note.tags,
          date: note.played_at,
          deck: note.deck_name,
          opponent_legend: note.opponent_legend_name,
        })),
      };
    }
    case "get_recent_matches": {
      const limit =
        typeof args.limit === "number"
          ? Math.max(1, Math.min(args.limit, 50))
          : 20;
      const rows = await getMatches(toFilters(args), limit);
      return {
        total: rows.length,
        matches: rows.map((row) => ({
          date: row.played_at,
          result: row.result,
          deck: row.deck_name,
          version: row.version_label ?? `V${row.version_number}`,
          opponent_legend: row.opponent_legend_name,
          score: [row.game_wins, row.game_losses, row.game_draws]
            .filter((value) => value !== null)
            .join("-"),
          event: row.event_name,
        })),
      };
    }
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const coach = getCoachConfig();
  if (!coach) {
    return NextResponse.json(
      {
        error:
          "El AI Coach no está configurado. Define OPENAI_API_KEY o GEMINI_API_KEY en el servidor.",
      },
      { status: 503 }
    );
  }

  let body: { messages?: IncomingMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim() !== ""
    )
    .slice(-20);

  if (history.length === 0) {
    return NextResponse.json(
      { error: "No hay ninguna pregunta que responder." },
      { status: 400 }
    );
  }

  const client = new OpenAI({
    apiKey: coach.apiKey,
    baseURL: coach.baseURL,
    // Sin esto el SDK espera hasta 10 minutos y reintenta por su cuenta: el
    // usuario veria el chat "pensando" indefinidamente.
    timeout: PROVIDER_TIMEOUT_MS,
    maxRetries: 0,
  });
  const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
  ];

  const usedTools: string[] = [];
  let activeModel = coach.model;

  try {
    for (let step = 0; step < 6; step += 1) {
      const modelOrder = [
        ...new Set(
          [lastGoodModel, activeModel, ...coach.models].filter(
            (model): model is string => Boolean(model)
          )
        ),
      ];
      const { completion, model } = await createCompletion(
        client,
        modelOrder,
        {
          messages: conversation,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.3,
        }
      );
      // Si hemos tenido que usar un modelo de respaldo, lo mantenemos para el
      // resto de la conversacion (evita mezclar modelos en el mismo hilo).
      activeModel = model;

      const message = completion.choices[0]?.message;
      if (!message) break;

      conversation.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return NextResponse.json({
          reply: message.content ?? "",
          tools: usedTools,
          model: activeModel,
        });
      }

      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        usedTools.push(call.function.name);
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }
        const result = await runTool(call.function.name, parsedArgs);
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return NextResponse.json({
      reply:
        "He consultado muchos datos pero no he llegado a una conclusión clara. Prueba a acotar la pregunta (por ejemplo, a un mazo o a un periodo concreto).",
      tools: usedTools,
      model: activeModel,
    });
  } catch (error) {
    const status = errorStatus(error);
    const httpStatus = status === 429 || status === 503 ? 503 : 500;
    return NextResponse.json(
      { error: `El AI Coach falló: ${describeCoachError(error)}` },
      { status: httpStatus }
    );
  }
}

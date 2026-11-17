"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  Loader2Icon,
  SaveIcon,
  SkipForwardIcon,
} from "lucide-react";

import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createMatchAction,
  updateMatchAction,
  type ActionState,
} from "@/lib/db/actions";
import {
  MATCH_RESULTS,
  NOTE_CATEGORIES,
  type FilterOptions,
  type MatchEnrichedRow,
  type MatchResult,
  type NoteCategory,
} from "@/lib/db/types";
import { legendLabel } from "@/lib/format";
import { isoToLocalInput } from "@/lib/validation";

const INITIAL: ActionState = { ok: false };

const RESULT_STYLES: Record<MatchResult, string> = {
  win: "data-[active=true]:bg-emerald-500/90 data-[active=true]:text-emerald-900 data-[active=true]:border-emerald-500 dark:data-[active=true]:bg-emerald-500 dark:data-[active=true]:text-emerald-900",
  loss: "data-[active=true]:bg-rose-500/90 data-[active=true]:text-rose-900 data-[active=true]:border-rose-500 dark:data-[active=true]:bg-rose-500 dark:data-[active=true]:text-rose-900",
  draw: "data-[active=true]:bg-amber-500/90 data-[active=true]:text-amber-900 data-[active=true]:border-amber-500 dark:data-[active=true]:bg-amber-500 dark:data-[active=true]:text-amber-900",
  bye: "data-[active=true]:bg-muted-foreground data-[active=true]:text-background data-[active=true]:border-muted-foreground",
  void: "data-[active=true]:bg-muted-foreground data-[active=true]:text-background data-[active=true]:border-muted-foreground",
};

/** Marcadores validos segun el resultado. */
const SCORE_BY_RESULT: Record<MatchResult, string[]> = {
  win: ["2-0", "2-1", "1-0"],
  loss: ["0-2", "1-2", "0-1"],
  draw: ["1-1"],
  bye: [],
  void: [],
};

const STEPS = [
  { id: "result", label: "Resultado" },
  { id: "deck", label: "Mazo y versión" },
  { id: "opponent", label: "Rival" },
  { id: "context", label: "Contexto" },
  { id: "note", label: "Nota" },
  { id: "summary", label: "Resumen" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function parseScore(score: string): {
  game_wins: number | null;
  game_losses: number | null;
  game_draws: number | null;
} {
  const parts = score.split("-");
  const wins = Number(parts[0]);
  const losses = Number(parts[1]);
  const draws = parts[2] ? Number(parts[2]) : null;
  return {
    game_wins: Number.isNaN(wins) ? null : wins,
    game_losses: Number.isNaN(losses) ? null : losses,
    game_draws: draws && !Number.isNaN(draws) ? draws : null,
  };
}

/** Lee la ultima partida registrada desde localStorage (mazo, version, rival). */
function loadLastMatchPrefs(): {
  deckVersionId: string | null;
  opponentLegendId: string | null;
} {
  if (typeof window === "undefined")
    return { deckVersionId: null, opponentLegendId: null };
  try {
    const raw = window.localStorage.getItem("rb:last_match");
    if (!raw) return { deckVersionId: null, opponentLegendId: null };
    const parsed = JSON.parse(raw);
    return {
      deckVersionId: parsed.deckVersionId ?? null,
      opponentLegendId: parsed.opponentLegendId ?? null,
    };
  } catch {
    return { deckVersionId: null, opponentLegendId: null };
  }
}

function saveLastMatchPrefs(prefs: {
  deckVersionId: string | null;
  opponentLegendId: string | null;
}) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("rb:last_match", JSON.stringify(prefs));
  } catch {
    // silencioso
  }
}

export function MatchForm({
  options,
  match,
}: {
  options: FilterOptions;
  match?: MatchEnrichedRow;
}) {
  const isEdit = Boolean(match);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateMatchAction : createMatchAction,
    INITIAL
  );
  const [step, setStep] = useState<StepId>("result");

  // Estado del formulario (valores sueltos, solo para UI).
  const [playedAt, setPlayedAt] = useState(
    match?.played_at
      ? isoToLocalInput(match.played_at)
      : new Date().toISOString().slice(0, 16)
  );
  const [result, setResult] = useState<MatchResult>(match?.result ?? "win");
  const [score, setScore] = useState<string | null>(null);
  const [deckVersionId, setDeckVersionId] = useState<string | null>(() => {
    if (isEdit) return match?.deck_version_id ?? null;
    const prefs = loadLastMatchPrefs();
    return prefs.deckVersionId ?? match?.deck_version_id ?? null;
  });
  const [opponentLegendId, setOpponentLegendId] = useState<string | null>(() => {
    if (isEdit) return match?.opponent_legend_id ?? null;
    const prefs = loadLastMatchPrefs();
    return prefs.opponentLegendId ?? match?.opponent_legend_id ?? null;
  });
  const [opponentArchetype, setOpponentArchetype] = useState(
    match?.opponent_archetype ?? ""
  );
  const [eventId, setEventId] = useState<string | null>(match?.event_id ?? null);
  // Valor por defecto: el último set disponible (el más reciente).
  const [setId, setSetId] = useState<string | null>(() => {
    if (isEdit) return match?.event_set_id ?? null;
    const lastSet = options.sets[options.sets.length - 1];
    return lastSet ? lastSet.id : match?.event_set_id ?? null;
  });
  const [roundNumber, setRoundNumber] = useState<string | null>(
    match?.round_number?.toString() ?? null
  );
  const [opponentPlayerLabel, setOpponentPlayerLabel] = useState(
    match?.opponent_player_label ?? ""
  );
  const [formatCode, setFormatCode] = useState(match?.format_code ?? "1v1");
  const [noteContent, setNoteContent] = useState(match?.note_content ?? "");
  const [noteCategory, setNoteCategory] = useState<NoteCategory>(
    match?.note_category ?? "otros"
  );

  // Guardar prefs al cambiar mazo o rival (para recordar la última partida).
  useMemo(() => {
    if (isEdit) return;
    saveLastMatchPrefs({ deckVersionId, opponentLegendId });
  }, [isEdit, deckVersionId, opponentLegendId]);

  const availableScores = SCORE_BY_RESULT[result];

  // Valores parseados del marcador (para inputs ocultos del form).
  const parsedScore = score ? parseScore(score) : null;

  const versionOptions = useMemo(
    () =>
      options.decks.flatMap((deck) =>
        deck.versions.map((version) => ({
          value: version.id,
          label: `${deck.name} · ${version.label}`,
        }))
      ),
    [options.decks]
  );

  const legendOptions = options.legends.map((legend) => ({
    value: legend.id,
    label: legendLabel(legend),
  }));

  const eventOptions = options.events.map((event) => ({
    value: event.id,
    label: event.name,
  }));

  const setOptions = options.sets.map((set) => ({
    value: set.id,
    label: `${set.code} · ${set.name}`,
  }));

  const canGoNext = useCallback((): boolean => {
    switch (step) {
      case "result":
        return !!result && (!availableScores.length || !!score);
      case "deck":
        return !!deckVersionId;
      case "opponent":
        return result === "bye" || result === "void" || !!opponentLegendId;
      case "context":
      case "note":
        return true;
      default:
        return true;
    }
  }, [step, result, availableScores, score, deckVersionId, opponentLegendId]);

  const goNext = useCallback(() => {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1 && canGoNext()) {
      setStep(STEPS[idx + 1].id);
    }
  }, [step, canGoNext]);

  const goPrev = useCallback(() => {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) {
      setStep(STEPS[idx - 1].id);
    }
  }, [step]);

  const isLast = step === "summary";
  const isFirst = step === "result";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {match ? <input type="hidden" name="id" value={match.id} /> : null}

      {/* Inputs ocultos: fuente unica de verdad para el envio del form.
           Siempre estan presentes, independientemente del paso activo, para que
           useActionState los serialice correctamente al hacer submit desde
           cualquier paso (incluido el resumen). */}
      <input type="hidden" name="result" value={result} />
      <input
        type="hidden"
        name="game_wins"
        value={parsedScore ? String(parsedScore.game_wins) : ""}
      />
      <input
        type="hidden"
        name="game_losses"
        value={parsedScore ? String(parsedScore.game_losses) : ""}
      />
      <input
        type="hidden"
        name="game_draws"
        value={
          parsedScore && parsedScore.game_draws != null
            ? String(parsedScore.game_draws)
            : ""
        }
      />
      <input type="hidden" name="played_at" value={playedAt} />
      <input
        type="hidden"
        name="deck_version_id"
        value={deckVersionId ?? ""}
      />
      <input
        type="hidden"
        name="opponent_legend_id"
        value={opponentLegendId ?? ""}
      />
      <input
        type="hidden"
        name="opponent_archetype"
        value={opponentArchetype}
      />
      <input
        type="hidden"
        name="opponent_player_label"
        value={opponentPlayerLabel}
      />
      <input type="hidden" name="event_id" value={eventId ?? ""} />
      <input
        type="hidden"
        name="event_set_id"
        value={setId ?? ""}
      />
      <input type="hidden" name="round_number" value={roundNumber ?? ""} />
      <input type="hidden" name="format_code" value={formatCode} />
      <input type="hidden" name="note_content" value={noteContent} />
      <input type="hidden" name="note_category" value={noteCategory} />

      {/* Barra de progreso */}
      <div className="flex items-center gap-2 mb-2">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-1">
            {idx > 0 && (
              <span className="h-px w-4 bg-muted shrink-0" />
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 rounded-full"
              disabled={idx > STEPS.findIndex((x) => x.id === step)}
              onClick={() => setStep(s.id)}
            >
              {idx + 1}
            </Button>
          </div>
        ))}
      </div>

      {/* Paso: Resultado y marcador */}
      {step === "result" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="col-span-full">
            <Label className="mb-1.5">Resultado</Label>
            <div className="flex flex-wrap gap-2">
              {MATCH_RESULTS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  data-active={result === option.value}
                  className={RESULT_STYLES[option.value]}
                  onClick={() => {
                    setResult(option.value);
                    setScore(null);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {result === "bye" || result === "void" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {result === "bye"
                  ? "Los byes se registran pero se excluyen de todas las estadísticas."
                  : "Las partidas anuladas se excluyen de todas las estadísticas."}
              </p>
            ) : null}
          </div>

          {availableScores.length > 0 ? (
            <div className="col-span-full">
              <Label className="mb-1.5">Marcador (juegos)</Label>
              <div className="flex flex-wrap gap-2">
                {availableScores.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    data-active={score === s}
                    className={
                      score === s
                        ? "bg-primary text-primary-foreground border-primary dark:bg-primary dark:text-primary-foreground dark:border-primary"
                        : "border-input bg-background dark:border-input dark:bg-muted/50"
                    }
                    onClick={() => setScore(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="col-span-full">
            <Label className="mb-1.5">Fecha y hora</Label>
            <Input
              id="played_at"
              type="datetime-local"
              required
              defaultValue={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
            />
          </div>
        </section>
      )}

      {/* Paso: Mazo y version */}
      {step === "deck" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="col-span-full">
            <Label className="mb-1.5">Mazo y versión</Label>
            <SelectField
              id="deck_version_id"
              placeholder="Selecciona mazo y versión"
              value={deckVersionId}
              onValueChange={setDeckVersionId}
              options={versionOptions}
              searchable
            />
          </div>
        </section>
      )}

      {/* Paso: Rival */}
      {step === "opponent" && (
        <section className="grid gap-4 sm:grid-cols-2">
          {result !== "bye" && result !== "void" && (
            <div className="col-span-full">
              <Label className="mb-1.5">Leyenda rival</Label>
              <SelectField
                id="opponent_legend_id"
                placeholder="Escribe para filtrar…"
                value={opponentLegendId}
                onValueChange={setOpponentLegendId}
                options={legendOptions}
                searchable
              />
            </div>
          )}
          <div className="col-span-full">
            <Label className="mb-1.5">Arquetipo rival (opcional)</Label>
            <Input
              id="opponent_archetype"
              placeholder="Ej. Aggro, Control…"
              defaultValue={opponentArchetype}
              onChange={(e) => setOpponentArchetype(e.target.value)}
            />
          </div>
          <div className="col-span-full">
            <Label className="mb-1.5">Rival (etiqueta, opcional)</Label>
            <Input
              id="opponent_player_label"
              placeholder="Nombre o alias"
              defaultValue={opponentPlayerLabel}
              onChange={(e) => setOpponentPlayerLabel(e.target.value)}
            />
          </div>
        </section>
      )}

      {/* Paso: Contexto */}
      {step === "context" && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="col-span-full sm:col-span-2 md:col-span-1">
            <Label className="mb-1.5">Torneo</Label>
            <SelectField
              id="event_id"
              placeholder="Partida suelta"
              emptyLabel="Partida suelta"
              value={eventId}
              onValueChange={setEventId}
              options={eventOptions}
              searchable
            />
          </div>
          <div className="col-span-full sm:col-span-1 md:col-span-1">
            <Label className="mb-1.5">Set</Label>
            <SelectField
              id="event_set_id"
              placeholder="Sin set"
              emptyLabel="Sin set"
              value={setId}
              onValueChange={setSetId}
              options={setOptions}
              searchable
            />
          </div>
          <div className="col-span-full md:col-span-1">
            <Label className="mb-1.5">Ronda</Label>
            <Input
              id="round_number"
              type="number"
              min={1}
              defaultValue={roundNumber ?? ""}
              onChange={(e) => setRoundNumber(e.target.value)}
            />
          </div>
          <div className="col-span-full md:col-span-1">
            <Label className="mb-1.5">Formato</Label>
            <Input
              id="format_code"
              defaultValue={formatCode}
              onChange={(e) => setFormatCode(e.target.value)}
            />
          </div>
        </section>
      )}

      {/* Paso: Nota */}
      {step === "note" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="col-span-full">
            <Label className="mb-1.5">Nota rápida (opcional)</Label>
            <Textarea
              id="note_content"
              rows={3}
              defaultValue={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="¿Qué aprendiste de esta partida?"
            />
          </div>
          <div className="col-span-full">
            <Label className="mb-1.5">Categoría</Label>
            <SelectField
              id="note_category"
              placeholder="Otros"
              emptyLabel="Otros"
              value={noteCategory}
              onValueChange={(value) =>
                setNoteCategory((value as NoteCategory) ?? "otros")
              }
              options={NOTE_CATEGORIES.map((category) => ({
                value: category.value,
                label: category.label,
              }))}
            />
          </div>
        </section>
      )}

      {/* Paso: Resumen */}
      {step === "summary" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="col-span-full">
            <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <span className="text-sm text-muted-foreground">Resultado</span>
              <span className="font-medium">
                {MATCH_RESULTS.find((r) => r.value === result)?.label ?? result}
              </span>
            </div>
            {score && (
              <div className="flex items-center justify-between p-3 rounded-xl border bg-card mt-2">
                <span className="text-sm text-muted-foreground">Marcador</span>
                <span className="font-medium tabular-nums">{score}</span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-card mt-2">
              <span className="text-sm text-muted-foreground">
                Mazo / versión
              </span>
              <span className="font-medium truncate">
                {versionOptions.find((v) => v.value === deckVersionId)?.label ??
                  "Sin seleccionar"}
              </span>
            </div>
            {result !== "bye" && result !== "void" && (
              <div className="flex items-center justify-between p-3 rounded-xl border bg-card mt-2">
                <span className="text-sm text-muted-foreground">Leyenda rival</span>
                <span className="font-medium truncate">
                  {legendOptions.find((l) => l.value === opponentLegendId)?.label ??
                    "Sin identificar"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-card mt-2">
              <span className="text-sm text-muted-foreground">Fecha y hora</span>
              <span className="font-medium">{playedAt}</span>
            </div>
            {noteContent && (
              <div className="col-span-full mt-2">
                <Label className="mb-1">Nota</Label>
                <p className="p-3 rounded-xl border bg-muted/50 text-sm">
                  {noteContent}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {/* Navegacion */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={pending}
            >
              <ArrowLeftIcon className="size-4 mr-1" /> Atrás
            </Button>
          )}
          {isEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep("summary")}
              disabled={pending}
            >
              Ir al resumen
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isLast && canGoNext() && (
            <Button
              type="button"
              size="sm"
              onClick={goNext}
              disabled={pending}
            >
              Siguiente
              <SkipForwardIcon className="size-4 ml-1" />
            </Button>
          )}
          {isLast && (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {isEdit ? "Guardar cambios" : "Registrar partida"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

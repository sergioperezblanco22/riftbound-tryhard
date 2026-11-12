// Variables de entorno y deteccion de configuracion.
// Solo las variables con prefijo NEXT_PUBLIC_ llegan al navegador.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase ha renombrado la "anon key" a "publishable key" en los proyectos
// nuevos. Aceptamos ambos nombres para que la app funcione con cualquiera.
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

// Gemini expone una API compatible con OpenAI, asi que reutilizamos el SDK de
// OpenAI cambiando solo la URL base. Ver:
// https://ai.google.dev/gemini-api/docs/openai
export const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

// Google devuelve 503 UNAVAILABLE ("high demand") con bastante frecuencia en
// los modelos flash recien publicados. Si el modelo principal falla, el coach
// prueba estos en orden. Se puede sobreescribir con GEMINI_FALLBACK_MODELS
// (lista separada por comas).
const GEMINI_FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

export interface CoachConfig {
  provider: "openai" | "gemini";
  apiKey: string;
  /** Modelo preferido (primero de `models`). */
  model: string;
  /** Cadena de modelos a probar en orden: principal + alternativas. */
  models: string[];
  baseURL?: string;
}

function parseModelList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueModels(models: string[]): string[] {
  return [...new Set(models.filter(Boolean))];
}

/**
 * Configuracion del AI Coach segun las claves disponibles.
 * Prioridad: OpenAI si esta definida; si no, Gemini.
 */
export function getCoachConfig(): CoachConfig | null {
  if (OPENAI_API_KEY) {
    const models = uniqueModels([
      OPENAI_MODEL,
      ...parseModelList(process.env.OPENAI_FALLBACK_MODELS),
    ]);
    return {
      provider: "openai",
      apiKey: OPENAI_API_KEY,
      model: models[0],
      models,
    };
  }
  if (GEMINI_API_KEY) {
    const fallbacks = process.env.GEMINI_FALLBACK_MODELS
      ? parseModelList(process.env.GEMINI_FALLBACK_MODELS)
      : GEMINI_FALLBACK_MODELS;
    const models = uniqueModels([GEMINI_MODEL, ...fallbacks]);
    return {
      provider: "gemini",
      apiKey: GEMINI_API_KEY,
      model: models[0],
      models,
      baseURL: GEMINI_OPENAI_BASE_URL,
    };
  }
  return null;
}

/**
 * Cuando Supabase no esta configurado la app funciona en "modo demo" con un
 * conjunto de datos de ejemplo generado localmente. Sirve para desarrollar la
 * interfaz sin credenciales; en cuanto se rellenan las variables de entorno,
 * todas las consultas pasan a ejecutarse contra PostgreSQL.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isCoachConfigured(): boolean {
  return getCoachConfig() !== null;
}

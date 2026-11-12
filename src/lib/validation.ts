import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

const optionalNumber = z
  .union([z.string(), z.number()])
  .transform((value) => (value === "" || value === null ? null : Number(value)))
  .refine((value) => value === null || (!Number.isNaN(value) && value >= 0), {
    message: "Debe ser un número positivo",
  })
  .nullable()
  .optional();

const optionalId = z
  .string()
  .trim()
  .transform((value) => (value === "" || value === "none" ? null : value))
  .nullable()
  .optional();

export const matchResultSchema = z.enum(["win", "loss", "draw", "bye", "void"]);
export const noteCategorySchema = z.enum([
  "mulligan",
  "error_decision",
  "problema_tempo",
  "sideboard",
  "plan_partida",
  "error_ejecucion",
  "otros",
]);

export const matchInputSchema = z.object({
  played_at: z.string().min(1, "La fecha es obligatoria"),
  deck_version_id: z.string().min(1, "Selecciona un mazo y una versión"),
  opponent_legend_id: optionalId,
  opponent_archetype: optionalText,
  opponent_player_label: optionalText,
  result: matchResultSchema,
  game_wins: optionalNumber,
  game_losses: optionalNumber,
  game_draws: optionalNumber,
  event_id: optionalId,
  event_set_id: optionalId,
  round_number: optionalNumber,
  format_code: z.string().trim().default("1v1"),
  note_content: optionalText,
  note_category: noteCategorySchema.optional(),
});

export type MatchInput = z.infer<typeof matchInputSchema>;

export const deckInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: optionalText,
  legend_id: optionalId,
  champion_name: optionalText,
  decklist: optionalText,
});

export type DeckInput = z.infer<typeof deckInputSchema>;

export const deckVersionInputSchema = z.object({
  deck_id: z.string().min(1),
  label: optionalText,
  legend_id: optionalId,
  champion_name: optionalText,
  decklist: optionalText,
  notes: optionalText,
});

export const eventInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  event_type: optionalText,
  format_code: z.string().trim().default("1v1"),
  set_focus_id: optionalId,
  start_date: z.string().min(1, "La fecha de inicio es obligatoria"),
  end_date: optionalText,
  location: optionalText,
  external_url: optionalText,
  notes: optionalText,
});

export type EventInput = z.infer<typeof eventInputSchema>;

export const noteInputSchema = z.object({
  match_id: z.string().min(1),
  category: noteCategorySchema,
  content: z.string().trim().min(1, "La nota no puede estar vacía"),
  tags: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
});

export type NoteInput = z.infer<typeof noteInputSchema>;

/** Convierte un valor de <input type="datetime-local"> a ISO 8601 UTC. */
export function localToIso(value: string): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

/** Formatea una fecha ISO para <input type="datetime-local">. */
export function isoToLocalInput(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

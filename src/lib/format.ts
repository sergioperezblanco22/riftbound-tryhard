import { NOTE_CATEGORIES, type NoteCategory } from "@/lib/db/types";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** El winrate nulo (denominador 0) se muestra siempre como "—", nunca 0%. */
export function formatWinrate(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

export function formatRecord(wins: number, losses: number, draws: number): string {
  return draws > 0 ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateTimeFormatter.format(new Date(iso));
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-ES").format(value);
}

export function formatScore(
  wins: number | null,
  losses: number | null,
  draws: number | null
): string {
  if (wins === null && losses === null) return "—";
  const parts = [wins ?? 0, losses ?? 0];
  if (draws) parts.push(draws);
  return parts.join("-");
}

export function noteCategoryLabel(category: NoteCategory | string): string {
  return NOTE_CATEGORIES.find((c) => c.value === category)?.label ?? "Otros";
}

/**
 * Etiqueta de una leyenda para desplegables y listas. Usa el nombre completo de
 * la carta cuando existe: hay leyendas distintas que comparten nombre corto
 * (por ejemplo los dos "Master Yi"), y en un selector hay que poder distinguirlas.
 */
export function legendLabel(legend: {
  name: string;
  title?: string | null;
}): string {
  return legend.title ?? legend.name;
}

export function resultLabel(result: string): string {
  switch (result) {
    case "win":
      return "Victoria";
    case "loss":
      return "Derrota";
    case "draw":
      return "Empate";
    case "bye":
      return "Bye";
    case "void":
      return "Anulada";
    default:
      return result;
  }
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** Escala de color controlada para la Matchup Matrix. */
export function winrateColor(value: number | null): string {
  if (value === null) return "bg-muted text-muted-foreground";
  if (value >= 65) return "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200";
  if (value >= 55) return "bg-emerald-500/12 text-emerald-900 dark:text-emerald-200";
  if (value >= 45) return "bg-amber-500/12 text-amber-900 dark:text-amber-200";
  if (value >= 35) return "bg-orange-500/15 text-orange-900 dark:text-orange-200";
  return "bg-rose-500/18 text-rose-900 dark:text-rose-200";
}

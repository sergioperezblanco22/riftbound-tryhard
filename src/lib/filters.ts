import type { MatchFilters } from "@/lib/db/types";

export type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Convierte los searchParams de la URL en filtros globales tipados. */
export function parseFilters(params: SearchParams): MatchFilters {
  const from = first(params.from);
  const to = first(params.to);
  return {
    set_id: first(params.set),
    deck_id: first(params.deck),
    deck_version_id: first(params.version),
    event_id: first(params.event),
    opponent_legend_id: first(params.legend),
    from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : null,
    to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null,
  };
}

/** Filtros -> query string (omite valores vacios). */
export function filtersToQuery(filters: MatchFilters): string {
  const params = new URLSearchParams();
  if (filters.set_id) params.set("set", filters.set_id);
  if (filters.deck_id) params.set("deck", filters.deck_id);
  if (filters.deck_version_id) params.set("version", filters.deck_version_id);
  if (filters.event_id) params.set("event", filters.event_id);
  if (filters.opponent_legend_id) params.set("legend", filters.opponent_legend_id);
  if (filters.from) params.set("from", filters.from.slice(0, 10));
  if (filters.to) params.set("to", filters.to.slice(0, 10));
  return params.toString();
}

export function countActiveFilters(filters: MatchFilters): number {
  return Object.values(filters).filter(Boolean).length;
}

import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDemoStore } from "@/lib/demo/store";
import { isSupabaseConfigured } from "@/lib/env";
import {
  deckPerformance,
  legendPerformance,
  matchupMatrix,
  setPerformance,
  summarize,
  versionComparison,
  winrateTrend,
} from "@/lib/stats/compute";
import type {
  DashboardData,
  DeckPerformance,
  DeckRow,
  DeckVersionComparison,
  DeckVersionRow,
  EventRow,
  FilterOptions,
  LegendPerformance,
  LegendRow,
  MatchDetail,
  MatchEnrichedRow,
  MatchFilters,
  MatchNoteRow,
  MatchSideboardChangeRow,
  MatchupCell,
  NoteSearchResult,
  ProfileRow,
  SetRow,
} from "@/lib/db/types";

// =============================================================================
// Capa de acceso a datos. Con Supabase configurado consulta PostgreSQL (RPC y
// vistas con RLS). Sin credenciales, sirve el conjunto de datos de demostracion
// aplicando las mismas reglas estadisticas.
// =============================================================================

export function applyFilters(
  rows: MatchEnrichedRow[],
  filters: MatchFilters
): MatchEnrichedRow[] {
  return rows.filter((row) => {
    if (filters.set_id && row.event_set_id !== filters.set_id) return false;
    if (filters.deck_id && row.deck_id !== filters.deck_id) return false;
    if (filters.deck_version_id && row.deck_version_id !== filters.deck_version_id)
      return false;
    if (filters.event_id && row.event_id !== filters.event_id) return false;
    if (
      filters.opponent_legend_id &&
      row.opponent_legend_id !== filters.opponent_legend_id
    )
      return false;
    if (filters.from && row.played_at < filters.from) return false;
    if (filters.to && row.played_at > filters.to) return false;
    return true;
  });
}

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return getDemoStore().profile;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as ProfileRow;

  return {
    id: user.id,
    username: user.email?.split("@")[0] ?? null,
    display_name: user.email?.split("@")[0] ?? null,
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    const store = getDemoStore();
    return {
      sets: store.sets,
      legends: store.legends,
      decks: store.decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        versions: store.deckVersions
          .filter((v) => v.deck_id === deck.id)
          .map((v) => ({
            id: v.id,
            label: v.label ?? `V${v.version_number}`,
            version_number: v.version_number,
          })),
      })),
      events: store.events.map((event) => ({
        id: event.id,
        name: event.name,
        start_date: event.start_date,
      })),
    };
  }

  const [setsRes, legendsRes, decksRes, versionsRes, eventsRes] = await Promise.all([
    supabase.from("sets").select("*").eq("active", true).order("release_date"),
    supabase.from("legends").select("*").eq("active", true).order("name"),
    supabase.from("decks").select("id,name").order("name"),
    supabase
      .from("deck_versions")
      .select("id,deck_id,label,version_number")
      .order("version_number"),
    supabase
      .from("events")
      .select("id,name,start_date")
      .order("start_date", { ascending: false }),
  ]);

  const versions = (versionsRes.data ?? []) as Pick<
    DeckVersionRow,
    "id" | "deck_id" | "label" | "version_number"
  >[];

  return {
    sets: (setsRes.data ?? []) as SetRow[],
    legends: (legendsRes.data ?? []) as LegendRow[],
    decks: ((decksRes.data ?? []) as Pick<DeckRow, "id" | "name">[]).map((deck) => ({
      id: deck.id,
      name: deck.name,
      versions: versions
        .filter((v) => v.deck_id === deck.id)
        .map((v) => ({
          id: v.id,
          label: v.label ?? `V${v.version_number}`,
          version_number: v.version_number,
        })),
    })),
    events: (eventsRes.data ?? []) as FilterOptions["events"],
  };
}

export async function getSets(): Promise<SetRow[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return getDemoStore().sets;
  const { data } = await supabase.from("sets").select("*").order("release_date");
  return (data ?? []) as SetRow[];
}

export async function getLegends(): Promise<LegendRow[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return getDemoStore().legends;
  const { data } = await supabase.from("legends").select("*").order("name");
  return (data ?? []) as LegendRow[];
}

export async function getMatches(
  filters: MatchFilters = {},
  limit = 200,
  offset = 0
): Promise<MatchEnrichedRow[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return applyFilters(getDemoStore().matches, filters)
      .sort((a, b) => b.played_at.localeCompare(a.played_at))
      .slice(offset, offset + limit);
  }

  const { data } = await supabase.rpc("get_match_history", {
    p_set_id: filters.set_id ?? null,
    p_deck_id: filters.deck_id ?? null,
    p_deck_version_id: filters.deck_version_id ?? null,
    p_event_id: filters.event_id ?? null,
    p_opponent_legend_id: filters.opponent_legend_id ?? null,
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  return (data ?? []) as MatchEnrichedRow[];
}

export async function getDashboardData(
  filters: MatchFilters = {}
): Promise<DashboardData> {
  const rows = await getMatches(filters, 1000);
  const summary = summarize(rows);
  const byLegend = legendPerformance(rows);

  // El mejor/peor matchup solo se destaca con muestra suficiente (regla 5.6).
  const solid = byLegend.filter((entry) => entry.matches >= 5 && entry.winrate !== null);
  const best = solid.length
    ? solid.reduce((a, b) => ((b.winrate ?? 0) > (a.winrate ?? 0) ? b : a))
    : null;
  const worst = solid.length
    ? solid.reduce((a, b) => ((b.winrate ?? 100) < (a.winrate ?? 100) ? b : a))
    : null;

  return {
    summary,
    trend: winrateTrend(rows, "week"),
    by_deck: deckPerformance(rows),
    by_legend: byLegend,
    by_set: setPerformance(rows),
    recent: rows.slice(0, 8),
    best_matchup: best,
    worst_matchup: worst,
  };
}

export async function getMatchDetail(id: string): Promise<MatchDetail | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    const store = getDemoStore();
    const match = store.matches.find((m) => m.id === id);
    if (!match) return null;
    return {
      match,
      games: store.games
        .filter((g) => g.match_id === id)
        .sort((a, b) => a.game_number - b.game_number),
      notes: store.notes
        .filter((n) => n.match_id === id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      sideboard_changes: store.sideboard_changes
        .filter((s) => s.match_id === id)
        .sort((a, b) => a.game_number - b.game_number),
    };
  }

  const { data } = await supabase.rpc("get_match_detail", { p_match_id: id });
  if (!data) return null;

  const { data: sideboardChanges } = await supabase
    .from("match_sideboard_changes")
    .select("*")
    .eq("match_id", id)
    .order("game_number", { ascending: true });

  return {
    ...(data as MatchDetail),
    sideboard_changes: (sideboardChanges ?? []) as MatchSideboardChangeRow[],
  };
}

export interface DeckListItem extends DeckRow {
  versions: DeckVersionRow[];
  stats: DeckPerformance | null;
}

export async function getDeckList(filters: MatchFilters = {}): Promise<DeckListItem[]> {
  const supabase = await createServerSupabaseClient();
  const rows = await getMatches(filters, 1000);
  const stats = new Map(deckPerformance(rows).map((entry) => [entry.deck_id, entry]));

  if (!supabase) {
    const store = getDemoStore();
    return store.decks.map((deck) => ({
      ...deck,
      versions: store.deckVersions.filter((v) => v.deck_id === deck.id),
      stats: stats.get(deck.id) ?? null,
    }));
  }

  const [decksRes, versionsRes] = await Promise.all([
    supabase.from("decks").select("*").order("created_at", { ascending: false }),
    supabase.from("deck_versions").select("*").order("version_number"),
  ]);

  const versions = (versionsRes.data ?? []) as DeckVersionRow[];
  return ((decksRes.data ?? []) as DeckRow[]).map((deck) => ({
    ...deck,
    versions: versions.filter((v) => v.deck_id === deck.id),
    stats: stats.get(deck.id) ?? null,
  }));
}

export interface DeckDetail {
  deck: DeckRow;
  versions: (DeckVersionRow & { legend_name: string | null })[];
  comparison: DeckVersionComparison[];
  summary: ReturnType<typeof summarize>;
  matchup: MatchupCell[];
  matches: MatchEnrichedRow[];
  notes: MatchNoteRow[];
}

export async function getDeckDetail(id: string): Promise<DeckDetail | null> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    const store = getDemoStore();
    const deck = store.decks.find((d) => d.id === id);
    if (!deck) return null;
    const versions = store.deckVersions.filter((v) => v.deck_id === id);
    const matches = store.matches
      .filter((m) => m.deck_id === id)
      .sort((a, b) => b.played_at.localeCompare(a.played_at));
    const matchIds = new Set(matches.map((m) => m.id));
    return {
      deck,
      versions,
      comparison: versionComparison(matches, versions),
      summary: summarize(matches),
      matchup: matchupMatrix(matches),
      matches,
      notes: store.notes
        .filter((n) => matchIds.has(n.match_id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }

  const { data: deck } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!deck) return null;

  const { data: versionsData } = await supabase
    .from("deck_versions")
    .select("*")
    .eq("deck_id", id)
    .order("version_number");
  const versions = (versionsData ?? []) as DeckVersionRow[];

  const legends = await getLegends();
  const legendById = new Map(legends.map((l) => [l.id, l.name]));

  const matches = (await getMatches({ deck_id: id }, 1000)).sort((a, b) =>
    b.played_at.localeCompare(a.played_at)
  );
  const matchIds = matches.map((m) => m.id);

  let notes: MatchNoteRow[] = [];
  if (matchIds.length) {
    const { data: notesData } = await supabase
      .from("match_notes")
      .select("*")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });
    notes = (notesData ?? []) as MatchNoteRow[];
  }

  const versionsWithLegend = versions.map((v) => ({
    ...v,
    legend_name: v.legend_id ? legendById.get(v.legend_id) ?? null : null,
  }));

  return {
    deck: deck as DeckRow,
    versions: versionsWithLegend,
    comparison: versionComparison(matches, versionsWithLegend),
    summary: summarize(matches),
    matchup: matchupMatrix(matches),
    matches,
    notes,
  };
}

export interface MatchupData {
  cells: MatchupCell[];
  decks: { id: string; name: string }[];
  legends: LegendRow[];
}

export async function getMatchupData(filters: MatchFilters = {}): Promise<MatchupData> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    const store = getDemoStore();
    const rows = applyFilters(store.matches, filters);
    const usedDeckIds = new Set(rows.map((r) => r.deck_id).filter(Boolean) as string[]);
    return {
      cells: matchupMatrix(rows),
      decks: store.decks
        .filter((d) => usedDeckIds.has(d.id))
        .map((d) => ({ id: d.id, name: d.name })),
      legends: store.legends,
    };
  }

  const [{ data: cells }, options] = await Promise.all([
    supabase.rpc("get_matchup_matrix", {
      p_set_id: filters.set_id ?? null,
      p_deck_id: filters.deck_id ?? null,
      p_deck_version_id: filters.deck_version_id ?? null,
      p_event_id: filters.event_id ?? null,
      p_from: filters.from ?? null,
      p_to: filters.to ?? null,
      p_min_matches: 0,
    }),
    getFilterOptions(),
  ]);

  const cellList = (cells ?? []) as MatchupCell[];
  const usedDeckIds = new Set(cellList.map((c) => c.deck_id));
  return {
    cells: cellList,
    decks: options.decks
      .filter((d) => usedDeckIds.has(d.id))
      .map((d) => ({ id: d.id, name: d.name })),
    legends: options.legends,
  };
}

export interface EventListItem extends EventRow {
  summary: ReturnType<typeof summarize>;
  matchup: LegendPerformance[];
}

export async function getEventList(): Promise<EventListItem[]> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    const store = getDemoStore();
    return store.events
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""))
      .map((event) => {
        const rows = store.matches.filter((m) => m.event_id === event.id);
        return {
          ...event,
          summary: summarize(rows),
          matchup: legendPerformance(rows),
        };
      });
  }

  const { data } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: false });
  const events = (data ?? []) as EventRow[];

  const results = await Promise.all(
    events.map(async (event) => {
      const rows = await getMatches({ event_id: event.id }, 1000);
      return {
        ...event,
        summary: summarize(rows),
        matchup: legendPerformance(rows),
      };
    })
  );
  return results;
}

export interface EventDetail {
  event: EventRow;
  set: SetRow | null;
  summary: ReturnType<typeof summarize>;
  matchup: LegendPerformance[];
  rounds: MatchEnrichedRow[];
}

export async function getEventDetail(id: string): Promise<EventDetail | null> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    const store = getDemoStore();
    const event = store.events.find((e) => e.id === id);
    if (!event) return null;
    const rounds = store.matches
      .filter((m) => m.event_id === id)
      .sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0));
    return {
      event,
      set: store.sets.find((s) => s.id === event.set_focus_id) ?? null,
      summary: summarize(rounds),
      matchup: legendPerformance(rounds),
      rounds,
    };
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!event) return null;

  const rounds = (await getMatches({ event_id: id }, 500)).sort(
    (a, b) => (a.round_number ?? 0) - (b.round_number ?? 0)
  );
  const sets = await getSets();

  return {
    event: event as EventRow,
    set: sets.find((s) => s.id === (event as EventRow).set_focus_id) ?? null,
    summary: summarize(rounds),
    matchup: legendPerformance(rounds),
    rounds,
  };
}

// -----------------------------------------------------------------------------
// Herramientas del AI Coach
// -----------------------------------------------------------------------------

export async function coachPerformanceSummary(
  filters: MatchFilters
): Promise<{ summary: ReturnType<typeof summarize>; filters: MatchFilters }> {
  const rows = await getMatches(filters, 2000);
  return { summary: summarize(rows), filters };
}

export async function coachMatchupMatrix(
  filters: MatchFilters
): Promise<{ cells: MatchupCell[]; summary: ReturnType<typeof summarize> }> {
  const rows = await getMatches(filters, 2000);
  return { cells: matchupMatrix(rows), summary: summarize(rows) };
}

export async function coachCompareDeckVersions(deckId: string) {
  const detail = await getDeckDetail(deckId);
  if (!detail) return null;
  return {
    deck: { id: detail.deck.id, name: detail.deck.name },
    versions: detail.comparison,
  };
}

export async function coachSearchNotes(params: {
  query?: string | null;
  category?: string | null;
  tags?: string[] | null;
  match_id?: string | null;
  limit?: number;
}): Promise<NoteSearchResult[]> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    const store = getDemoStore();
    const q = params.query?.toLowerCase() ?? null;
    const byId = new Map(store.matches.map((m) => [m.id, m]));
    return store.notes
      .filter((note) => {
        if (params.match_id && note.match_id !== params.match_id) return false;
        if (params.category && note.category !== params.category) return false;
        if (params.tags?.length && !note.tags.some((t) => params.tags!.includes(t)))
          return false;
        if (q && !note.content.toLowerCase().includes(q)) return false;
        return true;
      })
      .slice(0, params.limit ?? 50)
      .map((note) => {
        const match = byId.get(note.match_id);
        return {
          note_id: note.id,
          match_id: note.match_id,
          category: note.category,
          content: note.content,
          tags: note.tags,
          created_at: note.created_at,
          played_at: match?.played_at ?? note.created_at,
          deck_name: match?.deck_name ?? null,
          opponent_legend_name: match?.opponent_legend_name ?? null,
          rank: 0,
        };
      });
  }

  const { data } = await supabase.rpc("search_match_notes", {
    p_query: params.query ?? null,
    p_category: params.category ?? null,
    p_tags: params.tags ?? null,
    p_match_id: params.match_id ?? null,
    p_limit: params.limit ?? 50,
  });
  return (data ?? []) as NoteSearchResult[];
}

export async function getRecentNotes(limit = 10): Promise<NoteSearchResult[]> {
  return coachSearchNotes({ limit });
}

export { isSupabaseConfigured };

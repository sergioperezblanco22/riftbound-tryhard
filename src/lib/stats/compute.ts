import type {
  DeckPerformance,
  DeckVersionComparison,
  LegendPerformance,
  MatchEnrichedRow,
  MatchupCell,
  PerformanceSummary,
  SetPerformance,
  TrendPoint,
} from "@/lib/db/types";

// =============================================================================
// Reglas estadisticas (seccion 5 del documento), implementadas como funciones
// puras sobre filas de matches_enriched. Se usan en modo demo; en produccion
// el calculo vive en PostgreSQL (migracion 0002) con reglas identicas.
// =============================================================================

const COUNTED: ReadonlySet<string> = new Set(["win", "loss", "draw"]);

function isCounted(row: MatchEnrichedRow): boolean {
  return COUNTED.has(row.result);
}

function winrate(wins: number, losses: number): number | null {
  const denom = wins + losses;
  if (denom === 0) return null; // el denominador cero se muestra como "—"
  return Math.round((100 * wins) / denom * 10) / 10;
}

export function summarize(rows: MatchEnrichedRow[]): PerformanceSummary {
  const valid = rows.filter(isCounted);
  const wins = valid.filter((r) => r.result === "win").length;
  const losses = valid.filter((r) => r.result === "loss").length;
  const draws = valid.filter((r) => r.result === "draw").length;

  const gameWins = valid.reduce((acc, r) => acc + (r.game_wins ?? 0), 0);
  const gameLosses = valid.reduce((acc, r) => acc + (r.game_losses ?? 0), 0);
  const gameDraws = valid.reduce((acc, r) => acc + (r.game_draws ?? 0), 0);

  const dates = valid.map((r) => r.played_at).sort();

  return {
    matches: valid.length,
    wins,
    losses,
    draws,
    winrate: winrate(wins, losses),
    game_wins: gameWins,
    game_losses: gameLosses,
    game_draws: gameDraws,
    game_winrate: winrate(gameWins, gameLosses),
    period_from: dates.length ? dates[0] : null,
    period_to: dates.length ? dates[dates.length - 1] : null,
  };
}

export function matchupMatrix(rows: MatchEnrichedRow[], minMatches = 0): MatchupCell[] {
  const groups = new Map<string, MatchEnrichedRow[]>();
  for (const row of rows) {
    if (!isCounted(row)) continue;
    if (!row.opponent_legend_id || !row.deck_version_id || !row.deck_id) continue;
    const key = `${row.deck_version_id}::${row.opponent_legend_id}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const cells: MatchupCell[] = [];
  for (const list of groups.values()) {
    const first = list[0];
    const wins = list.filter((r) => r.result === "win").length;
    const losses = list.filter((r) => r.result === "loss").length;
    const draws = list.filter((r) => r.result === "draw").length;
    if (list.length < minMatches) continue;
    cells.push({
      deck_id: first.deck_id!,
      deck_name: first.deck_name ?? "Sin nombre",
      deck_version_id: first.deck_version_id!,
      version_label: first.version_label,
      version_number: first.version_number ?? 1,
      own_legend_name: first.own_legend_name,
      opponent_legend_id: first.opponent_legend_id!,
      opponent_legend_name: first.opponent_legend_name ?? "Desconocida",
      matches: list.length,
      wins,
      losses,
      draws,
      winrate: winrate(wins, losses),
    });
  }
  return cells;
}

export function deckPerformance(rows: MatchEnrichedRow[]): DeckPerformance[] {
  const groups = new Map<string, MatchEnrichedRow[]>();
  for (const row of rows) {
    if (!isCounted(row) || !row.deck_id) continue;
    const list = groups.get(row.deck_id) ?? [];
    list.push(row);
    groups.set(row.deck_id, list);
  }

  return [...groups.entries()].map(([deckId, list]) => {
    const wins = list.filter((r) => r.result === "win").length;
    const losses = list.filter((r) => r.result === "loss").length;
    const draws = list.filter((r) => r.result === "draw").length;
    const lastPlayed = list.map((r) => r.played_at).sort().at(-1) ?? null;
    const versionCount = new Set(list.map((r) => r.deck_version_id).filter(Boolean)).size;
    return {
      deck_id: deckId,
      deck_name: list[0].deck_name ?? "Sin nombre",
      own_legend_name: list[0].own_legend_name,
      version_count: versionCount,
      matches: list.length,
      wins,
      losses,
      draws,
      winrate: winrate(wins, losses),
      last_played_at: lastPlayed,
    };
  });
}

export function legendPerformance(rows: MatchEnrichedRow[]): LegendPerformance[] {
  const groups = new Map<string, MatchEnrichedRow[]>();
  for (const row of rows) {
    if (!isCounted(row) || !row.opponent_legend_id) continue;
    const list = groups.get(row.opponent_legend_id) ?? [];
    list.push(row);
    groups.set(row.opponent_legend_id, list);
  }

  return [...groups.entries()].map(([legendId, list]) => {
    const wins = list.filter((r) => r.result === "win").length;
    const losses = list.filter((r) => r.result === "loss").length;
    const draws = list.filter((r) => r.result === "draw").length;
    return {
      legend_id: legendId,
      legend_name: list[0].opponent_legend_name ?? "Desconocida",
      matches: list.length,
      wins,
      losses,
      draws,
      winrate: winrate(wins, losses),
    };
  });
}

export function setPerformance(rows: MatchEnrichedRow[]): SetPerformance[] {
  const groups = new Map<string, MatchEnrichedRow[]>();
  for (const row of rows) {
    if (!isCounted(row) || !row.event_set_id) continue;
    const list = groups.get(row.event_set_id) ?? [];
    list.push(row);
    groups.set(row.event_set_id, list);
  }

  return [...groups.entries()].map(([setId, list]) => {
    const wins = list.filter((r) => r.result === "win").length;
    const losses = list.filter((r) => r.result === "loss").length;
    const draws = list.filter((r) => r.result === "draw").length;
    return {
      set_id: setId,
      set_code: list[0].set_code ?? "—",
      set_name: list[0].set_name ?? "Sin set",
      matches: list.length,
      wins,
      losses,
      draws,
      winrate: winrate(wins, losses),
    };
  });
}

export function winrateTrend(rows: MatchEnrichedRow[], bucket: "day" | "week" | "month" = "week"): TrendPoint[] {
  const groups = new Map<string, MatchEnrichedRow[]>();
  for (const row of rows) {
    if (!isCounted(row)) continue;
    const key = bucketKey(row.played_at, bucket);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const wins = list.filter((r) => r.result === "win").length;
      const losses = list.filter((r) => r.result === "loss").length;
      const draws = list.filter((r) => r.result === "draw").length;
      return {
        bucket: key,
        matches: list.length,
        wins,
        losses,
        draws,
        winrate: winrate(wins, losses),
      };
    });
}

export function versionComparison(
  rows: MatchEnrichedRow[],
  versions: { id: string; version_number: number; label: string | null; champion_name: string | null; legend_name: string | null; created_at: string }[]
): DeckVersionComparison[] {
  return versions
    .map((version) => {
      const list = rows.filter((r) => r.deck_version_id === version.id && isCounted(r));
      const wins = list.filter((r) => r.result === "win").length;
      const losses = list.filter((r) => r.result === "loss").length;
      const draws = list.filter((r) => r.result === "draw").length;
      const gameWins = list.reduce((acc, r) => acc + (r.game_wins ?? 0), 0);
      const gameLosses = list.reduce((acc, r) => acc + (r.game_losses ?? 0), 0);
      return {
        deck_version_id: version.id,
        version_number: version.version_number,
        version_label: version.label,
        champion_name: version.champion_name,
        own_legend_name: version.legend_name,
        created_at: version.created_at,
        matches: list.length,
        wins,
        losses,
        draws,
        winrate: winrate(wins, losses),
        game_wins: gameWins,
        game_losses: gameLosses,
        game_winrate: winrate(gameWins, gameLosses),
      };
    })
    .sort((a, b) => a.version_number - b.version_number);
}

function bucketKey(iso: string, bucket: "day" | "week" | "month"): string {
  const d = new Date(iso);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (bucket === "month") {
    return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), 1)).toISOString();
  }
  if (bucket === "week") {
    const day = utc.getUTCDay();
    const diff = (day + 6) % 7; // lunes como inicio de semana
    utc.setUTCDate(utc.getUTCDate() - diff);
    return utc.toISOString();
  }
  return utc.toISOString();
}

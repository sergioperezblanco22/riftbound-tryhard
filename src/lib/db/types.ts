// =============================================================================
// Tipos de dominio. Reflejan EXACTAMENTE las columnas del esquema PostgreSQL
// (snake_case) para que los resultados de las funciones RPC y los datos de
// demostracion sean intercambiables sin capas de mapeo propensas a errores.
// =============================================================================

export type MatchResult = "win" | "loss" | "draw" | "bye" | "void";
export type Outcome = "win" | "loss" | "draw";

export type NoteCategory =
  | "mulligan"
  | "error_decision"
  | "problema_tempo"
  | "sideboard"
  | "plan_partida"
  | "error_ejecucion"
  | "otros";

export const NOTE_CATEGORIES: { value: NoteCategory; label: string }[] = [
  { value: "mulligan", label: "Mulligan" },
  { value: "error_decision", label: "Error de decisión" },
  { value: "problema_tempo", label: "Problema de tempo" },
  { value: "sideboard", label: "Sideboard" },
  { value: "plan_partida", label: "Plan de partida" },
  { value: "error_ejecucion", label: "Error de ejecución" },
  { value: "otros", label: "Otros" },
];

export const MATCH_RESULTS: { value: MatchResult; label: string }[] = [
  { value: "win", label: "Victoria" },
  { value: "loss", label: "Derrota" },
  { value: "draw", label: "Empate" },
  { value: "bye", label: "Bye" },
  { value: "void", label: "Anulada" },
];

// -----------------------------------------------------------------------------
// Filas de tablas
// -----------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetRow {
  id: string;
  code: string;
  name: string;
  release_date: string | null;
  active: boolean;
}

export interface LegendRow {
  id: string;
  code: string;
  /** Nombre corto, para tablas y matrices ("Riven"). */
  name: string;
  /** Nombre completo de la carta ("Riven, The Exile"), si se conoce. */
  title: string | null;
  /** URL de la imagen de la leyenda/carta (opcional). */
  image_url: string | null;
  active: boolean;
}

export interface DeckRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface DeckVersionRow {
  id: string;
  deck_id: string;
  version_number: number;
  label: string | null;
  legend_id: string | null;
  champion_name: string | null;
  decklist: unknown;
  notes: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  user_id: string;
  name: string;
  event_type: string | null;
  format_code: string;
  set_focus_id: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  external_url: string | null;
  notes: string | null;
}

export interface MatchGameRow {
  id: string;
  match_id: string;
  game_number: number;
  result: Outcome;
  went_first: boolean | null;
  battlefield_name: string | null;
  notes: string | null;
}

export interface MatchNoteRow {
  id: string;
  match_id: string;
  user_id: string;
  category: NoteCategory;
  content: string;
  tags: string[];
  created_at: string;
}

export interface MatchSideboardChangeRow {
  id: string;
  match_id: string;
  game_number: number;
  cards_out: string;
  cards_in: string;
  created_at: string;
}

/** Fila de la vista matches_enriched. */
export interface MatchEnrichedRow {
  id: string;
  user_id: string;
  played_at: string;
  result: MatchResult;
  format_code: string;
  event_id: string | null;
  event_set_id: string | null;
  round_number: number | null;
  opponent_legend_id: string | null;
  opponent_archetype: string | null;
  opponent_player_label: string | null;
  game_wins: number | null;
  game_losses: number | null;
  game_draws: number | null;
  result_source: string;
  created_at: string;
  updated_at: string;
  deck_version_id: string | null;
  version_number: number | null;
  version_label: string | null;
  champion_name: string | null;
  deck_id: string | null;
  deck_name: string | null;
  own_legend_id: string | null;
  own_legend_name: string | null;
  event_name: string | null;
  set_id: string | null;
  set_code: string | null;
  set_name: string | null;
  opponent_legend_code: string | null;
  opponent_legend_name: string | null;
  note_count: number;
  /** Contenido de la nota más reciente (si la hay). */
  note_content: string | null;
  /** Categoría de la nota más reciente (si la hay). */
  note_category: NoteCategory | null;
}

// -----------------------------------------------------------------------------
// Filtros globales
// -----------------------------------------------------------------------------

export interface MatchFilters {
  set_id?: string | null;
  deck_id?: string | null;
  deck_version_id?: string | null;
  event_id?: string | null;
  opponent_legend_id?: string | null;
  from?: string | null;
  to?: string | null;
}

// -----------------------------------------------------------------------------
// Resultados estadisticos (mismos nombres que las funciones SQL)
// -----------------------------------------------------------------------------

export interface PerformanceSummary {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
  game_wins: number;
  game_losses: number;
  game_draws: number;
  game_winrate: number | null;
  period_from: string | null;
  period_to: string | null;
}

export interface MatchupCell {
  deck_id: string;
  deck_name: string;
  deck_version_id: string;
  version_label: string | null;
  version_number: number;
  own_legend_name: string | null;
  opponent_legend_id: string;
  opponent_legend_name: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
}

export interface DeckPerformance {
  deck_id: string;
  deck_name: string;
  own_legend_name: string | null;
  version_count: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
  last_played_at: string | null;
}

export interface LegendPerformance {
  legend_id: string;
  legend_name: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
}

export interface SetPerformance {
  set_id: string;
  set_code: string;
  set_name: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
}

export interface TrendPoint {
  bucket: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
}

export interface DeckVersionComparison {
  deck_version_id: string;
  version_number: number;
  version_label: string | null;
  champion_name: string | null;
  own_legend_name: string | null;
  created_at: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
  game_wins: number;
  game_losses: number;
  game_winrate: number | null;
}

export interface NoteSearchResult {
  note_id: string;
  match_id: string;
  category: NoteCategory;
  content: string;
  tags: string[];
  created_at: string;
  played_at: string;
  deck_name: string | null;
  opponent_legend_name: string | null;
  rank: number;
}

export interface MatchDetail {
  match: MatchEnrichedRow;
  games: MatchGameRow[];
  notes: MatchNoteRow[];
  sideboard_changes: MatchSideboardChangeRow[];
}

export interface MatchupSideboardNoteRow {
  id: string;
  user_id: string;
  my_legend_id: string;
  rival_legend_id: string;
  title: string;
  my_key_cards: string | null;
  rival_key_cards: string | null;
  my_cards_out: string | null;
  my_cards_in: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Datos agregados para pantallas
// -----------------------------------------------------------------------------

export interface FilterOptions {
  sets: SetRow[];
  legends: LegendRow[];
  decks: { id: string; name: string; versions: { id: string; label: string; version_number: number }[] }[];
  events: { id: string; name: string; start_date: string | null }[];
}

export interface DashboardData {
  summary: PerformanceSummary;
  trend: TrendPoint[];
  by_deck: DeckPerformance[];
  by_legend: LegendPerformance[];
  by_set: SetPerformance[];
  recent: MatchEnrichedRow[];
  best_matchup: LegendPerformance | null;
  worst_matchup: LegendPerformance | null;
}

/** Minimo de partidas para considerar un matchup como evidencia solida (5.6). */
export const MIN_SAMPLE_SIZE = 3;

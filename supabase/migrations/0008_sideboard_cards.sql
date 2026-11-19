-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0008
-- Sideboard cards: cartas que se quitan y se añaden por matchup
-- =============================================================================
-- Agrega columnas para registrar las cartas clave que se sacan y se meten
-- en el sideboard de cada matchup teorico.
-- =============================================================================

alter table public.matchup_sideboard_notes
  add column if not exists my_cards_out text;

alter table public.matchup_sideboard_notes
  add column if not exists my_cards_in text;

-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0007
-- Matchup sideboard notes: notas teoricas de sideboard por matchup
-- =============================================================================
-- Tabla para guardar notas teoricas de sideboard entre dos leyendas.
-- Son apuntes del jugador sobre cartas clave, plan de juego y cosas a tener
-- en cuenta en cada matchup (mi leyenda vs leyenda rival).
-- =============================================================================

create table if not exists public.matchup_sideboard_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  my_legend_id   uuid not null references public.legends (id) on delete cascade,
  rival_legend_id uuid not null references public.legends (id) on delete cascade,
  title          text not null,
  my_key_cards   text,      -- Cartas clave tuyas para este matchup
  rival_key_cards text,     -- Cartas clave del rival a vigilar
  notes          text,      -- Anotaciones generales y cosas a tener en cuenta
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, my_legend_id, rival_legend_id)
);

create index if not exists idx_matchup_sideboard_notes_user on public.matchup_sideboard_notes (user_id);
create index if not exists idx_matchup_sideboard_notes_my on public.matchup_sideboard_notes (my_legend_id);
create index if not exists idx_matchup_sideboard_notes_rival on public.matchup_sideboard_notes (rival_legend_id);

-- RLS: un usuario solo ve/edita sus propias notas de matchup
alter table public.matchup_sideboard_notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'matchup_sideboard_notes'
      and policyname = 'matchup_sideboard_notes_own'
  ) then
    create policy matchup_sideboard_notes_own on public.matchup_sideboard_notes
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

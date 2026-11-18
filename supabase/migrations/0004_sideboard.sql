-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0004
-- Sideboard tracker: cambios de cartas entre juegos de una misma partida
-- =============================================================================
-- Permite registrar qué cartas salen y entran tras cada juego, para analizar
-- decisiones de sideboard y ver qué cambios funcionan mejor.
-- =============================================================================

create table if not exists public.match_sideboard_changes (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  game_number integer not null check (game_number >= 1 and game_number <= 3),
  cards_out   text not null,
  cards_in    text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_match_sideboard_changes_match on public.match_sideboard_changes (match_id, game_number);

-- RLS: un usuario solo puede ver/escribir cambios de sus propias partidas
alter table public.match_sideboard_changes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'match_sideboard_changes' 
      and policyname = 'match_sideboard_changes_own'
  ) then
    create policy match_sideboard_changes_own on public.match_sideboard_changes
      for all
      using (
        exists (
          select 1 from public.matches m
          where m.id = match_sideboard_changes.match_id
            and m.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.matches m
          where m.id = match_sideboard_changes.match_id
            and m.user_id = auth.uid()
        )
      );
  end if;
end $$;

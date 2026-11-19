-- ===========================================================================
-- Riftbound Competitive Tracker - esquema completo
--
-- ARCHIVO GENERADO: no lo edites a mano. Se construye con `npm run db:setup`
-- a partir de las migraciones de `supabase/migrations/`.
--
-- Como usarlo: Supabase Dashboard -> SQL Editor -> New query -> pega TODO
-- este contenido -> Run. Es equivalente a ejecutar en orden:
--   0001_init.sql
--   0002_stats.sql
--   0003_seed.sql
--   0004_sideboard.sql
--   0005_legend_images.sql
--   0006_populate_legend_images.sql
--   0007_matchup_sideboard_notes.sql
-- ===========================================================================

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0001_init.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- Riftbound Competitive Tracker - Esquema inicial (MVP)
-- Migracion 0001: tablas, indices y Row Level Security
-- =============================================================================
-- Todas las entidades personales tienen id UUID y referencia al propietario.
-- Los catalogos globales (sets, legends) son de solo lectura para los usuarios.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- Mantiene updated_at al dia en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6.1 profiles
-- -----------------------------------------------------------------------------
-- El id coincide con el usuario autenticado de Supabase (auth.users).
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automaticamente al registrarse un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 6.2 sets (catalogo global de expansiones)
-- -----------------------------------------------------------------------------
create table if not exists public.sets (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  release_date date,
  active       boolean not null default true
);

-- -----------------------------------------------------------------------------
-- 6.3 legends (catalogo de leyendas)
-- -----------------------------------------------------------------------------
create table if not exists public.legends (
  id     uuid primary key default gen_random_uuid(),
  code   text not null unique,
  -- Nombre corto, el que se usa en tablas y matrices ("Riven").
  name   text not null,
  -- Nombre completo de la carta ("Riven, The Exile"). Puede haber leyendas
  -- distintas con el mismo `name` (dos "Master Yi"), asi que el titulo es lo que
  -- permite distinguirlas en un selector.
  title  text,
  active boolean not null default true
);

-- Por si el esquema se aplico antes de existir `title`.
alter table public.legends add column if not exists title text;

-- -----------------------------------------------------------------------------
-- 6.4 decks (mazo logico del jugador)
-- -----------------------------------------------------------------------------
create table if not exists public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_decks_user on public.decks (user_id, name);

-- -----------------------------------------------------------------------------
-- 6.5 deck_versions (snapshots historicos)
-- -----------------------------------------------------------------------------
create table if not exists public.deck_versions (
  id             uuid primary key default gen_random_uuid(),
  deck_id        uuid not null references public.decks (id) on delete cascade,
  version_number integer not null,
  label          text,
  legend_id      uuid references public.legends (id),
  champion_name  text,
  decklist       jsonb,
  notes          text,
  created_at     timestamptz not null default now(),
  constraint deck_versions_unique_number unique (deck_id, version_number),
  constraint deck_versions_positive_number check (version_number > 0)
);

-- Una version usada en partidas no se sobrescribe: los cambios generan nuevas
-- versiones. La unicidad de (deck_id, version_number) lo garantiza.

-- -----------------------------------------------------------------------------
-- 6.6 events
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  event_type   text,
  format_code  text not null default '1v1',
  set_focus_id uuid references public.sets (id),
  start_date   timestamptz,
  end_date     timestamptz,
  location     text,
  external_url text,
  notes        text
);

create index if not exists idx_events_user_date on public.events (user_id, start_date desc);

-- -----------------------------------------------------------------------------
-- 6.7 matches (tabla central)
-- -----------------------------------------------------------------------------
create table if not exists public.matches (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  event_id              uuid references public.events (id) on delete set null,
  deck_version_id       uuid references public.deck_versions (id) on delete set null,
  played_at             timestamptz not null default now(),
  round_number          integer,
  event_set_id          uuid references public.sets (id),
  opponent_legend_id    uuid references public.legends (id),
  opponent_archetype    text,
  opponent_player_label text,
  format_code           text not null default '1v1',
  result                text not null,
  game_wins             integer,
  game_losses           integer,
  game_draws            integer,
  result_source         text not null default 'manual',
  confirmed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint matches_result_check check (result in ('win', 'loss', 'draw', 'bye', 'void')),
  constraint matches_games_non_negative check (
    coalesce(game_wins, 0) >= 0
    and coalesce(game_losses, 0) >= 0
    and coalesce(game_draws, 0) >= 0
  )
);

drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6.8 match_games (registro opcional de cada juego)
-- -----------------------------------------------------------------------------
create table if not exists public.match_games (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid not null references public.matches (id) on delete cascade,
  game_number      integer not null,
  result           text not null,
  went_first       boolean,
  battlefield_name text,
  notes            text,
  constraint match_games_result_check check (result in ('win', 'loss', 'draw')),
  constraint match_games_unique_number unique (match_id, game_number)
);

-- -----------------------------------------------------------------------------
-- 6.9 match_notes
-- -----------------------------------------------------------------------------
create table if not exists public.match_notes (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  category   text not null default 'otros',
  content    text not null,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint match_notes_category_check check (
    category in (
      'mulligan',
      'error_decision',
      'problema_tempo',
      'sideboard',
      'plan_partida',
      'error_ejecucion',
      'otros'
    )
  ),
  -- Columna generada para busqueda full text (sin base vectorial en el MVP).
  content_tsv tsvector generated always as (to_tsvector('spanish', coalesce(content, ''))) stored
);

-- -----------------------------------------------------------------------------
-- 6.11 Indices recomendados
-- -----------------------------------------------------------------------------
create index if not exists idx_matches_user_played
  on public.matches (user_id, played_at desc);
create index if not exists idx_matches_user_version_played
  on public.matches (user_id, deck_version_id, played_at);
create index if not exists idx_matches_user_set_legend
  on public.matches (user_id, event_set_id, opponent_legend_id);
create index if not exists idx_matches_user_event_round
  on public.matches (user_id, event_id, round_number);
create index if not exists idx_deck_versions_deck_number
  on public.deck_versions (deck_id, version_number);
create index if not exists idx_match_games_match_number
  on public.match_games (match_id, game_number);
create index if not exists idx_match_notes_user_match
  on public.match_notes (user_id, match_id);
create index if not exists idx_match_notes_tsv
  on public.match_notes using gin (content_tsv);
create index if not exists idx_match_notes_tags
  on public.match_notes using gin (tags);

-- -----------------------------------------------------------------------------
-- 6.12 Seguridad - Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.sets          enable row level security;
alter table public.legends       enable row level security;
alter table public.decks         enable row level security;
alter table public.deck_versions enable row level security;
alter table public.events        enable row level security;
alter table public.matches       enable row level security;
alter table public.match_games   enable row level security;
alter table public.match_notes   enable row level security;

-- profiles: cada usuario solo ve y edita el suyo.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- sets / legends: catalogos globales de solo lectura.
drop policy if exists sets_read_all on public.sets;
create policy sets_read_all on public.sets
  for select using (true);
drop policy if exists legends_read_all on public.legends;
create policy legends_read_all on public.legends
  for select using (true);

-- decks
drop policy if exists decks_own on public.decks;
create policy decks_own on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- deck_versions: propiedad a traves de su mazo.
drop policy if exists deck_versions_own on public.deck_versions;
create policy deck_versions_own on public.deck_versions
  for all
  using (exists (
    select 1 from public.decks d
    where d.id = deck_versions.deck_id and d.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.decks d
    where d.id = deck_versions.deck_id and d.user_id = auth.uid()
  ));

-- events
drop policy if exists events_own on public.events;
create policy events_own on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- matches
drop policy if exists matches_own on public.matches;
create policy matches_own on public.matches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- match_games: propiedad a traves de la partida.
drop policy if exists match_games_own on public.match_games;
create policy match_games_own on public.match_games
  for all
  using (exists (
    select 1 from public.matches m
    where m.id = match_games.match_id and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.matches m
    where m.id = match_games.match_id and m.user_id = auth.uid()
  ));

-- match_notes: propiedad del usuario y de la partida.
drop policy if exists match_notes_own on public.match_notes;
create policy match_notes_own on public.match_notes
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_notes.match_id and m.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_notes.match_id and m.user_id = auth.uid()
    )
  );

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0002_stats.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0002
-- Vistas y funciones de estadisticas (fuente de verdad unica)
-- =============================================================================
-- Reglas implementadas (seccion 5 del documento):
--   WR = victorias / (victorias + derrotas) * 100  (empates fuera del denominador)
--   Si el denominador es 0 -> NULL (la UI muestra "—", nunca 0%).
--   Se excluyen byes y registros anulados ('bye', 'void').
--   Los matchups excluyen partidas sin leyenda rival identificada.
--   Los filtros se aplican ANTES de calcular porcentajes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Vista denormalizada de partidas. security_invoker => aplica la RLS del usuario.
-- -----------------------------------------------------------------------------
create or replace view public.matches_enriched
with (security_invoker = true) as
select
  m.id,
  m.user_id,
  m.played_at,
  m.result,
  m.format_code,
  m.event_id,
  m.event_set_id,
  m.round_number,
  m.opponent_legend_id,
  m.opponent_archetype,
  m.opponent_player_label,
  m.game_wins,
  m.game_losses,
  m.game_draws,
  m.result_source,
  m.created_at,
  m.updated_at,
  dv.id            as deck_version_id,
  dv.version_number,
  dv.label         as version_label,
  dv.champion_name,
  dv.deck_id,
  d.name           as deck_name,
  dv.legend_id     as own_legend_id,
  ol.name          as own_legend_name,
  ev.name          as event_name,
  s.id             as set_id,
  s.code           as set_code,
  s.name           as set_name,
  rl.code          as opponent_legend_code,
  rl.name          as opponent_legend_name,
  (select count(*) from public.match_notes n where n.match_id = m.id) as note_count,
  (select n.content from public.match_notes n where n.match_id = m.id order by n.created_at desc limit 1) as note_content,
  (select n.category from public.match_notes n where n.match_id = m.id order by n.created_at desc limit 1) as note_category
from public.matches m
left join public.deck_versions dv on dv.id = m.deck_version_id
left join public.decks d          on d.id = dv.deck_id
left join public.legends ol       on ol.id = dv.legend_id
left join public.events ev        on ev.id = m.event_id
left join public.sets s           on s.id = m.event_set_id
left join public.legends rl       on rl.id = m.opponent_legend_id;

-- -----------------------------------------------------------------------------
-- 8.1 get_performance_summary
-- -----------------------------------------------------------------------------
create or replace function public.get_performance_summary(
  p_set_id uuid default null,
  p_deck_id uuid default null,
  p_deck_version_id uuid default null,
  p_event_id uuid default null,
  p_opponent_legend_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  matches bigint,
  wins bigint,
  losses bigint,
  draws bigint,
  winrate numeric,
  game_wins bigint,
  game_losses bigint,
  game_draws bigint,
  game_winrate numeric,
  period_from timestamptz,
  period_to timestamptz
)
language sql
stable
as $$
  with base as (
    select *
    from public.matches_enriched
    where result in ('win', 'loss', 'draw')
      and (p_set_id is null or event_set_id = p_set_id)
      and (p_deck_id is null or deck_id = p_deck_id)
      and (p_deck_version_id is null or deck_version_id = p_deck_version_id)
      and (p_event_id is null or event_id = p_event_id)
      and (p_opponent_legend_id is null or opponent_legend_id = p_opponent_legend_id)
      and (p_from is null or played_at >= p_from)
      and (p_to is null or played_at <= p_to)
  )
  select
    count(*)::bigint,
    count(*) filter (where result = 'win')::bigint,
    count(*) filter (where result = 'loss')::bigint,
    count(*) filter (where result = 'draw')::bigint,
    case
      when count(*) filter (where result in ('win', 'loss')) = 0 then null
      else round(
        100.0 * count(*) filter (where result = 'win')
        / count(*) filter (where result in ('win', 'loss')),
        1
      )
    end,
    coalesce(sum(game_wins), 0)::bigint,
    coalesce(sum(game_losses), 0)::bigint,
    coalesce(sum(game_draws), 0)::bigint,
    case
      when coalesce(sum(game_wins), 0) + coalesce(sum(game_losses), 0) = 0 then null
      else round(
        100.0 * coalesce(sum(game_wins), 0)
        / (coalesce(sum(game_wins), 0) + coalesce(sum(game_losses), 0)),
        1
      )
    end,
    min(played_at),
    max(played_at)
  from base;
$$;

-- -----------------------------------------------------------------------------
-- 8.1 get_matchup_matrix
-- Filas: version propia. Columnas: leyenda rival.
-- -----------------------------------------------------------------------------
create or replace function public.get_matchup_matrix(
  p_set_id uuid default null,
  p_deck_id uuid default null,
  p_deck_version_id uuid default null,
  p_event_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_min_matches integer default 0
)
returns table (
  deck_id uuid,
  deck_name text,
  deck_version_id uuid,
  version_label text,
  version_number integer,
  own_legend_name text,
  opponent_legend_id uuid,
  opponent_legend_name text,
  matches bigint,
  wins bigint,
  losses bigint,
  draws bigint,
  winrate numeric
)
language sql
stable
as $$
  select
    deck_id,
    deck_name,
    deck_version_id,
    version_label,
    version_number,
    own_legend_name,
    opponent_legend_id,
    opponent_legend_name,
    count(*)::bigint as matches,
    count(*) filter (where result = 'win')::bigint as wins,
    count(*) filter (where result = 'loss')::bigint as losses,
    count(*) filter (where result = 'draw')::bigint as draws,
    case
      when count(*) filter (where result in ('win', 'loss')) = 0 then null
      else round(
        100.0 * count(*) filter (where result = 'win')
        / count(*) filter (where result in ('win', 'loss')),
        1
      )
    end as winrate
  from public.matches_enriched
  where result in ('win', 'loss', 'draw')
    and opponent_legend_id is not null
    and deck_version_id is not null
    and (p_set_id is null or event_set_id = p_set_id)
    and (p_deck_id is null or deck_id = p_deck_id)
    and (p_deck_version_id is null or deck_version_id = p_deck_version_id)
    and (p_event_id is null or event_id = p_event_id)
    and (p_from is null or played_at >= p_from)
    and (p_to is null or played_at <= p_to)
  group by
    deck_id, deck_name, deck_version_id, version_label, version_number,
    own_legend_name, opponent_legend_id, opponent_legend_name
  having count(*) >= greatest(coalesce(p_min_matches, 0), 0);
$$;

-- -----------------------------------------------------------------------------
-- Rendimiento por mazo
-- -----------------------------------------------------------------------------
create or replace function public.get_deck_performance(
  p_set_id uuid default null,
  p_event_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  deck_id uuid,
  deck_name text,
  own_legend_name text,
  version_count bigint,
  matches bigint,
  wins bigint,
  losses bigint,
  draws bigint,
  winrate numeric,
  last_played_at timestamptz
)
language sql
stable
as $$
  select
    e.deck_id,
    e.deck_name,
    min(e.own_legend_name) as own_legend_name,
    (select count(*) from public.deck_versions dv where dv.deck_id = e.deck_id)::bigint as version_count,
    count(*)::bigint as matches,
    count(*) filter (where e.result = 'win')::bigint as wins,
    count(*) filter (where e.result = 'loss')::bigint as losses,
    count(*) filter (where e.result = 'draw')::bigint as draws,
    case
      when count(*) filter (where e.result in ('win', 'loss')) = 0 then null
      else round(
        100.0 * count(*) filter (where e.result = 'win')
        / count(*) filter (where e.result in ('win', 'loss')),
        1
      )
    end as winrate,
    max(e.played_at) as last_played_at
  from public.matches_enriched e
  where e.result in ('win', 'loss', 'draw')
    and e.deck_id is not null
    and (p_set_id is null or e.event_set_id = p_set_id)
    and (p_event_id is null or e.event_id = p_event_id)
    and (p_from is null or e.played_at >= p_from)
    and (p_to is null or e.played_at <= p_to)
  group by e.deck_id, e.deck_name;
$$;

-- -----------------------------------------------------------------------------
-- Rendimiento por leyenda rival
-- -----------------------------------------------------------------------------
create or replace function public.get_legend_performance(
  p_set_id uuid default null,
  p_deck_id uuid default null,
  p_deck_version_id uuid default null,
  p_event_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  legend_id uuid,
  legend_name text,
  matches bigint,
  wins bigint,
  losses bigint,
  draws bigint,
  winrate numeric
)
language sql
stable
as $$
  select
    opponent_legend_id as legend_id,
    opponent_legend_name as legend_name,
    count(*)::bigint as matches,
    count(*) filter (where result = 'win')::bigint as wins,
    count(*) filter (where result = 'loss')::bigint as losses,
    count(*) filter (where result = 'draw')::bigint as draws,
    case
      when count(*) filter (where result in ('win', 'loss')) = 0 then null
      else round(
        100.0 * count(*) filter (where result = 'win')
        / count(*) filter (where result in ('win', 'loss')),
        1
      )
    end as winrate
  from public.matches_enriched
  where result in ('win', 'loss', 'draw')
    and opponent_legend_id is not null
    and (p_set_id is null or event_set_id = p_set_id)
    and (p_deck_id is null or deck_id = p_deck_id)
    and (p_deck_version_id is null or deck_version_id = p_deck_version_id)
    and (p_event_id is null or event_id = p_event_id)
    and (p_from is null or played_at >= p_from)
    and (p_to is null or played_at <= p_to)
  group by opponent_legend_id, opponent_legend_name;
$$;

-- -----------------------------------------------------------------------------
-- Rendimiento por set
-- -----------------------------------------------------------------------------
create or replace function public.get_set_performance(
  p_deck_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  set_id uuid,
  set_code text,
  set_name text,
  matches bigint,
  wins bigint,
  losses bigint,
  draws bigint,
  winrate numeric
)
language sql
stable
as $$
  select
    event_set_id as set_id,
    set_code,
    set_name,
    count(*)::bigint as matches,
    count(*) filter (where result = 'win')::bigint as wins,
    count(*) filter (where result = 'loss')::bigint as losses,
    count(*) filter (where result = 'draw')::bigint as draws,
    case
      when count(*) filter (where result in ('win', 'loss')) = 0 then null
      else round(
        100.0 * count(*) filter (where result = 'win')
        / count(*) filter (where result in ('win', 'loss')),
        1
      )
    end as winrate
  from public.matches_enriched
  where result in ('win', 'loss', 'draw')
    and event_set_id is not null
    and (p_deck_id is null or deck_id = p_deck_id)
    and (p_from is null or played_at >= p_from)
    and (p_to is null or played_at <= p_to)
  group by event_set_id, set_code, set_name;
$$;

-- -----------------------------------------------------------------------------
-- Evolucion del winrate por periodo (bucket: day | week | month)
-- -----------------------------------------------------------------------------
create or replace function public.get_winrate_trend(
  p_bucket text default 'week',
  p_set_id uuid default null,
  p_deck_id uuid default null,
  p_deck_version_id uuid default null,
  p_event_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  bucket timestamptz,
  matches bigint,
  wins bigint,
  losses bigint,
  draws bigint,
  winrate numeric
)
language sql
stable
as $$
  select
    date_trunc(case when p_bucket in ('day', 'week', 'month') then p_bucket else 'week' end, played_at) as bucket,
    count(*)::bigint as matches,
    count(*) filter (where result = 'win')::bigint as wins,
    count(*) filter (where result = 'loss')::bigint as losses,
    count(*) filter (where result = 'draw')::bigint as draws,
    case
      when count(*) filter (where result in ('win', 'loss')) = 0 then null
      else round(
        100.0 * count(*) filter (where result = 'win')
        / count(*) filter (where result in ('win', 'loss')),
        1
      )
    end as winrate
  from public.matches_enriched
  where result in ('win', 'loss', 'draw')
    and (p_set_id is null or event_set_id = p_set_id)
    and (p_deck_id is null or deck_id = p_deck_id)
    and (p_deck_version_id is null or deck_version_id = p_deck_version_id)
    and (p_event_id is null or event_id = p_event_id)
    and (p_from is null or played_at >= p_from)
    and (p_to is null or played_at <= p_to)
  group by 1
  order by 1;
$$;

-- -----------------------------------------------------------------------------
-- 8.1 get_match_history
-- -----------------------------------------------------------------------------
create or replace function public.get_match_history(
  p_set_id uuid default null,
  p_deck_id uuid default null,
  p_deck_version_id uuid default null,
  p_event_id uuid default null,
  p_opponent_legend_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns setof public.matches_enriched
language sql
stable
as $$
  select *
  from public.matches_enriched
  where (p_set_id is null or event_set_id = p_set_id)
    and (p_deck_id is null or deck_id = p_deck_id)
    and (p_deck_version_id is null or deck_version_id = p_deck_version_id)
    and (p_event_id is null or event_id = p_event_id)
    and (p_opponent_legend_id is null or opponent_legend_id = p_opponent_legend_id)
    and (p_from is null or played_at >= p_from)
    and (p_to is null or played_at <= p_to)
  order by played_at desc
  limit greatest(coalesce(p_limit, 100), 0)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- -----------------------------------------------------------------------------
-- 8.1 compare_deck_versions
-- -----------------------------------------------------------------------------
create or replace function public.compare_deck_versions(p_deck_id uuid)
returns table (
  deck_version_id uuid,
  version_number integer,
  version_label text,
  champion_name text,
  own_legend_name text,
  created_at timestamptz,
  matches bigint,
  wins bigint,
  losses bigint,
  draws bigint,
  winrate numeric,
  game_wins bigint,
  game_losses bigint,
  game_winrate numeric
)
language sql
stable
as $$
  select
    dv.id,
    dv.version_number,
    dv.label,
    dv.champion_name,
    ol.name,
    dv.created_at,
    count(m.id) filter (where m.result in ('win', 'loss', 'draw'))::bigint,
    count(m.id) filter (where m.result = 'win')::bigint,
    count(m.id) filter (where m.result = 'loss')::bigint,
    count(m.id) filter (where m.result = 'draw')::bigint,
    case
      when count(m.id) filter (where m.result in ('win', 'loss')) = 0 then null
      else round(
        100.0 * count(m.id) filter (where m.result = 'win')
        / count(m.id) filter (where m.result in ('win', 'loss')),
        1
      )
    end,
    coalesce(sum(m.game_wins) filter (where m.result in ('win', 'loss', 'draw')), 0)::bigint,
    coalesce(sum(m.game_losses) filter (where m.result in ('win', 'loss', 'draw')), 0)::bigint,
    case
      when coalesce(sum(m.game_wins) filter (where m.result in ('win', 'loss', 'draw')), 0)
         + coalesce(sum(m.game_losses) filter (where m.result in ('win', 'loss', 'draw')), 0) = 0 then null
      else round(
        100.0 * coalesce(sum(m.game_wins) filter (where m.result in ('win', 'loss', 'draw')), 0)
        / (coalesce(sum(m.game_wins) filter (where m.result in ('win', 'loss', 'draw')), 0)
           + coalesce(sum(m.game_losses) filter (where m.result in ('win', 'loss', 'draw')), 0)),
        1
      )
    end
  from public.deck_versions dv
  left join public.legends ol on ol.id = dv.legend_id
  left join public.matches m on m.deck_version_id = dv.id
  where dv.deck_id = p_deck_id
  group by dv.id, dv.version_number, dv.label, dv.champion_name, ol.name, dv.created_at
  order by dv.version_number;
$$;

-- -----------------------------------------------------------------------------
-- 8.1 search_match_notes (PostgreSQL Full Text Search)
-- -----------------------------------------------------------------------------
create or replace function public.search_match_notes(
  p_query text default null,
  p_category text default null,
  p_tags text[] default null,
  p_match_id uuid default null,
  p_limit integer default 50
)
returns table (
  note_id uuid,
  match_id uuid,
  category text,
  content text,
  tags text[],
  created_at timestamptz,
  played_at timestamptz,
  deck_name text,
  opponent_legend_name text,
  rank real
)
language sql
stable
as $$
  select
    n.id,
    n.match_id,
    n.category,
    n.content,
    n.tags,
    n.created_at,
    e.played_at,
    e.deck_name,
    e.opponent_legend_name,
    case
      when p_query is null or btrim(p_query) = '' then 0
      else ts_rank(n.content_tsv, websearch_to_tsquery('spanish', p_query))
    end as rank
  from public.match_notes n
  join public.matches_enriched e on e.id = n.match_id
  where (p_match_id is null or n.match_id = p_match_id)
    and (p_category is null or n.category = p_category)
    and (p_tags is null or n.tags && p_tags)
    and (
      p_query is null
      or btrim(p_query) = ''
      or n.content_tsv @@ websearch_to_tsquery('spanish', p_query)
      or n.content ilike '%' || p_query || '%'
    )
  order by rank desc, n.created_at desc
  limit greatest(coalesce(p_limit, 50), 0);
$$;

-- -----------------------------------------------------------------------------
-- 8.1 get_match_detail
-- -----------------------------------------------------------------------------
create or replace function public.get_match_detail(p_match_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'match', to_jsonb(e),
    'games', coalesce((
      select jsonb_agg(to_jsonb(g) order by g.game_number)
      from public.match_games g
      where g.match_id = e.id
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.created_at)
      from public.match_notes n
      where n.match_id = e.id
    ), '[]'::jsonb)
  )
  from public.matches_enriched e
  where e.id = p_match_id;
$$;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0003_seed.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0003
-- Catalogo de sets y leyendas
-- =============================================================================
-- Fuente de las leyendas: https://riftdecks.com/legends (metagame Radiance,
-- noviembre 2026). Fechas de lanzamiento: release oficial en ingles.
--
-- `code` es el identificador estable y UNIQUE de cada fila. Volver a ejecutar
-- esta migracion actualiza nombres y fechas sin duplicar nada, asi que tambien
-- sirve para corregir erratas o retocar un titulo.
--
-- Como anadir cosas nuevas:
--   * Set o leyenda nuevos -> crear una migracion `000X_catalog.sql` con el
--     mismo patron `insert ... on conflict (code) do update`.
--   * Nunca borres un set o una leyenda que ya aparezca en partidas: pon
--     `active = false` y deja de ofrecerse en los formularios.
--   * Ojo con las comillas simples en SQL: se escapan duplicandolas (Kai''Sa).
-- =============================================================================

insert into public.sets (code, name, release_date, active) values
  ('OGN', 'Origins',      date '2025-10-31', true),
  ('SFD', 'Spiritforged', date '2026-02-13', true),
  ('UNL', 'Unleashed',    date '2026-05-08', true),
  ('VEN', 'Vendetta',     date '2026-07-31', true),
  ('RAD', 'Radiance',     date '2026-10-23', true)
on conflict (code) do update
  set name = excluded.name,
      release_date = excluded.release_date,
      active = excluded.active;

-- `name` es el nombre corto (el que se muestra en tablas y matrices) y `title`
-- el nombre completo de la carta. Hay dos "Master Yi" distintos, asi que el
-- titulo es imprescindible para distinguirlos en un desplegable.
insert into public.legends (code, name, title, active) values
  ('RIVEN',               'Riven',        'Riven, The Exile',                 true),
  ('KAISA',               'Kai''Sa',      'Kai''Sa, Daughter of the Void',    true),
  ('KENNEN',              'Kennen',       'Kennen, Heart of the Tempest',     true),
  ('MASTER_YI_BLADESMAN', 'Master Yi (Wuju Bladesman)', 'Master Yi, Wuju Bladesman', true),
  ('RENGAR',              'Rengar',       'Rengar, Pridestalker',             true),
  ('REKSAI',              'Rek''Sai',     'Rek''Sai, Void Burrower',          true),
  ('VEX',                 'Vex',          'Vex, Gloomist',                    true),
  ('JAYCE',               'Jayce',        'Jayce, Defender of Tomorrow',      true),
  ('IRELIA',              'Irelia',       'Irelia, Blade Dancer',             true),
  ('AKALI',               'Akali',        'Akali, Rogue Assassin',            true),
  ('LEBLANC',             'LeBlanc',      'LeBlanc, Deceiver',                true),
  ('LILLIA',              'Lillia',       'Lillia, Bashful Bloom',            true),
  ('VIKTOR',              'Viktor',       'Viktor, Herald of the Arcane',     true),
  ('AZIR',                'Azir',         'Azir, Emperor of the Sands',       true),
  ('EVELYNN',             'Evelynn',      'Evelynn, Agony''s Embrace',        true),
  ('KHAZIX',              'Kha''Zix',     'Kha''Zix, Voidreaver',             true),
  ('MORDEKAISER',         'Mordekaiser',  'Mordekaiser, Iron Revenant',       true),
  ('DIANA',               'Diana',        'Diana, Scorn of the Moon',         true),
  ('ORNN',                'Ornn',         'Ornn, Fire Below the Mountain',    true),
  ('ORIANNA',             'Orianna',      'Orianna, Lady of Clockwork',       true),
  ('NASUS',               'Nasus',        'Nasus, Curator of the Sands',      true),
  ('EKKO',                'Ekko',         'Ekko, Boy Who Shattered Time',     true),
  ('SETT',                'Sett',         'Sett, The Boss',                   true),
  ('SERAPHINE',           'Seraphine',    'Seraphine, Starry-Eyed Songstress', true),
  ('FIORA',               'Fiora',        'Fiora, Grand Duelist',             true),
  ('VOLIBEAR',            'Volibear',     'Volibear, Relentless Storm',       true),
  ('JARVAN_IV',           'Jarvan IV',    'Jarvan IV, Exemplar of Demacia',   true),
  ('ZIGGS',               'Ziggs',        'Ziggs, Hexplosives Expert',        true),
  ('EZREAL',              'Ezreal',       'Ezreal, Prodigal Explorer',        true),
  ('PYKE',                'Pyke',         'Pyke, Bloodharbor Ripper',         true),
  ('TEEMO',               'Teemo',        'Teemo, Swift Scout',               true),
  ('MASTER_YI_MASTER',    'Master Yi (Wuju Master)',    'Master Yi, Wuju Master',           true),
  ('KSANTE',              'K''Sante',     'K''Sante, Pride of Nazumah',       true),
  ('JHIN',                'Jhin',         'Jhin, Virtuoso',                   true),
  ('IVERN',               'Ivern',        'Ivern, Green Father',              true),
  ('VI',                  'Vi',           'Vi, Piltover Enforcer',            true),
  ('DRAVEN',              'Draven',       'Draven, Glorious Executioner',     true),
  ('LUCIAN',              'Lucian',       'Lucian, Purifier',                 true),
  ('MEL',                 'Mel',          'Mel, Soul''s Reflection',          true),
  ('LEONA',               'Leona',        'Leona, Radiant Dawn',              true),
  ('ZED',                 'Zed',          'Zed, Master of Shadows',           true),
  ('RENEKTON',            'Renekton',     'Renekton, Butcher of the Sands',   true),
  ('POPPY',               'Poppy',        'Poppy, Keeper of the Hammer',      true),
  ('RUMBLE',              'Rumble',       'Rumble, Mechanized Menace',        true),
  ('SHEN',                'Shen',         'Shen, Eye of Twilight',            true),
  ('AMBESSA',             'Ambessa',      'Ambessa, Matriarch of War',        true),
  ('DARIUS',              'Darius',       'Darius, Hand of Noxus',            true),
  ('YASUO',               'Yasuo',        'Yasuo, Unforgiven',                true),
  ('MISS_FORTUNE',        'Miss Fortune', 'Miss Fortune, Bounty Hunter',      true),
  ('ANNIE',               'Annie',        'Annie, Dark Child',                true),
  ('LEE_SIN',             'Lee Sin',      'Lee Sin, Blind Monk',              true),
  ('AHRI',                'Ahri',         'Ahri, Nine-Tailed Fox',            true),
  ('JAX',                 'Jax',          'Jax, Grandmaster at Arms',         true),
  ('JINX',                'Jinx',         'Jinx, Loose Cannon',               true),
  ('LUX',                 'Lux',          'Lux, Lady of Luminosity',          true),
  ('SIVIR',               'Sivir',        'Sivir, Battle Mistress',           true),
  ('GAREN',               'Garen',        'Garen, Might of Demacia',          true),
  ('RENATA_GLASC',        'Renata Glasc', 'Renata Glasc, Chem-Baroness',      true)
on conflict (code) do update
  set name = excluded.name,
      title = excluded.title,
      active = excluded.active;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0004_sideboard.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0005_legend_images.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0005
-- Imagenes de leyendas
-- =============================================================================
-- Añade una columna opcional image_url a la tabla legends para poder mostrar
-- el retrato/carta de cada leyenda en desplegables, tablas y matriz de matchups.
-- Las URLs se pueden ir rellenando poco a poco desde una fuente oficial.
-- =============================================================================

alter table public.legends add column if not exists image_url text;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0006_populate_legend_images.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0006
-- Poblar imagenes de leyendas desde riftbound.org
-- =============================================================================
-- Asigna la URL de la imagen de cada leyenda basada en su carta estandar.
-- Las URLs provienen de https://riftbound.org/storage/cards/{set}/{card}-thumb.webp
-- =============================================================================

-- Radiance
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-149-167-thumb.webp?v=1792764005' where code = 'RIVEN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-151-167-thumb.webp?v=1791246999' where code = 'SERAPHINE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-153-167-thumb.webp?v=1792764005' where code = 'EVELYNN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-143-167-thumb.webp?v=1791507604' where code = 'MORDEKAISER';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-145-167-thumb.webp?v=1791246999' where code = 'ORIANNA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-147-167-thumb.webp?v=1791246999' where code = 'KSANTE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-139-167-thumb.webp?v=1791246998' where code = 'EKKO';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-155-167-thumb.webp?v=1792764005' where code = 'JARVAN_IV';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-141-167-thumb.webp?v=1791246999' where code = 'ZIGGS';

-- Vendetta
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-139-166-thumb.webp?v=1790765554' where code = 'AKALI';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-141-166-thumb.webp?v=1790765460' where code = 'RENEKTON';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-143-166-thumb.webp?v=1790765527' where code = 'ZED';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-145-166-thumb.webp?v=1790765470' where code = 'NASUS';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-147-166-thumb.webp?v=1790765487' where code = 'SHEN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-149-166-thumb.webp?v=1790765475' where code = 'JAYCE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-151-166-thumb.webp?v=1790765567' where code = 'MEL';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-153-166-thumb.webp?v=1790765527' where code = 'AMBESSA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-155-166-thumb.webp?v=1790765502' where code = 'KENNEN';

-- Unleashed
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-181-219-thumb.webp?v=1790765585' where code = 'JHIN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-183-219-thumb.webp?v=1790765543' where code = 'RENGAR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-185-219-thumb.webp?v=1790765454' where code = 'PYKE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-187-219-thumb.webp?v=1790765540' where code = 'VI';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-189-219-thumb.webp?v=1790765449' where code = 'LILLIA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-191-219-thumb.webp?v=1790765589' where code = 'MASTER_YI_MASTER';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-193-219-thumb.webp?v=1790765498' where code = 'VEX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-195-219-thumb.webp?v=1790765499' where code = 'IVERN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-197-219-thumb.webp?v=1790765558' where code = 'DIANA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-199-219-thumb.webp?v=1791877518' where code = 'LEBLANC';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-201-219-thumb.webp?v=1790765586' where code = 'KHAZIX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-203-219-thumb.webp?v=1790765515' where code = 'POPPY';

-- Spiritforged
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-181-221-thumb.webp?v=1790765527' where code = 'RUMBLE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-183-221-thumb.webp?v=1790765544' where code = 'LUCIAN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-185-221-thumb.webp?v=1790765498' where code = 'DRAVEN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-187-221-thumb.webp?v=1791877519' where code = 'REKSAI';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-189-221-thumb.webp?v=1790765491' where code = 'ORNN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-193-221-thumb.webp?v=1790765498' where code = 'JAX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-195-221-thumb.webp?v=1790765451' where code = 'IRELIA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-197-221-thumb.webp?v=1790765484' where code = 'AZIR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-199-221-thumb.webp?v=1790765543' where code = 'EZREAL';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-201-221-thumb.webp?v=1790765463' where code = 'RENATA_GLASC';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-203-221-thumb.webp?v=1790765449' where code = 'SIVIR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-205-221-thumb.webp?v=1790765498' where code = 'FIORA';

-- Origins
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-247-298-thumb.webp?v=1790765471' where code = 'KAISA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-249-298-thumb.webp?v=1790765549' where code = 'VOLIBEAR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-251-298-thumb.webp?v=1790765523' where code = 'JINX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-253-298-thumb.webp?v=1790765501' where code = 'DARIUS';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-255-298-thumb.webp?v=1790765534' where code = 'AHRI';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-257-298-thumb.webp?v=1790765452' where code = 'LEE_SIN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-259-298-thumb.webp?v=1791877519' where code = 'YASUO';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-261-298-thumb.webp?v=1790765545' where code = 'LEONA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-263-298-thumb.webp?v=1790765574' where code = 'TEEMO';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-265-298-thumb.webp?v=1790765503' where code = 'VIKTOR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-267-298-thumb.webp?v=1790765456' where code = 'MISS_FORTUNE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-269-298-thumb.webp?v=1791877519' where code = 'SETT';

-- Proving Grounds
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogs/ogs-017-024-thumb.webp?v=1793160002' where code = 'ANNIE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogs/ogs-019-024-thumb.webp?v=1793160003' where code = 'MASTER_YI_BLADESMAN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogs/ogs-021-024-thumb.webp?v=1793160002' where code = 'LUX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogs/ogs-023-024-thumb.webp?v=1793160003' where code = 'GAREN';

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 0007_matchup_sideboard_notes.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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

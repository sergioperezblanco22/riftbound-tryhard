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

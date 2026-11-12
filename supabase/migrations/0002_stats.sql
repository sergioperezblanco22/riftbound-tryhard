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

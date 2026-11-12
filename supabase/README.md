# Base de datos (Supabase / PostgreSQL)

Este directorio contiene el esquema completo del MVP de **Riftbound Competitive
Tracker**: tablas, índices, Row Level Security (RLS) y las funciones de
estadística que alimentan las pantallas.

## Migraciones

Se aplican **en orden**. Cada archivo es idempotente (`create ... if not
exists`, `create or replace`), por lo que se pueden reejecutar sin miedo.

| Orden | Archivo | Contenido |
| ----- | ------- | --------- |
| 1 | `0001_init.sql` | Tablas, índices, triggers y políticas RLS. |
| 2 | `0002_stats.sql` | Vista `matches_enriched` y funciones de estadística. |
| 3 | `0003_seed.sql` | Catálogo de sets y leyendas. |

### Aplicar las migraciones

**Opción A — SQL Editor (la más rápida, sin instalar nada)**

1. Ejecuta `npm run db:setup`. Genera `supabase/setup.sql`, que contiene las tres
   migraciones concatenadas en orden.
2. Abre el panel de Supabase → *SQL Editor* → *New query*.
3. Pega **todo** el contenido de `supabase/setup.sql` y pulsa *Run*.
4. Deberías ver `Success. No rows returned`.

Si prefieres ir paso a paso, pega y ejecuta cada archivo por separado en orden
(`0001` → `0002` → `0003`).

**Opción B — Supabase CLI**

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

> `supabase/setup.sql` es un archivo **generado**: no lo edites a mano, cambia
> las migraciones y vuelve a ejecutar `npm run db:setup`.

## Tablas

| Tabla | Descripción |
| ----- | ----------- |
| `profiles` | Perfil del jugador (1:1 con `auth.users`). Se crea automáticamente al registrarse. |
| `sets` | Catálogo global de sets (solo lectura). |
| `legends` | Catálogo global de leyendas (solo lectura). `name` es el nombre corto y `title` el completo. |
| `decks` | Mazos del jugador. |
| `deck_versions` | Instantáneas **inmutables** de un mazo. `unique (deck_id, version_number)`. |
| `events` | Torneos que agrupan partidas. |
| `matches` | Partidas registradas. |
| `match_games` | Detalle opcional juego a juego. |
| `match_notes` | Anotaciones del jugador sobre una partida. |

### Versiones inmutables

`deck_versions` es un histórico: una partida apunta a la versión concreta con la
que se jugó (`matches.deck_version_id`) y **nunca** se reescribe al crear
versiones nuevas. Así, comparar versiones mide el rendimiento real de cada lista.

## Catálogo de sets y leyendas

`0003_seed.sql` carga el catálogo real:

| Set | Código | Lanzamiento |
| --- | ------ | ----------- |
| Origins | `OGN` | 2025-10-31 |
| Spiritforged | `SFD` | 2026-02-13 |
| Unleashed | `UNL` | 2026-05-08 |
| Vendetta | `VEN` | 2026-07-31 |
| Radiance | `RAD` | 2026-10-23 |

Las leyendas siguen el mismo patrón en `legends`:

- `code` — identificador estable y único (`RIVEN`, `MASTER_YI_BLADESMAN`).
- `name` — nombre corto, el que se usa en tablas y matrices (`Riven`).
- `title` — nombre completo de la carta (`Riven, The Exile`). Necesario porque
  hay leyendas distintas con el mismo nombre corto: existen **dos "Master Yi"**
  (Wuju Bladesman y Wuju Master) y en un desplegable hay que poder elegir cuál.

### Añadir un set o una leyenda nueva

Cuando salga una expansión, crea una migración nueva (`0004_catalog.sql`,
`0005_catalog.sql`…) con el mismo patrón:

```sql
insert into public.legends (code, name, title, active) values
  ('NUEVA', 'Nueva', 'Nueva, La Leyenda', true)
on conflict (code) do update
  set name = excluded.name,
      title = excluded.title,
      active = excluded.active;
```

`code` es `UNIQUE`, así que `on conflict (code) do update` actualiza la fila si
ya existe en vez de duplicarla: el mismo archivo sirve para crear y para corregir.

Dos reglas importantes:

1. **Nunca borres** un set o una leyenda que ya aparezca en partidas: romperías
   el histórico. Usa `active = false` y desaparecerá de los formularios sin
   perder los datos antiguos.
2. Las comillas simples en SQL se escapan duplicándolas (`Kai''Sa`).

## Reglas de estadística

Las funciones de `0002_stats.sql` implementan exactamente las mismas reglas que
`src/lib/stats/compute.ts` (versión TypeScript usada en modo demo):

1. `winrate = wins / (wins + losses) × 100`. Los **empates** quedan fuera del
   denominador, pero se devuelven y se muestran aparte.
2. Si el denominador es `0`, el winrate es `NULL` → la UI lo muestra como `—`,
   nunca como `0 %`.
3. Los **byes** y las partidas **anuladas** (`result in ('bye','void')`) no
   cuentan en ninguna estadística.
4. La matriz de matchups solo considera partidas con **leyenda rival
   identificada**.
5. Los filtros se aplican **antes** de calcular los porcentajes.
6. La UI avisa cuando la muestra es `< 5` partidas (`MIN_SAMPLE_SIZE`).

## Vista y funciones

- `matches_enriched` — vista base con todos los JOIN resueltos. Usa
  `security_invoker = on` para respetar la RLS del usuario que consulta.
- `get_performance_summary(...)` — totales y winrate (partidas y juegos).
- `get_matchup_matrix(...)` — winrate por versión de mazo × leyenda rival.
- `get_deck_performance(...)`, `get_legend_performance(...)`,
  `get_set_performance(...)` — desgloses agregados.
- `get_winrate_trend(...)` — evolución temporal agrupada por periodo.
- `get_match_history(...)` — historial filtrado y paginado.
- `compare_deck_versions(p_deck_id)` — comparativa de las versiones de un mazo.
- `search_match_notes(...)` — búsqueda de anotaciones (texto, categoría, tags).
- `get_match_detail(p_match_id)` — partida + juegos + notas.

Todas las funciones son `security invoker` (o filtran por `auth.uid()`), de modo
que un usuario solo puede leer y escribir **sus propios** datos. El catálogo
(`sets`, `legends`) es de lectura pública para usuarios autenticados.

## Modo demo

Si la aplicación no encuentra `NEXT_PUBLIC_SUPABASE_URL` ni
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, **no consulta** la base de datos: sirve un
conjunto de datos de ejemplo generado en memoria (`src/lib/demo/store.ts`) con
las mismas reglas estadísticas. Es la forma de desarrollar la interfaz sin
credenciales.

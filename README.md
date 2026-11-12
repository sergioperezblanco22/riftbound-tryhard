# Riftbound Competitive Tracker

Aplicación web para jugadores competitivos de **Riftbound**: registra tus
partidas, analiza tu winrate por mazo, versión y matchup, y recibe
recomendaciones concretas de un **AI Coach** que trabaja sobre tus datos reales.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + **React 19**
- **TypeScript** + **Tailwind CSS v4** + **shadcn/ui** (Base UI)
- **Recharts** para las gráficas
- **Supabase** (PostgreSQL + Auth + Row Level Security)
- **AI Coach** con OpenAI **o** Gemini (route handler `POST /api/coach`, clave solo en servidor)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena las variables (ver abajo)
npm run dev                  # http://localhost:3000
```

### Variables de entorno

| Variable | Obligatoria | Descripción |
| -------- | ----------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | No* | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No* | Clave pública de Supabase (proyectos nuevos). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No* | Clave pública de Supabase (nombre antiguo; se acepta igual). |
| `OPENAI_API_KEY` | No | Activa el AI Coach con OpenAI. Tiene prioridad sobre Gemini. |
| `OPENAI_MODEL` | No | Modelo de OpenAI (por defecto `gpt-4o-mini`). |
| `OPENAI_FALLBACK_MODELS` | No | Modelos de respaldo de OpenAI, separados por comas. |
| `GEMINI_API_KEY` | No | Activa el AI Coach con Gemini (si no hay clave de OpenAI). |
| `GEMINI_MODEL` | No | Modelo de Gemini (por defecto `gemini-3.8-flash`). |
| `GEMINI_FALLBACK_MODELS` | No | Modelos de respaldo de Gemini, separados por comas. |

\* Si faltan las dos variables de Supabase, la app arranca en **modo demo**: sirve
un conjunto de datos de ejemplo en memoria y deshabilita las mutaciones, para
poder navegar por toda la interfaz sin credenciales.

### AI Coach: OpenAI o Gemini

El coach funciona con cualquiera de los dos proveedores y se elige
automáticamente:

- Si defines `OPENAI_API_KEY` → usa **OpenAI**.
- Si no, y defines `GEMINI_API_KEY` → usa **Gemini**.
- Si no hay ninguna → `/coach` muestra un aviso y el chat queda deshabilitado.

Gemini se consume a través de su **API compatible con OpenAI**
(`https://generativelanguage.googleapis.com/v1beta/openai/`), así que no hace
falta ningún SDK adicional: se reutiliza el paquete `openai` cambiando la URL
base. Puedes obtener una clave gratuita en
[Google AI Studio](https://aistudio.google.com/apikey).

**Modelos saturados.** Google responde con bastante frecuencia `503 UNAVAILABLE`
("high demand") en los modelos *flash* recién publicados. El coach reintenta la
llamada y, si el modelo principal sigue fallando, prueba automáticamente los de
`GEMINI_FALLBACK_MODELS` (por defecto `gemini-3.7-flash`, `gemini-3.6-flash`,
`gemini-3.5-flash`, `gemini-flash-latest`). El modelo que responde se muestra en
pequeño bajo cada respuesta del chat.

### Base de datos

El esquema completo (tablas, índices, RLS y funciones de estadística) está en
[`supabase/`](./supabase/README.md). La forma más rápida de aplicarlo:

```bash
npm run db:setup   # genera supabase/setup.sql con las 3 migraciones
```

Después pega **todo** `supabase/setup.sql` en el *SQL Editor* de Supabase y pulsa
*Run*. También puedes usar la CLI (`supabase link` + `supabase db push`) o pegar
las migraciones una a una en orden (`0001` → `0002` → `0003`).

El catálogo viene cargado con los **5 sets** de Riftbound (Origins, Spiritforged,
Unleashed, Vendetta y Radiance) y las **58 leyendas** del formato competitivo,
cada una con nombre corto y nombre completo de carta. Para añadir las que salgan
en el futuro, sigue el patrón de [`supabase/README.md`](./supabase/README.md).

## Rutas

| Ruta | Descripción |
| ---- | ----------- |
| `/dashboard` | Panel con KPIs, evolución del winrate y mejores/peores matchups. |
| `/matches` | Historial con filtros, búsqueda y exportación a CSV. |
| `/matches/new` | Registro rápido de partida. |
| `/matches/[id]` | Detalle, juegos y anotaciones. |
| `/decks` · `/decks/[id]` | Mazos y comparativa de versiones. |
| `/matchups` | Matriz de enfrentamientos por versión × leyenda rival. |
| `/events` · `/events/[id]` | Torneos y análisis por torneo. |
| `/coach` | Chat con el AI Coach. |
| `/login` · `/register` | Autenticación. |

## Reglas de estadística

Las cifras siguen reglas estrictas (implementadas igual en TypeScript y en SQL,
para que el modo demo y la base de datos coincidan):

- `winrate = victorias / (victorias + derrotas) × 100`.
- Los **empates** se muestran pero quedan **fuera** del denominador.
- **Byes** y partidas **anuladas** no cuentan en ninguna estadística.
- Si el denominador es `0`, se muestra `—`, **nunca** `0 %`.
- Los **matchups** solo cuentan partidas con leyenda rival identificada.
- Los filtros se aplican **antes** de calcular los porcentajes.
- Siempre se muestra el tamaño de muestra (`n`) y se avisa si es `< 5`.

## Despliegue

Para publicarla y usarla con amigos a coste 0 (Vercel Hobby + Supabase Free +
Gemini free tier), sigue [`DEPLOY.md`](./DEPLOY.md).

## Scripts

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # ESLint
```

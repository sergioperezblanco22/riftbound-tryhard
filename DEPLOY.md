# Despliegue a coste 0

Combinación recomendada para que tú y tus amigos uséis la app sin pagar nada:

| Pieza | Servicio | Coste |
| ----- | -------- | ----- |
| App Next.js 16 | **Vercel Hobby** | 0 € (dominio `*.vercel.app` incluido) |
| Base de datos + Auth | **Supabase Free** | 0 € |
| AI Coach | **Gemini API free tier** | 0 € dentro de la cuota gratuita |
| **Total** | | **0 €/mes** |

> **AWS no sirve para coste 0 permanente.** Las cuentas nuevas solo tienen
> ~$100–200 de crédito durante 6 meses, y Amplify Hosting no soporta Next.js 16
> ni peticiones de más de 30 s (el coach necesita hasta 150 s).

---

## 1. Supabase (base de datos y login)

1. Crea un proyecto gratis en <https://supabase.com/dashboard>. Elige una región
   europea (`eu-west-1` o `eu-central-1`) para que vaya rápido desde España.
2. Genera el SQL completo y aplícalo:
   ```bash
   npm run db:setup
   ```
   Abre **SQL Editor → New query**, pega todo `supabase/setup.sql` y pulsa **Run**.
3. Copia de **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `publishable key` (o `anon key`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Configura **Authentication → URL Configuration**:
   - **Site URL**: `https://TU-APP.vercel.app`
   - **Redirect URLs**: añade `https://TU-APP.vercel.app/**` y
     `http://localhost:3000/**` (para desarrollo).
5. **Authentication → Sign In / Providers → Email**:
   - Para un grupo privado, desactiva **Confirm email**. El SMTP integrado de
     Supabase tiene un límite muy bajo y con varios amigos registrándose a la vez
     puede tardar o fallar.
   - Cuando ya tengáis todos cuenta, desactiva **Allow new users to sign up**
     para que nadie más consuma tu cuota de Gemini.

La Row Level Security ya está en las migraciones: cada usuario solo puede leer y
escribir sus propios mazos, partidas y torneos.

## 2. Gemini (AI Coach gratis)

1. Consigue una clave gratuita en <https://aistudio.google.com/apikey>.
2. En Vercel define `GEMINI_API_KEY`.
3. **No definas `OPENAI_API_KEY`**: tiene prioridad sobre Gemini y es de pago.

La cuota gratuita es compartida por todos los usuarios de la app (es una sola
clave). Si se agota, el coach responderá con error 429/503 hasta que se renueve.

## 3. Vercel

1. Sube el repo a GitHub (o usa `npx vercel` desde local).
2. En <https://vercel.com/new> importa el repositorio. El framework se detecta
   como **Next.js** automáticamente.
3. En **Environment Variables** añade (Production y Preview):
   | Variable | Valor |
   | -------- | ----- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable/anon key |
   | `GEMINI_API_KEY` | clave de Google AI Studio |
   | `GEMINI_MODEL` | opcional, p. ej. `gemini-3.8-flash` |
4. En **Settings → Functions → Region** elige `fra1` (Frankfurt) o `cdg1`
   (París), la más cercana a tu proyecto Supabase. Si no, las funciones corren
   en EE. UU. por defecto.
5. **Deploy**. La primera URL será algo como `https://riftbound-tracker.vercel.app`.
6. Vuelve a Supabase y pon esa URL como **Site URL** (paso 1.4).

El route handler del coach ya declara `maxDuration = 300`, que es el máximo del
plan Hobby y cubre de sobra el presupuesto de 150 s del coach. Comprueba en
**Settings → Functions** que **Fluid compute** está activado (en proyectos
nuevos viene por defecto); sin él, el límite puede quedarse en 60 s.

## 4. Comprobaciones después del deploy

- [ ] `/register` crea la cuenta y entra directamente (si desactivaste la
      confirmación por email).
- [ ] `/matches/new` guarda una partida y sigue ahí al recargar.
- [ ] `/dashboard` muestra tus datos, no los de otro usuario.
- [ ] `/coach` responde a una pregunta.
- [ ] En **Vercel → Logs** no aparecen errores de Supabase ni de Gemini.

## Límites del plan gratuito

- **Supabase Free**: 500 MB de base de datos, 5 GB de egress y el proyecto se
  **pausa tras ~7 días sin ninguna petición** (se reactiva a mano desde el panel).
  Con uso habitual del grupo no debería pasar.
- **Vercel Hobby**: 100 GB de tráfico al mes y funciones de hasta 300 s. Es para
  uso personal/no comercial; para un grupo privado sin ánimo de lucro encaja.
- **Gemini free tier**: límites por minuto y por día. Es el recurso que antes se
  agotará si el grupo usa mucho el coach.
- **Cold starts**: la primera petición tras un rato de inactividad puede tardar
  unos segundos de más.

## Alternativas si Vercel no encaja

- **Render Free**: servicio Node de 512 MB, se duerme a los 15 min de inactividad
  (despierta en ~1 min) y da 750 h/mes. Sirve sin cambios: build `npm run build`,
  start `npm run start`.
- **Oracle Cloud Always Free**: 4 núcleos ARM y 24 GB de RAM gratis para siempre,
  pero hay que montar Node, systemd y Caddy a mano.

## Seguridad

- En el cliente solo se usan las claves públicas (`NEXT_PUBLIC_*`). **Nunca**
  pongas la `service_role` key en Vercel ni en el repo: se salta la RLS.
- Los `.env*` están en `.gitignore`; solo se versiona `.env.example`.
- Tras crear las cuentas de tus amigos, cierra el registro en Supabase.

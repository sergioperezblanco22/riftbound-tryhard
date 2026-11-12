import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// =============================================================================
// Comprobacion ligera de que el esquema esta aplicado en Supabase. Sirve para
// distinguir "no hay datos todavia" de "faltan las tablas", que es un error de
// configuracion y no debe parecer una aplicacion vacia.
// =============================================================================

export type SchemaStatus = "unconfigured" | "ready" | "missing" | "unknown";

const CACHE_TTL_MS = 20_000;

let cached: { status: SchemaStatus; at: number } | null = null;

/** Codigos de PostgREST/PostgreSQL para "esa tabla no existe". */
const MISSING_TABLE_CODES = new Set(["PGRST205", "42P01"]);

export async function getSchemaStatus(): Promise<SchemaStatus> {
  if (!isSupabaseConfigured()) return "unconfigured";

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.status;
  }

  let status: SchemaStatus = "unknown";

  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return "unconfigured";

    // Consulta minima: solo interesa si la tabla existe, no su contenido.
    const { error } = await supabase.from("sets").select("id").limit(1);

    if (!error) {
      status = "ready";
    } else if (MISSING_TABLE_CODES.has(error.code)) {
      status = "missing";
    }
  } catch {
    // Sin conexion o credenciales invalidas: no es un problema de esquema.
    status = "unknown";
  }

  cached = { status, at: Date.now() };
  return status;
}

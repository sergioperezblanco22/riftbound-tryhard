import { DatabaseZapIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Aviso de modo demo. Se muestra cuando no hay credenciales de Supabase: la app
 * navega con datos de ejemplo y las mutaciones estan deshabilitadas.
 */
export function DemoBanner() {
  if (isSupabaseConfigured()) return null;

  return (
    <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
      <DatabaseZapIcon className="text-amber-600 dark:text-amber-400" />
      <AlertTitle>Modo demo activo</AlertTitle>
      <AlertDescription className="text-amber-800/90 dark:text-amber-200/80">
        Estás navegando con un conjunto de datos de ejemplo. Define{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{" "}
        y{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        </code>{" "}
        (o su nombre antiguo{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>
        ) para conectar tu base de datos real.
      </AlertDescription>
    </Alert>
  );
}

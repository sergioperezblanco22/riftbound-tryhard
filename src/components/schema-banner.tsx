import { DatabaseIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSchemaStatus } from "@/lib/db/health";

/**
 * Aviso de esquema sin aplicar. Las credenciales de Supabase son correctas pero
 * las tablas todavia no existen: sin este aviso la app simplemente pareceria
 * vacia y costaria entender por que.
 */
export async function SchemaBanner() {
  const status = await getSchemaStatus();
  if (status !== "missing") return null;

  return (
    <Alert variant="destructive">
      <DatabaseIcon />
      <AlertTitle>Faltan las tablas en Supabase</AlertTitle>
      <AlertDescription>
        <p>
          La conexión con Supabase funciona, pero el esquema todavía no está
          aplicado, así que todas las consultas devuelven vacío. Para crearlo:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Ejecuta{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              npm run db:setup
            </code>{" "}
            para generar{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              supabase/setup.sql
            </code>
            .
          </li>
          <li>
            Abre el panel de Supabase → <em>SQL Editor</em> → <em>New query</em>.
          </li>
          <li>
            Pega <strong>todo</strong> el contenido y pulsa <em>Run</em>. Debe
            responder <em>Success. No rows returned</em>.
          </li>
        </ol>
        <p className="mt-2">
          Vuelve a cargar esta página cuando termine. Detalles en{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            supabase/README.md
          </code>
          .
        </p>
      </AlertDescription>
    </Alert>
  );
}

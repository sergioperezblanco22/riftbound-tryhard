// Genera `supabase/setup.sql` concatenando las migraciones en orden.
//
// Sirve para aplicar todo el esquema de una sola vez desde el panel de Supabase
// (SQL Editor -> pegar -> Run), sin necesidad de instalar la CLI.
//
// Uso: npm run db:setup
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(root, "supabase", "migrations");
const outFile = join(root, "supabase", "setup.sql");

const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No hay migraciones en supabase/migrations.");
  process.exit(1);
}

const parts = [
  "-- ===========================================================================",
  "-- Riftbound Competitive Tracker - esquema completo",
  "--",
  "-- ARCHIVO GENERADO: no lo edites a mano. Se construye con `npm run db:setup`",
  "-- a partir de las migraciones de `supabase/migrations/`.",
  "--",
  "-- Como usarlo: Supabase Dashboard -> SQL Editor -> New query -> pega TODO",
  "-- este contenido -> Run. Es equivalente a ejecutar en orden:",
  ...files.map((file) => `--   ${file}`),
  "-- ===========================================================================",
  "",
];

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), "utf8");
  parts.push(
    "-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",
    `-- ${file}`,
    "-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
    "",
    sql.trimEnd(),
    ""
  );
}

await writeFile(outFile, parts.join("\n"), "utf8");
console.log(`supabase/setup.sql generado desde: ${files.join(", ")}`);

import { getMatches } from "@/lib/db/queries";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { resultLabel } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = [
  "Fecha",
  "Resultado",
  "Mazo",
  "Versión",
  "Mi leyenda",
  "Leyenda rival",
  "Arquetipo rival",
  "Rival",
  "Juegos ganados",
  "Juegos perdidos",
  "Juegos empatados",
  "Torneo",
  "Ronda",
  "Formato",
  "Notas",
] as const;

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toSearchParams(url: URL): SearchParams {
  const params: SearchParams = {};
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }
  return params;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseFilters(toSearchParams(url));
  const rows = await getMatches(filters, 5000);

  const lines = [COLUMNS.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.played_at,
        resultLabel(row.result),
        row.deck_name,
        row.version_label ?? (row.version_number ? `V${row.version_number}` : null),
        row.own_legend_name,
        row.opponent_legend_name,
        row.opponent_archetype,
        row.opponent_player_label,
        row.game_wins,
        row.game_losses,
        row.game_draws,
        row.event_name,
        row.round_number,
        row.format_code,
        row.note_count,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  // BOM UTF-8 para que Excel abra bien los acentos.
  const body = `\uFEFF${lines.join("\r\n")}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="riftbound-partidas-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

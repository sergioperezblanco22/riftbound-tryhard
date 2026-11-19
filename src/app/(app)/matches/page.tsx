import { Suspense } from "react";
import Link from "next/link";
import { DownloadIcon, PlusIcon } from "lucide-react";

import { GlobalFilters } from "@/components/filters/global-filters";
import { MatchSearch } from "@/components/matches/match-search";
import { MatchTable } from "@/components/matches/match-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFilterOptions, getMatches } from "@/lib/db/queries";
import { filtersToQuery, parseFilters } from "@/lib/filters";

export const metadata = { title: "Partidas" };

const LIMIT = 200;

export default async function MatchesPage({
  searchParams,
}: PageProps<"/matches">) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const query = typeof params.q === "string" ? params.q.trim() : "";

  // Si no hay filtro de set en la URL, se usa por defecto el ultimo set
  // disponible (el mas reciente por fecha de lanzamiento).
  const options = await getFilterOptions();
  if (!filters.set_id && options.sets.length > 0) {
    filters.set_id = options.sets[options.sets.length - 1].id;
  }

  const [rows] = await Promise.all([getMatches(filters, LIMIT)]);

  const exportQuery = filtersToQuery(filters);
  const exportHref = exportQuery
    ? `/api/export/matches?${exportQuery}`
    : "/api/export/matches";

  const needle = query.toLowerCase();
  const matches = needle
    ? rows.filter((row) =>
        [
          row.deck_name,
          row.version_label,
          row.own_legend_name,
          row.opponent_legend_name,
          row.opponent_archetype,
          row.opponent_player_label,
          row.event_name,
        ]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(needle))
      )
    : rows;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Partidas"
        description="Historial completo con filtros y búsqueda."
        actions={
          <>
            <Button variant="outline" size="sm" nativeButton={false} render={<a href={exportHref} />}>
              <DownloadIcon />
              Exportar CSV
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/matches/new" />}>
              <PlusIcon />
              Registrar partida
            </Button>
          </>
        }
      />

      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <GlobalFilters options={options} active={filters} />
      </Suspense>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={<Skeleton className="h-8 w-full sm:max-w-xs" />}>
          <MatchSearch initialQuery={query} />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          Mostrando {matches.length} de {rows.length} partidas
          {rows.length >= LIMIT ? ` (límite ${LIMIT})` : ""}
        </p>
      </div>

      <MatchTable
        matches={matches}
        legends={options.legends}
        emptyLabel={
          query
            ? `No hay partidas que coincidan con "${query}".`
            : "No hay partidas que cumplan los filtros."
        }
      />
    </div>
  );
}

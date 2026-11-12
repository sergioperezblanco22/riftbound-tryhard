import { Suspense } from "react";

import { GlobalFilters } from "@/components/filters/global-filters";
import { MatchupMatrix } from "@/components/matchups/matchup-matrix";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFilterOptions, getMatchupData } from "@/lib/db/queries";
import { parseFilters } from "@/lib/filters";

export const metadata = { title: "Matchups" };

export default async function MatchupsPage({
  searchParams,
}: PageProps<"/matchups">) {
  const params = await searchParams;
  const filters = parseFilters(params);

  // Si no hay filtro de set, usar el último set disponible (el más reciente).
  const options = await getFilterOptions();
  if (!filters.set_id && options.sets.length > 0) {
    filters.set_id = options.sets[options.sets.length - 1].id;
  }

  const [data] = await Promise.all([
    getMatchupData(filters),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Matchups"
        description="Matriz de winrate por versión de mazo y leyenda rival. Solo se cuentan las partidas con rival identificado."
      />

      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <GlobalFilters options={options} active={filters} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de enfrentamientos</CardTitle>
          <CardDescription>
            Pulsa una celda para ver el detalle y las partidas concretas. Las
            celdas con muestra pequeña se marcan con un aviso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatchupMatrix cells={data.cells} legends={data.legends} />
        </CardContent>
      </Card>
    </div>
  );
}

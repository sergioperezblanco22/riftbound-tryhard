import Link from "next/link";
import { ArrowLeftIcon, BookIcon } from "lucide-react";

import { LegendAvatar } from "@/components/ui/legend-avatar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFilterOptions } from "@/lib/db/queries";
import type { LegendRow } from "@/lib/db/types";

export const metadata = { title: "Nueva nota de sideboard" };

export default async function NewSideboardPage({
  searchParams,
}: { searchParams: Promise<{ my_legend_id?: string }> }) {
  const params = await searchParams;
  const options = await getFilterOptions();
  const legends = options.legends
    .filter((l) => l.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  const presetMyLegendId = params.my_legend_id ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva nota de sideboard"
        description="Primero selecciona tu leyenda, luego la leyenda rival."
        actions={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/sideboards" />}
          >
            <ArrowLeftIcon />
            Volver
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Paso 1: Tu leyenda</CardTitle>
          <CardDescription>
            Selecciona la leyenda que usas en este matchup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {legends.map((legend) => {
              const isSelected = legend.id === presetMyLegendId;
              return (
                <Link
                  key={legend.id}
                  href={`/sideboards/new?my_legend_id=${legend.id}`}
                  className="block cursor-pointer"
                >
                  <Card
                    className={`${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "hover:border-primary/50 transition-colors cursor-pointer"
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="text-center text-sm font-medium">
                        {legend.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-2 p-3">
                      <LegendAvatar
                        legend={{
                          ...legend,
                          image_url: legend.image_url ?? null,
                        }}
                        size="lg"
                      />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {presetMyLegendId && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 2: Leyenda rival</CardTitle>
            <CardDescription>
              Selecciona la leyenda contra la que juegas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {legends
                .filter((l) => l.id !== presetMyLegendId)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((rival) => (
                  <Link
                    key={rival.id}
                    href={`/sideboards/${presetMyLegendId}/${rival.id}`}
                    className="block cursor-pointer"
                  >
                    <Card
                      className="hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <CardHeader>
                        <CardTitle className="text-center text-sm font-medium">
                          {rival.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center gap-2 p-3">
                        <LegendAvatar
                          legend={{
                            ...rival,
                            image_url: rival.image_url ?? null,
                          }}
                          size="lg"
                        />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowLeftIcon, BookOpenIcon, SearchIcon } from "lucide-react";

import { LegendAvatar } from "@/components/ui/legend-avatar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFilterOptions, getMatchupSideboardNotes } from "@/lib/db/queries";
import type { LegendRow } from "@/lib/db/types";

export const metadata = { title: "Elegir rival" };

export default async function SideboardRivalPage({
  params,
}: { params: Promise<{ my_legend_id: string }> }) {
  const { my_legend_id } = await params;
  const options = await getFilterOptions();
  const notes = await getMatchupSideboardNotes(my_legend_id);

  const myLegend = options.legends.find((l) => l.id === my_legend_id);
  if (!myLegend) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Leyenda no encontrada.</p>
      </div>
    );
  }

  const rivalIds = new Set(notes.map((n) => n.rival_legend_id));
  const rivals = options.legends
    .filter((l) => l.active && l.id !== my_legend_id)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Rival vs ${myLegend.name}`}
        description="Selecciona la leyenda rival para ver o anadir notas de sideboard."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/sideboards" />}
            >
            <ArrowLeftIcon />
            Leyendas
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/sideboards/new?my_legend_id=${my_legend_id}`} />}
            >
              <BookOpenIcon />
              Nueva nota
            </Button>
          </>
        }
      />

      <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {rivals.map((rival) => {
          const hasNote = rivalIds.has(rival.id);
          return (
            <Card
              key={rival.id}
              className={`cursor-pointer group transition-colors ${
                hasNote
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "hover:border-primary/50"
              }`}
            >
              <CardHeader>
                <CardTitle className="text-center text-sm font-medium">
                  {rival.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2 p-3">
                <Link
                  href={`/sideboards/${my_legend_id}/${rival.id}`}
                  className="flex flex-col items-center gap-1"
                >
                  <LegendAvatar
                    legend={{
                      ...rival,
                      image_url: rival.image_url ?? null,
                    }}
                    size="lg"
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {rival.title ?? rival.name}
                  </span>
                </Link>
                {hasNote && (
                  <span className="text-[0.65rem] text-emerald-600 dark:text-emerald-400 font-medium">
                    Notas guardadas
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";
import { BookOpenIcon, SearchIcon } from "lucide-react";

import { LegendAvatar } from "@/components/ui/legend-avatar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFilterOptions } from "@/lib/db/queries";
import type { LegendRow } from "@/lib/db/types";

export const metadata = { title: "Sideboards" };

export default async function SideboardsPage() {
  const options = await getFilterOptions();
  const legends = options.legends
    .filter((l) => l.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sideboards"
        description="Notas teoricas de sideboard por matchup. Selecciona tu leyenda y luego la leyenda rival para ver o anadir notas."
        actions={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/sideboards/new" />}
          >
            <BookOpenIcon />
            Nueva nota
          </Button>
        }
      />

      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {legends.map((legend) => (
          <Card key={legend.id} className="cursor-pointer group hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-center text-sm font-medium">
                {legend.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 p-3">
              <Link
                href={`/sideboards/${legend.id}`}
                className="flex flex-col items-center gap-1"
              >
                <LegendAvatar
                  legend={{
                    ...legend,
                    image_url: legend.image_url ?? null,
                  }}
                  size="lg"
                />
                <span className="text-xs text-muted-foreground truncate">
                  {legend.title ?? legend.name}
                </span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

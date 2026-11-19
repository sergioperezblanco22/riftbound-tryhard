import Link from "next/link";
import { BookOpenIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFilterOptions } from "@/lib/db/queries";
import type { LegendRow } from "@/lib/db/types";
import SideboardsList from "./SideboardsList";

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

      <SideboardsList legends={legends} />
    </div>
  );
}

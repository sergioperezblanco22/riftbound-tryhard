import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { LegendAvatar } from "@/components/ui/legend-avatar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMatchupSideboardNoteServer,
  getMatchupSideboardNotesServer,
} from "@/lib/db/actions";
import { getFilterOptions, getLegends } from "@/lib/db/queries";
import SideboardNoteForm from "./SideboardNoteForm";

export const metadata = { title: "Sideboard note" };

export default async function SideboardNotePage({
  params,
}: {
  params: Promise<{ my_legend_id: string; rival_legend_id: string }>;
}) {
  const { my_legend_id: myLegendId, rival_legend_id: rivalLegendId } =
    await params;

  const [legendsResult, initialNote] = await Promise.all([
    getLegends(),
    getMatchupSideboardNoteServer(myLegendId, rivalLegendId),
  ]);

  const myLegend = legendsResult.find((l) => l.id === myLegendId);
  const rivalLegend = legendsResult.find((l) => l.id === rivalLegendId);

  if (!myLegend || !rivalLegend) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${myLegend.name} vs ${rivalLegend.name}`}
        description="Notas teoricas de sideboard para este matchup."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/sideboards/${myLegendId}`}>
                  <ArrowLeftIcon />
                  Volver a rivales
                </Link>
              }
            />
          </>
        }
      />

      <SideboardNoteForm
        myLegendId={myLegendId}
        rivalLegendId={rivalLegendId}
        myLegendName={myLegend.name}
        rivalLegendName={rivalLegend.name}
        initialNote={initialNote}
      />
    </div>
  );
}

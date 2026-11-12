import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { MatchForm } from "@/components/matches/match-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFilterOptions, getMatchDetail } from "@/lib/db/queries";

export const metadata = { title: "Editar partida" };

export default async function EditMatchPage({
  params,
}: PageProps<"/matches/[id]/edit">) {
  const { id } = await params;
  const [detail, options] = await Promise.all([
    getMatchDetail(id),
    getFilterOptions(),
  ]);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editar partida"
        description="Corrige cualquier dato mal registrado."
        actions={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/matches/${id}`} />}
          >
            <ArrowLeftIcon />
            Volver
          </Button>
        }
      />

      <Card>
        <CardContent>
          <MatchForm options={options} match={detail.match} />
        </CardContent>
      </Card>
    </div>
  );
}

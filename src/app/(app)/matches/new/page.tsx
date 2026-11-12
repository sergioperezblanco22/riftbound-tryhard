import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { MatchForm } from "@/components/matches/match-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFilterOptions } from "@/lib/db/queries";

export const metadata = { title: "Registrar partida" };

export default async function NewMatchPage() {
  const options = await getFilterOptions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registrar partida"
        description="Diseñado para completarse en menos de 45 segundos."
        actions={
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/matches" />}>
            <ArrowLeftIcon />
            Volver
          </Button>
        }
      />

      <Card>
        <CardContent>
          <MatchForm options={options} />
        </CardContent>
      </Card>
    </div>
  );
}

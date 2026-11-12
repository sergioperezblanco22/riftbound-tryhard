import Link from "next/link";
import { LayersIcon } from "lucide-react";

import { CreateDeckDialog } from "@/components/decks/create-deck-dialog";
import { PageHeader } from "@/components/page-header";
import { SampleSize } from "@/components/sample-size";
import { WinrateBadge } from "@/components/winrate-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDeckList, getLegends } from "@/lib/db/queries";
import { formatDate, formatRecord } from "@/lib/format";

export const metadata = { title: "Mazos" };

export default async function DecksPage() {
  const [decks, legends] = await Promise.all([getDeckList(), getLegends()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mazos"
        description="Tus mazos, sus versiones y el rendimiento de cada uno."
        actions={<CreateDeckDialog legends={legends} />}
      />

      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <LayersIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no tienes mazos. Crea el primero para empezar a registrar
            partidas.
          </p>
          <CreateDeckDialog legends={legends} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card key={deck.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <Link
                    href={`/decks/${deck.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {deck.name}
                  </Link>
                  <WinrateBadge value={deck.stats?.winrate ?? null} />
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {deck.description ?? "Sin descripción."}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    <LayersIcon />
                    {deck.versions.length}{" "}
                    {deck.versions.length === 1 ? "versión" : "versiones"}
                  </Badge>
                  {deck.stats?.own_legend_name ? (
                    <Badge variant="secondary">
                      {deck.stats.own_legend_name}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm tabular-nums">
                    {deck.stats
                      ? formatRecord(
                          deck.stats.wins,
                          deck.stats.losses,
                          deck.stats.draws
                        )
                      : "—"}
                  </span>
                  <SampleSize count={deck.stats?.matches ?? 0} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Última partida:{" "}
                  {deck.stats?.last_played_at
                    ? formatDate(deck.stats.last_played_at)
                    : "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

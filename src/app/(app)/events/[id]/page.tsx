import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { BreakdownBarChart } from "@/components/charts/breakdown-bar-chart";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader } from "@/components/page-header";
import { ResultBadge } from "@/components/result-badge";
import { SampleSize } from "@/components/sample-size";
import { StatCard } from "@/components/stat-card";
import { WinrateBadge } from "@/components/winrate-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteEventAction } from "@/lib/db/actions";
import { getEventDetail } from "@/lib/db/queries";
import { formatDate, formatRecord, formatScore } from "@/lib/format";

export const metadata = { title: "Torneo" };

export default async function EventDetailPage({
  params,
}: PageProps<"/events/[id]">) {
  const { id } = await params;
  const detail = await getEventDetail(id);
  if (!detail) notFound();

  const { event, set, summary, matchup, rounds } = detail;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event.name}
        description={`${formatDate(event.start_date)}${set ? ` · ${set.code} ${set.name}` : ""}${event.location ? ` · ${event.location}` : ""}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/matches/new?event_id=${event.id}&set_id=${set?.id ?? ""}`} />}
            >
              <PlusIcon />
              Registrar partida
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/events" />}
            >
              <ArrowLeftIcon />
              Volver
            </Button>
            <form action={deleteEventAction}>
              <input type="hidden" name="id" value={event.id} />
              <ConfirmButton
                variant="destructive"
                size="sm"
                message="¿Eliminar este torneo? Las partidas se conservarán como partidas sueltas."
              >
                <Trash2Icon />
                Eliminar
              </ConfirmButton>
            </form>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Winrate"
          value={<WinrateBadge value={summary.winrate} className="text-2xl" />}
          hint={<SampleSize count={summary.wins + summary.losses} />}
        />
        <StatCard
          label="Balance"
          value={formatRecord(summary.wins, summary.losses, summary.draws)}
        />
        <StatCard label="Rondas jugadas" value={rounds.length} />
        <StatCard
          label="Winrate por juegos"
          value={<WinrateBadge value={summary.game_winrate} className="text-2xl" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rondas</CardTitle>
            <CardDescription>Resultado ronda a ronda.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ronda</TableHead>
                    <TableHead className="w-10 text-center">Res.</TableHead>
                    <TableHead>Rival</TableHead>
                    <TableHead className="text-center">Marcador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rounds.map((round) => (
                    <TableRow key={round.id}>
                      <TableCell className="text-muted-foreground">
                        {round.round_number ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <ResultBadge result={round.result} />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/matches/${round.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {round.opponent_legend_name ?? "Sin identificar"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {formatScore(
                          round.game_wins,
                          round.game_losses,
                          round.game_draws
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matchups del torneo</CardTitle>
            <CardDescription>Winrate por leyenda rival.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart
              data={matchup.map((legend) => ({
                name: legend.legend_name,
                winrate: legend.winrate,
                matches: legend.matches,
                wins: legend.wins,
                losses: legend.losses,
                draws: legend.draws,
              }))}
              height={Math.max(160, matchup.length * 40)}
            />
          </CardContent>
        </Card>
      </div>

      {event.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notas del torneo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{event.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

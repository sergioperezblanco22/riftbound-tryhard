import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";

import { BreakdownBarChart } from "@/components/charts/breakdown-bar-chart";
import { ConfirmButton } from "@/components/confirm-button";
import { CreateVersionDialog } from "@/components/decks/create-version-dialog";
import { MatchTable } from "@/components/matches/match-table";
import { PageHeader } from "@/components/page-header";
import { SampleSize } from "@/components/sample-size";
import { StatCard } from "@/components/stat-card";
import { WinrateBadge } from "@/components/winrate-badge";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteDeckAction } from "@/lib/db/actions";
import { getDeckDetail, getLegends } from "@/lib/db/queries";
import {
  formatDate,
  formatRecord,
  formatScore,
  noteCategoryLabel,
} from "@/lib/format";

export const metadata = { title: "Mazo" };

export default async function DeckDetailPage({
  params,
}: PageProps<"/decks/[id]">) {
  const { id } = await params;
  const [detail, legends] = await Promise.all([
    getDeckDetail(id),
    getLegends(),
  ]);
  if (!detail) notFound();

  const { deck, versions, comparison, summary, matchup, matches, notes } = detail;
  const nextVersion =
    versions.reduce((max, version) => Math.max(max, version.version_number), 0) +
    1;
  const lastLegendId = versions.at(-1)?.legend_id ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={deck.name}
        description={deck.description ?? "Sin descripción."}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/decks" />}
            >
              <ArrowLeftIcon />
              Volver
            </Button>
            <CreateVersionDialog
              deckId={deck.id}
              legends={legends}
              nextVersion={nextVersion}
              defaultLegendId={lastLegendId}
            />
            <form action={deleteDeckAction}>
              <input type="hidden" name="id" value={deck.id} />
              <ConfirmButton
                variant="destructive"
                size="sm"
                message="¿Eliminar este mazo, sus versiones y sus notas? Las partidas se conservarán sin mazo asociado."
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
        <StatCard
          label="Partidas válidas"
          value={summary.matches}
          hint={
            summary.period_from
              ? `${formatDate(summary.period_from)} → ${formatDate(
                  summary.period_to
                )}`
              : "Sin partidas"
          }
        />
        <StatCard
          label="Versiones"
          value={versions.length}
          hint={`Última: V${versions.at(-1)?.version_number ?? 1}`}
        />
      </div>

      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="versions">Versiones</TabsTrigger>
          <TabsTrigger value="matchups">Matchups</TabsTrigger>
          <TabsTrigger value="matches">Partidas ({matches.length})</TabsTrigger>
          <TabsTrigger value="notes">Notas ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparativa de versiones</CardTitle>
              <CardDescription>
                Rendimiento de cada instantánea. Las partidas antiguas conservan
                la versión con la que se jugaron.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Versión</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Leyenda
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Creada
                      </TableHead>
                      <TableHead className="text-right">Partidas</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Winrate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.map((version) => (
                      <TableRow key={version.deck_version_id}>
                        <TableCell className="font-medium">
                          {version.version_label ??
                            `V${version.version_number}`}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {version.own_legend_name ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {formatDate(version.created_at)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <SampleSize count={version.matches} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRecord(
                            version.wins,
                            version.losses,
                            version.draws
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <WinrateBadge value={version.winrate} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matchups" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Matchups de este mazo</CardTitle>
              <CardDescription>
                Winrate por leyenda rival. Solo partidas con rival identificado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <BreakdownBarChart
                data={[...matchup]
                  .sort((a, b) => b.matches - a.matches)
                  .map((cell) => ({
                    name: `${cell.version_label ?? `V${cell.version_number}`} vs ${cell.opponent_legend_name}`,
                    winrate: cell.winrate,
                    matches: cell.matches,
                    wins: cell.wins,
                    losses: cell.losses,
                    draws: cell.draws,
                  }))}
                height={Math.max(160, matchup.length * 36)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="pt-4">
          <MatchTable
            matches={matches}
            emptyLabel="Este mazo todavía no tiene partidas."
          />
        </TabsContent>

        <TabsContent value="notes" className="pt-4">
          {notes.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No hay notas asociadas a las partidas de este mazo.
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => {
                const match = matches.find((m) => m.id === note.match_id);
                return (
                  <li
                    key={note.id}
                    className="rounded-xl border bg-card p-4"
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {noteCategoryLabel(note.category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.created_at)}
                      </span>
                      {match ? (
                        <Link
                          href={`/matches/${note.match_id}`}
                          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                        >
                          {match.opponent_legend_name ?? "Rival sin identificar"}{" "}
                          · {formatScore(match.game_wins, match.game_losses, match.game_draws)}
                        </Link>
                      ) : null}
                    </div>
                    <p className="text-sm">{note.content}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

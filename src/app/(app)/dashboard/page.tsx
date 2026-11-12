import { Suspense } from "react";
import Link from "next/link";
import {
  ActivityIcon,
  ArrowRightIcon,
  PercentIcon,
  SwordsIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";

import { BreakdownBarChart } from "@/components/charts/breakdown-bar-chart";
import { WinrateTrendChart } from "@/components/charts/winrate-trend-chart";
import { GlobalFilters } from "@/components/filters/global-filters";
import { MatchTable } from "@/components/matches/match-table";
import { PageHeader } from "@/components/page-header";
import { SampleSize } from "@/components/sample-size";
import { StatCard } from "@/components/stat-card";
import { WinrateBadge } from "@/components/winrate-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardData, getFilterOptions } from "@/lib/db/queries";
import { parseFilters } from "@/lib/filters";
import { formatDate, formatRecord } from "@/lib/format";

export const metadata = { title: "Panel" };

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const params = await searchParams;
  const filters = parseFilters(params);

  // Si no hay filtro de set, usar el último set disponible (el más reciente).
  const options = await getFilterOptions();
  if (!filters.set_id && options.sets.length > 0) {
    filters.set_id = options.sets[options.sets.length - 1].id;
  }

  const [data] = await Promise.all([
    getDashboardData(filters),
  ]);

  const { summary } = data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Panel"
        description="Resumen de rendimiento según los filtros activos."
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/matches/new" />}>
            <SwordsIcon />
            Registrar partida
          </Button>
        }
      />

      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <GlobalFilters options={options} active={filters} />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Winrate"
          value={<WinrateBadge value={summary.winrate} className="text-2xl" />}
          hint={
            <SampleSize
              count={summary.wins + summary.losses}
              className="flex-wrap"
            />
          }
          icon={PercentIcon}
        />
        <StatCard
          label="Balance"
          value={formatRecord(summary.wins, summary.losses, summary.draws)}
          hint={
            summary.draws > 0
              ? `${summary.draws} ${
                  summary.draws === 1 ? "empate" : "empates"
                } (fuera del winrate)`
              : "Sin empates registrados"
          }
          icon={SwordsIcon}
        />
        <StatCard
          label="Partidas válidas"
          value={summary.matches}
          hint={
            summary.period_from
              ? `${formatDate(summary.period_from)} → ${formatDate(
                  summary.period_to
                )}`
              : "Sin partidas en el periodo"
          }
          icon={ActivityIcon}
        />
        <StatCard
          label="Winrate por juegos"
          value={<WinrateBadge value={summary.game_winrate} className="text-2xl" />}
          hint={
            <SampleSize
              count={summary.game_wins + summary.game_losses}
              className="flex-wrap"
            />
          }
          icon={PercentIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolución del winrate</CardTitle>
            <CardDescription>Agrupado por semana natural.</CardDescription>
          </CardHeader>
          <CardContent>
            <WinrateTrendChart data={data.trend} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Mejor matchup</CardDescription>
              {data.best_matchup ? (
                <>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <TrendingUpIcon className="size-4 text-emerald-500" />
                      {data.best_matchup.legend_name}
                    </span>
                    <WinrateBadge value={data.best_matchup.winrate} />
                  </CardTitle>
                  <CardAction />
                </>
              ) : (
                <CardTitle className="text-base text-muted-foreground">
                  Datos insuficientes
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {data.best_matchup ? (
                <SampleSize count={data.best_matchup.matches} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Necesitas al menos 5 partidas contra una misma leyenda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Peor matchup</CardDescription>
              {data.worst_matchup ? (
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <TrendingDownIcon className="size-4 text-rose-500" />
                    {data.worst_matchup.legend_name}
                  </span>
                  <WinrateBadge value={data.worst_matchup.winrate} />
                </CardTitle>
              ) : (
                <CardTitle className="text-base text-muted-foreground">
                  Datos insuficientes
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {data.worst_matchup ? (
                <SampleSize count={data.worst_matchup.matches} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Necesitas al menos 5 partidas contra una misma leyenda.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por mazo</CardTitle>
            <CardDescription>Winrate de cada mazo en el periodo.</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="xs"
                nativeButton={false}
                render={<Link href="/decks" />}
              >
                Ver mazos
                <ArrowRightIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart
              data={data.by_deck.map((deck) => ({
                name: deck.deck_name,
                winrate: deck.winrate,
                matches: deck.matches,
                wins: deck.wins,
                losses: deck.losses,
                draws: deck.draws,
              }))}
              height={Math.max(160, data.by_deck.length * 44)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matchups por leyenda rival</CardTitle>
            <CardDescription>
              Solo partidas con leyenda rival identificada.
            </CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="xs"
                nativeButton={false}
                render={<Link href="/matchups" />}
              >
                Matriz completa
                <ArrowRightIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart
              data={[...data.by_legend]
                .sort((a, b) => b.matches - a.matches)
                .slice(0, 8)
                .map((legend) => ({
                  name: legend.legend_name,
                  winrate: legend.winrate,
                  matches: legend.matches,
                  wins: legend.wins,
                  losses: legend.losses,
                  draws: legend.draws,
                }))}
              height={Math.max(160, Math.min(data.by_legend.length, 8) * 44)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partidas recientes</CardTitle>
          <CardDescription>
            Las últimas 8 partidas que cumplen los filtros.
          </CardDescription>
          <CardAction>
            <Button variant="ghost" size="xs" nativeButton={false} render={<Link href="/matches" />}>
              Ver todas
              <ArrowRightIcon />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <MatchTable
            matches={data.recent}
            emptyLabel="No hay partidas que cumplan los filtros."
            className="border-0 bg-transparent"
          />
        </CardContent>
      </Card>
    </div>
  );
}

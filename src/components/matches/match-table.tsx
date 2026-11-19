import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";

import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResultBadge } from "@/components/result-badge";
import { formatDate, formatScore, noteCategoryLabel } from "@/lib/format";
import type { MatchEnrichedRow, LegendRow } from "@/lib/db/types";
import { LegendAvatar } from "@/components/ui/legend-avatar";

export function MatchTable({
  matches,
  legends,
  emptyLabel = "Todavía no hay partidas registradas.",
  className,
}: {
  matches: MatchEnrichedRow[];
  legends?: LegendRow[];
  emptyLabel?: string;
  className?: string;
}) {
  const legendById = legends ? new Map(legends.map((l) => [l.id, l])) : null;
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Fecha</TableHead>
            <TableHead className="w-10 text-center">Res.</TableHead>
            <TableHead>Mazo / versión</TableHead>
            <TableHead>Rival</TableHead>
            <TableHead className="w-20 text-center">Marcador</TableHead>
            <TableHead className="hidden md:table-cell">Torneo</TableHead>
            <TableHead className="w-10 text-center">
              <MessageSquareIcon className="mx-auto size-3.5" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell className="text-muted-foreground">
                <Link
                  href={`/matches/${match.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {formatDate(match.played_at)}
                </Link>
              </TableCell>
              <TableCell className="text-center">
                <ResultBadge result={match.result} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{match.deck_name ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {match.version_label ?? `V${match.version_number ?? "?"}`}
                    {match.own_legend_name
                      ? ` · ${match.own_legend_name}`
                      : ""}
                  </span>
                </div>
              </TableCell>
              <TableCell className="flex items-center gap-2">
                {match.opponent_legend_id && legendById?.get(match.opponent_legend_id) ? (
                  <>
                    <LegendAvatar
                      legend={legendById.get(match.opponent_legend_id)!}
                      size="lg"
                    />
                    <Badge variant="outline">
                      {match.opponent_legend_name}
                    </Badge>
                  </>
                ) : match.opponent_legend_name ? (
                  <Badge variant="outline">
                    {match.opponent_legend_name}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Sin identificar
                  </span>
                )}
              </TableCell>
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {formatScore(match.game_wins, match.game_losses, match.game_draws)}
              </TableCell>
              <TableCell className="hidden max-w-48 truncate md:table-cell">
                {match.event_name ? (
                  <Link
                    href={`/events/${match.event_id}`}
                    className="text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {match.event_name}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {match.note_content ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                    title={
                      match.note_category
                        ? `${noteCategoryLabel(match.note_category)}: ${match.note_content}`
                        : match.note_content
                    }
                  >
                    <MessageSquareIcon className="size-3" />
                    {match.note_content.length > 38
                      ? `${match.note_content.slice(0, 38)}…`
                      : match.note_content}
                  </span>
                ) : match.note_count > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {match.note_count}
                  </span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

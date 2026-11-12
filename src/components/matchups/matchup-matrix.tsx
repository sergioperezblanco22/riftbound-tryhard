"use client";

import { useMemo, useState } from "react";
import { TriangleAlertIcon } from "lucide-react";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MIN_SAMPLE_SIZE, type LegendRow, type MatchupCell } from "@/lib/db/types";
import { formatWinrate, winrateColor } from "@/lib/format";

interface MatrixRow {
  key: string;
  label: string;
  deckName: string;
  cells: Map<string, MatchupCell>;
}

export function MatchupMatrix({
  cells,
  legends,
}: {
  cells: MatchupCell[];
  legends: LegendRow[];
}) {
  const [onlySolid, setOnlySolid] = useState(false);

  const rows = useMemo<MatrixRow[]>(() => {
    const map = new Map<string, MatrixRow>();
    for (const cell of cells) {
      const key = cell.deck_version_id;
      const existing = map.get(key) ?? {
        key,
        label: `${cell.deck_name} · ${cell.version_label ?? `V${cell.version_number}`}`,
        deckName: cell.deck_name,
        cells: new Map<string, MatchupCell>(),
      };
      existing.cells.set(cell.opponent_legend_id, cell);
      map.set(key, existing);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [cells]);

  // Solo leyendas rivales que aparecen en los datos.
  const columns = useMemo(() => {
    const used = new Set(cells.map((cell) => cell.opponent_legend_id));
    return legends.filter((legend) => used.has(legend.id));
  }, [cells, legends]);

  if (rows.length === 0 || columns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No hay datos de matchup con los filtros actuales. Recuerda que solo se
        cuentan las partidas con leyenda rival identificada.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Switch
          id="only-solid"
          checked={onlySolid}
          onCheckedChange={setOnlySolid}
        />
        <Label htmlFor="only-solid" className="text-sm">
          Resaltar solo muestras ≥ {MIN_SAMPLE_SIZE}
        </Label>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Versión / Rival
              </th>
              {columns.map((legend) => (
                <th
                  key={legend.id}
                  title={legend.name}
                  className="border-b px-1.5 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {legend.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <th className="sticky left-0 z-10 max-w-56 border-r bg-card px-3 py-2 text-left font-medium whitespace-nowrap">
                  {row.label}
                </th>
                {columns.map((legend) => {
                  const cell = row.cells.get(legend.id);
                  if (!cell) {
                    return (
                      <td
                        key={legend.id}
                        className="px-1.5 py-1.5 text-center text-xs text-muted-foreground/40"
                      >
                        ·
                      </td>
                    );
                  }
                  const lowSample = cell.matches < MIN_SAMPLE_SIZE;
                  const dimmed = onlySolid && lowSample;
                  return (
                    <td key={legend.id} className="px-1 py-1">
                      <Popover>
                        <PopoverTrigger
                          render={
                            <button
                              type="button"
                              className={cn(
                                "flex h-10 w-full min-w-14 flex-col items-center justify-center rounded-md text-xs transition-opacity hover:opacity-80",
                                winrateColor(cell.winrate),
                                dimmed && "opacity-25"
                              )}
                            >
                              <span className="font-semibold tabular-nums">
                                {formatWinrate(cell.winrate)}
                              </span>
                              <span className="text-[0.65rem] opacity-70">
                                n={cell.matches}
                              </span>
                            </button>
                          }
                        />
                        <PopoverContent align="center">
                          <PopoverHeader>
                            <PopoverTitle>
                              {row.label} vs {legend.name}
                            </PopoverTitle>
                            <PopoverDescription>
                              Balance {cell.wins}-{cell.losses}
                              {cell.draws ? `-${cell.draws}` : ""} ·{" "}
                              {cell.matches}{" "}
                              {cell.matches === 1 ? "partida" : "partidas"}
                            </PopoverDescription>
                          </PopoverHeader>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Winrate</span>
                            <span className="text-sm font-semibold">
                              {formatWinrate(cell.winrate)}
                            </span>
                          </div>
                          {lowSample ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300"
                            >
                              <TriangleAlertIcon />
                              Muestra pequeña: interpreta con cautela
                            </Badge>
                          ) : null}
                          <Button
                            variant="outline"
                            size="xs"
                            render={
                              <a
                                href={`/matches?version=${cell.deck_version_id}&legend=${cell.opponent_legend_id}`}
                              />
                            }
                          >
                            Ver partidas
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-emerald-500/60" /> ≥ 55%
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-amber-500/40" /> 45–55%
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-rose-500/50" /> &lt; 45%
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-muted" /> sin partidas decisivas
        </span>
      </div>
    </div>
  );
}

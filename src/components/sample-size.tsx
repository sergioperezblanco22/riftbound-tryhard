import { TriangleAlertIcon } from "lucide-react";

import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { MIN_SAMPLE_SIZE } from "@/lib/db/types";

/**
 * Regla 5.6: toda cifra estadistica debe mostrar su tamano de muestra y avisar
 * cuando la muestra es pequena (< 5 partidas) para no sobreinterpretar datos.
 */
export function SampleSize({
  count,
  className,
  warnBelow = MIN_SAMPLE_SIZE,
}: {
  count: number;
  className?: string;
  warnBelow?: number;
}) {
  const isLow = count < warnBelow;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className
      )}
    >
      {isLow ? (
        <Badge
          variant="outline"
          className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300"
        >
          <TriangleAlertIcon />
          Muestra pequeña
        </Badge>
      ) : null}
      <span className="tabular-nums">
        n = {count} {count === 1 ? "partida" : "partidas"}
      </span>
    </span>
  );
}

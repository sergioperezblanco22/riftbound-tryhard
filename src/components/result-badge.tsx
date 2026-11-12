import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { MatchResult } from "@/lib/db/types";

const VARIANTS: Record<MatchResult, { label: string; className: string }> = {
  win: {
    label: "V",
    className:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  loss: {
    label: "D",
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  draw: {
    label: "E",
    className:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  bye: {
    label: "B",
    className: "bg-muted text-muted-foreground border-border",
  },
  void: {
    label: "A",
    className: "bg-muted text-muted-foreground border-border line-through",
  },
};

export function ResultBadge({
  result,
  withLabel = false,
  className,
}: {
  result: MatchResult;
  withLabel?: boolean;
  className?: string;
}) {
  const config = VARIANTS[result] ?? VARIANTS.void;
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", config.className, className)}
      title={
        result === "bye"
          ? "Bye: excluida de las estadísticas"
          : result === "void"
            ? "Anulada: excluida de las estadísticas"
            : undefined
      }
    >
      {withLabel ? config.label : config.label}
    </Badge>
  );
}

export function resultVariantClass(result: MatchResult): string {
  return (VARIANTS[result] ?? VARIANTS.void).className;
}

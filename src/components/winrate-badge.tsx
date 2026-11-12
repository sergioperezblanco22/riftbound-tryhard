import { cn } from "cn";
import { formatWinrate } from "@/lib/format";

function toneFor(value: number | null): string {
  if (value === null) return "text-muted-foreground";
  if (value >= 55) return "text-emerald-600 dark:text-emerald-400";
  if (value >= 45) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/**
 * Muestra un winrate. Un valor nulo (denominador 0) se renderiza como "—",
 * nunca como 0%.
 */
export function WinrateBadge({
  value,
  className,
  showDash = true,
}: {
  value: number | null | undefined;
  className?: string;
  showDash?: boolean;
}) {
  const normalized = value ?? null;
  if (normalized === null && !showDash) return null;

  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        toneFor(normalized),
        className
      )}
      title={normalized === null ? "Sin partidas decisivas (0 victorias + 0 derrotas)" : undefined}
    >
      {formatWinrate(normalized)}
    </span>
  );
}

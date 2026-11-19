"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LegendRow } from "@/lib/db/types";

export function LegendAvatar({
  legend,
  size = "default",
}: {
  legend: LegendRow | { name: string; image_url: string | null };
  size?: "default" | "sm" | "lg";
}) {
  const initials = legend.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar size={size}>
      {legend.image_url ? (
        <AvatarImage src={legend.image_url} alt={legend.name} />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </Avatar>
  );
}

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LegendRow } from "@/lib/db/types";

export function LegendAvatar({
  legend,
  size = "default",
}: {
  legend: LegendRow | { name: string; image_url: string | null };
  size?: "default" | "sm" | "lg" | "xl";
}) {
  const initials = legend.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeMap: Record<string, string> = {
    default: "size-8",
    sm: "size-6",
    lg: "size-12",
    xl: "size-24",
  };

  return (
    <Avatar className={sizeMap[size] ?? sizeMap.default}>
      {legend.image_url ? (
        <AvatarImage
          src={legend.image_url}
          alt={legend.name}
          className="object-cover"
        />
      ) : (
        <AvatarFallback className="text-[0.55rem]">
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

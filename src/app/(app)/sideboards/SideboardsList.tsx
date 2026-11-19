"use client";

import Link from "next/link";
import { BookOpenIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { LegendAvatar } from "@/components/ui/legend-avatar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LegendRow } from "@/lib/db/types";

interface SideboardsListProps {
  legends: LegendRow[];
}

export default function SideboardsList({
  legends,
}: SideboardsListProps) {
  const [search, setSearch] = useState("");

  const filtered = legends.filter((legend) =>
    legend.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2">
        <Input
          id="sideboards-search"
          placeholder="Buscar leyenda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-muted-foreground">
            No se encontraron leyendas que coincidan con "{search}".
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((legend) => (
            <Card
              key={legend.id}
              className="cursor-pointer group hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <CardTitle className="text-center text-sm font-medium">
                  {legend.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2 p-3">
                <Link
                  href={`/sideboards/${legend.id}`}
                  className="flex flex-col items-center gap-1"
                >
                  <LegendAvatar
                    legend={{
                      ...legend,
                      image_url: legend.image_url ?? null,
                    }}
                    size="lg"
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {legend.title ?? legend.name}
                  </span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

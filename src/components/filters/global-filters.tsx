"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { FilterXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterOptions, MatchFilters } from "@/lib/db/types";
import { legendLabel } from "@/lib/format";

const ALL = "__all__";

interface Option {
  value: string;
  label: string;
}

function FilterSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string | null | undefined;
  options: Option[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const items = useMemo(
    () => [{ value: ALL, label: placeholder }, ...options],
    [options, placeholder]
  );

  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        items={items}
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? null : (next as string))}
      >
        <SelectTrigger id={id} className="w-full" disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function GlobalFilters({
  options,
  active,
  className,
}: {
  options: FilterOptions;
  active: MatchFilters;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams]
  );

  const selectedDeck = active.deck_id ?? null;

  const versionOptions = useMemo<Option[]>(() => {
    const decks = selectedDeck
      ? options.decks.filter((deck) => deck.id === selectedDeck)
      : options.decks;
    return decks.flatMap((deck) =>
      deck.versions.map((version) => ({
        value: version.id,
        label:
          deck.versions.length > 1 || options.decks.length > 1
            ? `${deck.name} · ${version.label}`
            : version.label,
      }))
    );
  }, [options.decks, selectedDeck]);

  const activeCount = Object.values(active).filter(Boolean).length;

  return (
    <div
      className={`rounded-xl border bg-card p-4 ${className ?? ""}`}
      data-pending={pending ? "true" : undefined}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <FilterSelect
          id="filter-set"
          label="Set"
          placeholder="Todos los sets"
          value={active.set_id}
          options={options.sets.map((s) => ({
            value: s.id,
            label: `${s.code} · ${s.name}`,
          }))}
          onChange={(value) => update({ set: value })}
        />
        <FilterSelect
          id="filter-deck"
          label="Mazo"
          placeholder="Todos los mazos"
          value={active.deck_id}
          options={options.decks.map((d) => ({ value: d.id, label: d.name }))}
          onChange={(value) =>
            update({ deck: value, version: null })
          }
        />
        <FilterSelect
          id="filter-version"
          label="Versión"
          placeholder="Todas las versiones"
          value={active.deck_version_id}
          options={versionOptions}
          onChange={(value) => update({ version: value })}
          disabled={versionOptions.length === 0}
        />
        <FilterSelect
          id="filter-event"
          label="Torneo"
          placeholder="Todos los torneos"
          value={active.event_id}
          options={options.events.map((e) => ({ value: e.id, label: e.name }))}
          onChange={(value) => update({ event: value })}
        />
        <FilterSelect
          id="filter-legend"
          label="Leyenda rival"
          placeholder="Todas las leyendas"
          value={active.opponent_legend_id}
          options={options.legends.map((l) => ({
            value: l.id,
            label: legendLabel(l),
          }))}
          onChange={(value) => update({ legend: value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label
              htmlFor="filter-from"
              className="mb-1.5 text-xs text-muted-foreground"
            >
              Desde
            </Label>
            <Input
              id="filter-from"
              type="date"
              className="h-8"
              defaultValue={active.from ? active.from.slice(0, 10) : ""}
              onChange={(event) =>
                update({ from: event.target.value || null })
              }
            />
          </div>
          <div>
            <Label
              htmlFor="filter-to"
              className="mb-1.5 text-xs text-muted-foreground"
            >
              Hasta
            </Label>
            <Input
              id="filter-to"
              type="date"
              className="h-8"
              defaultValue={active.to ? active.to.slice(0, 10) : ""}
              onChange={(event) => update({ to: event.target.value || null })}
            />
          </div>
        </div>
      </div>

      {activeCount > 0 ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {activeCount}{" "}
            {activeCount === 1 ? "filtro activo" : "filtros activos"}
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              update({
                set: null,
                deck: null,
                version: null,
                event: null,
                legend: null,
                from: null,
                to: null,
              })
            }
          >
            <FilterXIcon />
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}

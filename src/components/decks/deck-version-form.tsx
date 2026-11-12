"use client";

import { useActionState, useState } from "react";
import { Loader2Icon, GitBranchPlusIcon } from "lucide-react";

import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDeckVersionAction, type ActionState } from "@/lib/db/actions";
import type { LegendRow } from "@/lib/db/types";
import { legendLabel } from "@/lib/format";

const INITIAL: ActionState = { ok: false };

export function DeckVersionForm({
  deckId,
  legends,
  nextVersion,
  defaultLegendId,
}: {
  deckId: string;
  legends: LegendRow[];
  nextVersion: number;
  defaultLegendId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createDeckVersionAction,
    INITIAL
  );
  const [legendId, setLegendId] = useState<string | null>(
    defaultLegendId ?? null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="deck_id" value={deckId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="version-label" className="mb-1.5">
            Etiqueta de la versión
          </Label>
          <Input
            id="version-label"
            name="label"
            placeholder={`V${nextVersion}`}
          />
        </div>
        <SelectField
          id="version-legend"
          name="legend_id"
          label="Leyenda"
          placeholder="Sin leyenda"
          emptyLabel="Sin leyenda"
          value={legendId}
          onValueChange={setLegendId}
          options={legends.map((legend) => ({
            value: legend.id,
            label: legendLabel(legend),
          }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="version-champion" className="mb-1.5">
            Campeón (opcional)
          </Label>
          <Input id="version-champion" name="champion_name" />
        </div>
        <div>
          <Label htmlFor="version-notes" className="mb-1.5">
            Notas del cambio (opcional)
          </Label>
          <Input
            id="version-notes"
            name="notes"
            placeholder="Qué cambiaste respecto a la versión anterior"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="version-decklist" className="mb-1.5">
          Decklist (opcional)
        </Label>
        <Textarea id="version-decklist" name="decklist" rows={4} />
      </div>

      <p className="text-xs text-muted-foreground">
        Las versiones son instantáneas inmutables: las partidas ya registradas
        conservan la versión con la que se jugaron.
      </p>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <GitBranchPlusIcon />
          )}
          Crear versión V{nextVersion}
        </Button>
      </div>
    </form>
  );
}

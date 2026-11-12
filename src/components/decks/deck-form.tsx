"use client";

import { useActionState, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";

import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDeckAction, type ActionState } from "@/lib/db/actions";
import type { LegendRow } from "@/lib/db/types";
import { legendLabel } from "@/lib/format";

const INITIAL: ActionState = { ok: false };

export function DeckForm({ legends }: { legends: LegendRow[] }) {
  const [state, formAction, pending] = useActionState(
    createDeckAction,
    INITIAL
  );
  const [legendId, setLegendId] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="deck-name" className="mb-1.5">
            Nombre del mazo
          </Label>
          <Input
            id="deck-name"
            name="name"
            required
            placeholder="Ej. Ahri Control"
          />
        </div>
        <SelectField
          id="deck-legend"
          name="legend_id"
          label="Leyenda principal"
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
          <Label htmlFor="deck-champion" className="mb-1.5">
            Campeón (opcional)
          </Label>
          <Input
            id="deck-champion"
            name="champion_name"
            placeholder="Ej. Ahri"
          />
        </div>
        <div>
          <Label htmlFor="deck-description" className="mb-1.5">
            Descripción (opcional)
          </Label>
          <Input
            id="deck-description"
            name="description"
            placeholder="Plan de juego, notas generales..."
          />
        </div>
      </div>

      <div>
        <Label htmlFor="deck-decklist" className="mb-1.5">
          Decklist inicial (opcional)
        </Label>
        <Textarea
          id="deck-decklist"
          name="decklist"
          rows={4}
          placeholder="Pega aquí la lista de cartas (texto libre en el MVP)."
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
          Crear mazo
        </Button>
      </div>
    </form>
  );
}

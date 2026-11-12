"use client";

import { useActionState, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";

import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEventAction, type ActionState } from "@/lib/db/actions";
import type { SetRow } from "@/lib/db/types";
import { isoToLocalInput } from "@/lib/validation";

const INITIAL: ActionState = { ok: false };

const EVENT_TYPES = [
  { value: "locals", label: "Local" },
  { value: "regional", label: "Regional" },
  { value: "national", label: "Nacional" },
  { value: "testing", label: "Testing" },
  { value: "online", label: "Online" },
];

export function EventForm({ sets }: { sets: SetRow[] }) {
  const [state, formAction, pending] = useActionState(
    createEventAction,
    INITIAL
  );
  const [setId, setSetId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string | null>("locals");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="event-name" className="mb-1.5">
            Nombre del torneo
          </Label>
          <Input
            id="event-name"
            name="name"
            required
            placeholder="Ej. Local Semanal #15"
          />
        </div>
        <SelectField
          id="event-type"
          name="event_type"
          label="Tipo"
          placeholder="Local"
          emptyLabel="Sin tipo"
          value={eventType}
          onValueChange={setEventType}
          options={EVENT_TYPES}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="event-start" className="mb-1.5">
            Inicio
          </Label>
          <Input
            id="event-start"
            name="start_date"
            type="datetime-local"
            required
            defaultValue={isoToLocalInput(null)}
          />
        </div>
        <div>
          <Label htmlFor="event-end" className="mb-1.5">
            Fin (opcional)
          </Label>
          <Input id="event-end" name="end_date" type="datetime-local" />
        </div>
        <SelectField
          id="event-set"
          name="set_focus_id"
          label="Set"
          placeholder="Sin set"
          emptyLabel="Sin set"
          value={setId}
          onValueChange={setSetId}
          options={sets.map((set) => ({
            value: set.id,
            label: `${set.code} · ${set.name}`,
          }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="event-location" className="mb-1.5">
            Ubicación (opcional)
          </Label>
          <Input id="event-location" name="location" />
        </div>
        <div>
          <Label htmlFor="event-url" className="mb-1.5">
            Enlace (opcional)
          </Label>
          <Input id="event-url" name="external_url" type="url" />
        </div>
      </div>

      <div>
        <Label htmlFor="event-notes" className="mb-1.5">
          Notas (opcional)
        </Label>
        <Textarea id="event-notes" name="notes" rows={2} />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
          Crear torneo
        </Button>
      </div>
    </form>
  );
}

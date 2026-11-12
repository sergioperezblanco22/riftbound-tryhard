"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createNoteAction, type ActionState } from "@/lib/db/actions";
import { NOTE_CATEGORIES, type NoteCategory } from "@/lib/db/types";

const INITIAL: ActionState = { ok: false };

export function NoteForm({ matchId }: { matchId: string }) {
  const [state, formAction, pending] = useActionState(
    createNoteAction,
    INITIAL
  );
  const [category, setCategory] = useState<NoteCategory>("otros");
  const formRef = useRef<HTMLFormElement>(null);

  const categories = NOTE_CATEGORIES;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="match_id" value={matchId} />

      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div>
          <Label htmlFor="note-category" className="mb-1.5">
            Categoría
          </Label>
          <Select
            name="category"
            items={categories.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            value={category}
            onValueChange={(value) => setCategory(value as NoteCategory)}
          >
            <SelectTrigger id="note-category" className="w-full">
              <SelectValue placeholder="Otros" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="note-content" className="mb-1.5">
            Nota
          </Label>
          <Textarea
            id="note-content"
            name="content"
            rows={2}
            required
            placeholder="Ej. Mulligan demasiado codicioso, debería haber aceptado la mano inicial."
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="note-tags" className="mb-1.5">
            Etiquetas (separadas por comas)
          </Label>
          <input
            id="note-tags"
            name="tags"
            placeholder="mulligan, tempo"
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
          Añadir nota
        </Button>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMatchSideboardChangeAction,
} from "@/lib/db/actions";

export function SideboardForm({
  matchId,
}: {
  matchId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createMatchSideboardChangeAction,
    { ok: false }
  );
  const [gameNumber, setGameNumber] = useState<string>("1");
  const [cardsOut, setCardsOut] = useState("");
  const [cardsIn, setCardsIn] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="match_id" value={matchId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="sideboard-game-number" className="mb-1.5">
            Tras juego
          </Label>
          <Input
            id="sideboard-game-number"
            name="game_number"
            type="number"
            min={1}
            max={3}
            value={gameNumber}
            onChange={(e) => setGameNumber(e.target.value)}
          />
        </div>
        <div className="col-span-full sm:col-span-2">
          <Label htmlFor="sideboard-cards-out" className="mb-1.5">
            Cartas que salen
          </Label>
          <Input
            id="sideboard-cards-out"
            name="cards_out"
            placeholder="Ej. 2x Eliminar, 1x Recuperar"
            value={cardsOut}
            onChange={(e) => setCardsOut(e.target.value)}
          />
        </div>
        <div className="col-span-full sm:col-span-2">
          <Label htmlFor="sideboard-cards-in" className="mb-1.5">
            Cartas que entran
          </Label>
          <Input
            id="sideboard-cards-in"
            name="cards_in"
            placeholder="Ej. 2x Contrahechizo, 1x Amenaza"
            value={cardsIn}
            onChange={(e) => setCardsIn(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <MinusIcon className="animate-spin" size={4} />
        ) : (
          <PlusIcon className="size-4" />
        )}
        Guardar cambio
      </Button>

      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900">
          Cambio de sideboard guardado.
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { useEffect } from "react";
import { ArrowLeftIcon, BookOpenIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/confirm-button";
import {
  createMatchupSideboardNoteAction,
  deleteMatchupSideboardNoteAction,
  updateMatchupSideboardNoteAction,
} from "@/lib/db/actions";
import { getMatchupSideboardNote } from "@/lib/db/queries";
import type { MatchupSideboardNoteRow } from "@/lib/db/types";

interface SideboardNoteFormProps {
  myLegendId: string;
  rivalLegendId: string;
  myLegendName: string;
  rivalLegendName: string;
  initialNote: MatchupSideboardNoteRow | null;
}

export default function SideboardNoteForm({
  myLegendId,
  rivalLegendId,
  myLegendName,
  rivalLegendName,
  initialNote,
}: SideboardNoteFormProps) {
  const [state, formAction, pending] = useActionState(
    initialNote ? updateMatchupSideboardNoteAction : createMatchupSideboardNoteAction,
    { ok: false }
  );
  const [editing, setEditing] = useState<boolean>(!!initialNote);
  const [title, setTitle] = useState(initialNote?.title ?? "");
  const [myKeyCards, setMyKeyCards] = useState(initialNote?.my_key_cards ?? "");
  const [rivalKeyCards, setRivalKeyCards] = useState(initialNote?.rival_key_cards ?? "");
  const [myCardsOut, setMyCardsOut] = useState(initialNote?.my_cards_out ?? "");
  const [myCardsIn, setMyCardsIn] = useState(initialNote?.my_cards_in ?? "");
  const [notes, setNotes] = useState(initialNote?.notes ?? "");

  const hasNote = !!initialNote;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">
              {myLegendName} vs {rivalLegendName}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasNote ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  disabled={pending}
                >
                  <PencilIcon className="size-4" />
                  Editar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  disabled={pending}
                >
                  <BookOpenIcon className="size-4" />
                  Anadir nota
                </Button>
              )}
              {hasNote && (
                <form action={deleteMatchupSideboardNoteAction}>
                  <input type="hidden" name="id" value={initialNote!.id} />
                  <ConfirmButton
                    variant="destructive"
                    size="sm"
                    message="¿Eliminar esta nota de sideboard?"
                  >
                    <Trash2Icon className="size-4" />
                  </ConfirmButton>
                </form>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {initialNote?.my_key_cards && (
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Cartas clave tuyas
                  </p>
                  <p className="text-sm">{initialNote.my_key_cards}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Cartas clave del rival
                  </p>
                  <p className="text-sm">{initialNote.rival_key_cards}</p>
                </div>
              </div>
            )}
            {initialNote?.my_cards_out && (
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Cartas que quito (sideboard out)
                  </p>
                  <p className="text-sm">{initialNote.my_cards_out}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Cartas que añado (sideboard in)
                  </p>
                  <p className="text-sm">{initialNote.my_cards_in}</p>
                </div>
              </div>
            )}
            {initialNote?.notes && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Notas
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {initialNote.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>
                {hasNote ? "Editar nota" : "Nueva nota de sideboard"}
              </CardTitle>
              <CardDescription>
                Anota las cartas clave y consejos para este matchup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="my_legend_id" value={myLegendId} />
                <input
                  type="hidden"
                  name="rival_legend_id"
                  value={rivalLegendId}
                />
                {hasNote && <input type="hidden" name="id" value={initialNote!.id} />}

                <div>
                  <Label htmlFor="title">Titulo</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Riven vs Kai'Sa - Sideboard"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="my_key_cards">Cartas clave tuyas</Label>
                    <Textarea
                      id="my_key_cards"
                      name="my_key_cards"
                      defaultValue={myKeyCards}
                      onChange={(e) => setMyKeyCards(e.target.value)}
                      rows={3}
                      placeholder="Ej. 2x Eliminar, 1x Recuperar..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="rival_key_cards">Cartas clave del rival</Label>
                    <Textarea
                      id="rival_key_cards"
                      name="rival_key_cards"
                      defaultValue={rivalKeyCards}
                      onChange={(e) => setRivalKeyCards(e.target.value)}
                      rows={3}
                      placeholder="Ej. 2x Contrahechizo, 1x Amenaza..."
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="my_cards_out">Cartas que quito</Label>
                    <Textarea
                      id="my_cards_out"
                      name="my_cards_out"
                      defaultValue={myCardsOut}
                      onChange={(e) => setMyCardsOut(e.target.value)}
                      rows={3}
                      placeholder="Cartas que sacas del mazo..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="my_cards_in">Cartas que añado</Label>
                    <Textarea
                      id="my_cards_in"
                      name="my_cards_in"
                      defaultValue={myCardsIn}
                      onChange={(e) => setMyCardsIn(e.target.value)}
                      rows={3}
                      placeholder="Cartas que metes en el mazo..."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notas y cosas a tener en cuenta</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Plan de juego, errores comunes, etc..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <BookOpenIcon className="animate-spin size-4" />
                    ) : (
                      <BookOpenIcon className="size-4" />
                    )}
                    {hasNote ? "Guardar cambios" : "Guardar nota"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={pending}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.ok && !hasNote && (
        <Alert>
          <AlertTitle>Guardado</AlertTitle>
          <AlertDescription>
            La nota de sideboard se ha guardado correctamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

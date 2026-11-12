"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2Icon, SaveIcon } from "lucide-react";

import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createMatchAction,
  updateMatchAction,
  type ActionState,
} from "@/lib/db/actions";
import {
  MATCH_RESULTS,
  NOTE_CATEGORIES,
  type FilterOptions,
  type MatchEnrichedRow,
  type MatchResult,
  type NoteCategory,
} from "@/lib/db/types";
import { legendLabel } from "@/lib/format";
import { isoToLocalInput } from "@/lib/validation";

const INITIAL: ActionState = { ok: false };

const RESULT_STYLES: Record<MatchResult, string> = {
  win: "data-[active=true]:bg-emerald-500 data-[active=true]:text-white data-[active=true]:border-emerald-500",
  loss: "data-[active=true]:bg-rose-500 data-[active=true]:text-white data-[active=true]:border-rose-500",
  draw: "data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
  bye: "data-[active=true]:bg-muted-foreground data-[active=true]:text-background data-[active=true]:border-muted-foreground",
  void: "data-[active=true]:bg-muted-foreground data-[active=true]:text-background data-[active=true]:border-muted-foreground",
};

export function MatchForm({
  options,
  match,
}: {
  options: FilterOptions;
  match?: MatchEnrichedRow;
}) {
  const isEdit = Boolean(match);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateMatchAction : createMatchAction,
    INITIAL
  );

  const versionOptions = useMemo(
    () =>
      options.decks.flatMap((deck) =>
        deck.versions.map((version) => ({
          value: version.id,
          label: `${deck.name} · ${version.label}`,
        }))
      ),
    [options.decks]
  );

  const [result, setResult] = useState<MatchResult>(match?.result ?? "win");
  const [deckVersionId, setDeckVersionId] = useState<string | null>(
    match?.deck_version_id ?? null
  );
  const [opponentLegendId, setOpponentLegendId] = useState<string | null>(
    match?.opponent_legend_id ?? null
  );
  const [eventId, setEventId] = useState<string | null>(match?.event_id ?? null);
  const [setId, setSetId] = useState<string | null>(match?.event_set_id ?? null);
  const [noteCategory, setNoteCategory] = useState<NoteCategory>("otros");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {match ? <input type="hidden" name="id" value={match.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="played_at" className="mb-1.5">
            Fecha y hora
          </Label>
          <Input
            id="played_at"
            name="played_at"
            type="datetime-local"
            required
            defaultValue={isoToLocalInput(match?.played_at)}
          />
        </div>

        <SelectField
          id="deck_version_id"
          name="deck_version_id"
          label="Mazo y versión"
          placeholder="Selecciona mazo y versión"
          value={deckVersionId}
          onValueChange={setDeckVersionId}
          options={versionOptions}
        />
      </div>

      <div>
        <Label className="mb-1.5">Resultado</Label>
        <input type="hidden" name="result" value={result} />
        <div className="flex flex-wrap gap-2">
          {MATCH_RESULTS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              data-active={result === option.value}
              className={RESULT_STYLES[option.value]}
              onClick={() => setResult(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {result === "bye" || result === "void" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {result === "bye"
              ? "Los byes se registran pero se excluyen de todas las estadísticas."
              : "Las partidas anuladas se excluyen de todas las estadísticas."}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="game_wins" className="mb-1.5">
            Juegos ganados
          </Label>
          <Input
            id="game_wins"
            name="game_wins"
            type="number"
            min={0}
            max={9}
            defaultValue={match?.game_wins ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="game_losses" className="mb-1.5">
            Juegos perdidos
          </Label>
          <Input
            id="game_losses"
            name="game_losses"
            type="number"
            min={0}
            max={9}
            defaultValue={match?.game_losses ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="game_draws" className="mb-1.5">
            Juegos empatados
          </Label>
          <Input
            id="game_draws"
            name="game_draws"
            type="number"
            min={0}
            max={9}
            defaultValue={match?.game_draws ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="opponent_legend_id"
          name="opponent_legend_id"
          label="Leyenda rival"
          placeholder="Sin identificar"
          emptyLabel="Sin identificar"
          value={opponentLegendId}
          onValueChange={setOpponentLegendId}
          options={options.legends.map((legend) => ({
            value: legend.id,
            label: legendLabel(legend),
          }))}
        />
        <div>
          <Label htmlFor="opponent_archetype" className="mb-1.5">
            Arquetipo rival (opcional)
          </Label>
          <Input
            id="opponent_archetype"
            name="opponent_archetype"
            placeholder="Ej. Aggro, Control..."
            defaultValue={match?.opponent_archetype ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          id="event_id"
          name="event_id"
          label="Torneo"
          placeholder="Partida suelta"
          emptyLabel="Partida suelta"
          value={eventId}
          onValueChange={setEventId}
          options={options.events.map((event) => ({
            value: event.id,
            label: event.name,
          }))}
        />
        <SelectField
          id="event_set_id"
          name="event_set_id"
          label="Set"
          placeholder="Sin set"
          emptyLabel="Sin set"
          value={setId}
          onValueChange={setSetId}
          options={options.sets.map((set) => ({
            value: set.id,
            label: `${set.code} · ${set.name}`,
          }))}
        />
        <div>
          <Label htmlFor="round_number" className="mb-1.5">
            Ronda
          </Label>
          <Input
            id="round_number"
            name="round_number"
            type="number"
            min={1}
            defaultValue={match?.round_number ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="opponent_player_label" className="mb-1.5">
            Rival (etiqueta, opcional)
          </Label>
          <Input
            id="opponent_player_label"
            name="opponent_player_label"
            placeholder="Nombre o alias"
            defaultValue={match?.opponent_player_label ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="format_code" className="mb-1.5">
            Formato
          </Label>
          <Input
            id="format_code"
            name="format_code"
            defaultValue={match?.format_code ?? "1v1"}
          />
        </div>
      </div>

      {!isEdit ? (
        <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-[1fr_200px]">
          <div>
            <Label htmlFor="note_content" className="mb-1.5">
              Nota rápida (opcional)
            </Label>
            <Textarea
              id="note_content"
              name="note_content"
              rows={2}
              placeholder="¿Qué aprendiste de esta partida?"
            />
          </div>
          <SelectField
            id="note_category"
            name="note_category"
            label="Categoría"
            placeholder="Otros"
            emptyLabel="Otros"
            value={noteCategory}
            onValueChange={(value) =>
              setNoteCategory((value as NoteCategory) ?? "otros")
            }
            options={NOTE_CATEGORIES.map((category) => ({
              value: category.value,
              label: category.label,
            }))}
          />
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {isEdit ? "Guardar cambios" : "Registrar partida"}
        </Button>
      </div>
    </form>
  );
}

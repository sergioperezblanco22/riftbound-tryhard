import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  TrophyIcon,
} from "lucide-react";

import { ConfirmButton } from "@/components/confirm-button";
import { NoteForm } from "@/components/matches/note-form";
import { PageHeader } from "@/components/page-header";
import { ResultBadge } from "@/components/result-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { deleteMatchAction, deleteNoteAction } from "@/lib/db/actions";
import { getMatchDetail } from "@/lib/db/queries";
import {
  formatDateTime,
  formatScore,
  noteCategoryLabel,
  resultLabel,
} from "@/lib/format";

export const metadata = { title: "Detalle de partida" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default async function MatchDetailPage({
  params,
}: PageProps<"/matches/[id]">) {
  const { id } = await params;
  const detail = await getMatchDetail(id);
  if (!detail) notFound();

  const { match, games, notes } = detail;
  const opponent = match.opponent_legend_name ?? "Rival sin identificar";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Partida vs ${opponent}`}
        description={formatDateTime(match.played_at)}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/matches" />}
            >
              <ArrowLeftIcon />
              Volver
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/matches/${match.id}/edit`} />}
            >
              <PencilIcon />
              Editar
            </Button>
            <form action={deleteMatchAction}>
              <input type="hidden" name="id" value={match.id} />
              <ConfirmButton
                variant="destructive"
                size="sm"
                message="¿Eliminar esta partida y todas sus notas?"
              >
                <Trash2Icon />
                Eliminar
              </ConfirmButton>
            </form>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ResultBadge result={match.result} />
        <Badge variant="secondary">{resultLabel(match.result)}</Badge>
        {match.result === "bye" || match.result === "void" ? (
          <Badge variant="outline" className="text-muted-foreground">
            Excluida de las estadísticas
          </Badge>
        ) : null}
        {match.set_code ? (
          <Badge variant="outline">
            {match.set_code} · {match.set_name}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
            <CardDescription>Información registrada de la partida.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field
                label="Mazo"
                value={
                  match.deck_id ? (
                    <Link
                      href={`/decks/${match.deck_id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {match.deck_name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Field
                label="Versión"
                value={match.version_label ?? `V${match.version_number ?? "?"}`}
              />
              <Field label="Mi leyenda" value={match.own_legend_name ?? "—"} />
              <Field label="Leyenda rival" value={opponent} />
              <Field
                label="Marcador de juegos"
                value={formatScore(
                  match.game_wins,
                  match.game_losses,
                  match.game_draws
                )}
              />
              <Field
                label="Torneo"
                value={
                  match.event_id ? (
                    <Link
                      href={`/events/${match.event_id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {match.event_name}
                    </Link>
                  ) : (
                    "Partida suelta"
                  )
                }
              />
              <Field label="Ronda" value={match.round_number ?? "—"} />
              <Field
                label="Arquetipo rival"
                value={match.opponent_archetype ?? "—"}
              />
              <Field
                label="Rival"
                value={match.opponent_player_label ?? "—"}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="size-4" />
              Juegos
            </CardTitle>
            <CardDescription>
              {games.length > 0
                ? "Detalle juego a juego."
                : "No se registró el detalle por juego."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {games.length > 0 ? (
              <ul className="space-y-2">
                {games.map((game) => (
                  <li
                    key={game.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      Juego {game.game_number}
                    </span>
                    <span className="flex items-center gap-2">
                      {game.went_first !== null ? (
                        <span className="text-xs text-muted-foreground">
                          {game.went_first ? "Salió primero" : "Salió segundo"}
                        </span>
                      ) : null}
                      <ResultBadge result={game.result} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Registra el resultado global de la partida; el detalle por juego
                es opcional en el MVP.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anotaciones</CardTitle>
          <CardDescription>
            Errores, decisiones y planes para aprender de cada partida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <NoteForm matchId={match.id} />

          {notes.length > 0 ? (
            <>
              <Separator />
              <ul className="space-y-3">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {noteCategoryLabel(note.category)}
                        </Badge>
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                    <form action={deleteNoteAction}>
                      <input type="hidden" name="id" value={note.id} />
                      <input
                        type="hidden"
                        name="match_id"
                        value={match.id}
                      />
                      <ConfirmButton
                        variant="ghost"
                        size="icon-sm"
                        message="¿Eliminar esta nota?"
                        aria-label="Eliminar nota"
                      >
                        <Trash2Icon />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay notas en esta partida.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

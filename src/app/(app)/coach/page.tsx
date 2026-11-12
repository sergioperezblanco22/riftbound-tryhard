import {
  ChartNoAxesCombinedIcon,
  NotebookPenIcon,
  ScaleIcon,
  ShieldQuestionIcon,
} from "lucide-react";

import { CoachChat } from "@/components/coach/coach-chat";
import { PageHeader } from "@/components/page-header";
import { SampleSize } from "@/components/sample-size";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDeckList, getRecentNotes } from "@/lib/db/queries";
import { isCoachConfigured } from "@/lib/env";
import { noteCategoryLabel } from "@/lib/format";

export const metadata = { title: "AI Coach" };

const CAPABILITIES = [
  {
    icon: ChartNoAxesCombinedIcon,
    title: "Detecta patrones",
    description:
      "Compara mazos, versiones y matchups para encontrar dónde ganas y dónde pierdes.",
  },
  {
    icon: ScaleIcon,
    title: "Respeta la muestra",
    description:
      "Toda cifra va acompañada de su n y avisa cuando la muestra es demasiado pequeña.",
  },
  {
    icon: NotebookPenIcon,
    title: "Lee tus notas",
    description:
      "Busca en tus anotaciones para detectar errores recurrentes (mulligan, tempo, sideboard...).",
  },
  {
    icon: ShieldQuestionIcon,
    title: "Solo tus datos",
    description:
      "El modelo consulta exclusivamente tus datos mediante herramientas controladas y la RLS.",
  },
];

export default async function CoachPage() {
  const [decks, notes] = await Promise.all([
    getDeckList(),
    getRecentNotes(6),
  ]);
  const configured = isCoachConfigured();

  const totalMatches = decks.reduce(
    (sum, deck) => sum + (deck.stats?.matches ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Coach"
        description="Analiza tus datos reales y propone mejoras concretas para tu juego competitivo."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <CoachChat configured={configured} />

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contexto disponible</CardTitle>
              <CardDescription>
                Lo que el coach puede consultar ahora mismo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mazos</span>
                <span className="font-medium tabular-nums">{decks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Partidas registradas
                </span>
                <span className="font-medium tabular-nums">{totalMatches}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Anotaciones</span>
                <span className="font-medium tabular-nums">{notes.length}</span>
              </div>
              {notes.length > 0 ? (
                <ul className="space-y-2 border-t pt-3">
                  {notes.slice(0, 3).map((note) => (
                    <li key={note.note_id} className="space-y-0.5">
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {note.content}
                      </p>
                      <span className="text-[0.65rem] tracking-wide text-muted-foreground/70 uppercase">
                        {noteCategoryLabel(note.category)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  Aún no hay anotaciones. Añádelas al registrar partidas para
                  obtener mejores análisis.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cómo trabaja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CAPABILITIES.map((capability) => (
                <div key={capability.title} className="flex gap-3">
                  <capability.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{capability.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {capability.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recuerda</CardTitle>
            </CardHeader>
            <CardContent>
              <SampleSize count={totalMatches} className="flex-wrap" />
              <p className="mt-2 text-xs text-muted-foreground">
                Cuanta más muestra acumules, más fiables serán las conclusiones
                del coach.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

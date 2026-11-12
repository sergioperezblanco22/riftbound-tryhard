"use client";

import { useEffect, useRef, useState } from "react";
import {
  BotIcon,
  Loader2Icon,
  SendIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserIcon,
} from "lucide-react";

import { cn } from "cn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  model?: string;
}

const TOOL_LABELS: Record<string, string> = {
  list_catalog: "catálogo",
  get_performance_summary: "resumen",
  get_matchup_matrix: "matchups",
  compare_deck_versions: "versiones",
  search_match_notes: "notas",
  get_recent_matches: "partidas recientes",
};

const DEFAULT_SUGGESTIONS = [
  "¿Qué mazo me está dando mejor resultado y por qué?",
  "¿Contra qué leyenda pierdo más? ¿Tengo muestra suficiente?",
  "Compara las versiones de mi mazo principal y dime cuál mantener.",
  "¿Qué errores se repiten en mis anotaciones?",
  "Dame un plan concreto para mi peor matchup.",
];

function newId(): string {
  return Math.random().toString(36).slice(2);
}

export function CoachChat({
  configured,
  suggestions = DEFAULT_SUGGESTIONS,
}: {
  configured: boolean;
  suggestions?: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
    };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const payload = (await response.json()) as {
        reply?: string;
        tools?: string[];
        model?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "El AI Coach no pudo responder.");
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "assistant",
          content: payload.reply?.trim() || "Sin respuesta.",
          tools: payload.tools,
          model: payload.model,
        },
      ]);
    } catch {
      setError("No se pudo contactar con el AI Coach. Revisa tu conexión.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!configured ? (
        <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          <TriangleAlertIcon className="text-amber-600 dark:text-amber-400" />
          <AlertTitle>AI Coach sin configurar</AlertTitle>
          <AlertDescription className="text-amber-800/90 dark:text-amber-200/80">
            Define la variable de entorno{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              OPENAI_API_KEY
            </code>{" "}
            o{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              GEMINI_API_KEY
            </code>{" "}
            en el servidor para activar el asistente. El resto de la aplicación
            funciona con normalidad.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-[24rem] flex-1 flex-col gap-4 rounded-xl border bg-card p-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BotIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Tu AI Coach competitivo</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Analiza tus datos reales para detectar patrones y proponerte
                mejoras concretas. Todas las cifras incluyen su tamaño de
                muestra.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {message.role === "user" ? (
                    <UserIcon className="size-4" />
                  ) : (
                    <BotIcon className="size-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] space-y-2 rounded-xl px-3.5 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  {message.tools && message.tools.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(message.tools)].map((tool) => (
                        <Badge
                          key={tool}
                          variant="outline"
                          className="text-[0.65rem] font-normal"
                        >
                          <SparklesIcon />
                          {TOOL_LABELS[tool] ?? tool}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {message.role === "assistant" && message.model ? (
                    <p className="text-[0.65rem] text-muted-foreground">
                      modelo: {message.model}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {pending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Analizando tus datos...
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal text-left"
              disabled={!configured || pending}
              onClick={() => send(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder={
            configured
              ? "Pregunta lo que quieras sobre tu rendimiento..."
              : "Configura OPENAI_API_KEY para usar el coach."
          }
          disabled={!configured || pending}
          className="min-h-11 flex-1 resize-none"
        />
        <Button
          type="submit"
          disabled={!configured || pending || input.trim() === ""}
        >
          {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          Enviar
        </Button>
      </form>
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  deckInputSchema,
  deckVersionInputSchema,
  eventInputSchema,
  localToIso,
  matchInputSchema,
  noteInputSchema,
} from "@/lib/validation";

export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

const DEMO_ERROR =
  "Estás en modo demo. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para guardar datos.";

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Datos no válidos";
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath("/decks");
  revalidatePath("/matchups");
  revalidatePath("/events");
}

// -----------------------------------------------------------------------------
// Autenticacion
// -----------------------------------------------------------------------------

export async function signInAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const email = str(formData, "email");
  const password = str(formData, "password");
  const redirectTo = str(formData, "redirect") || "/dashboard";

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Credenciales incorrectas." };

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const email = str(formData, "email");
  const password = str(formData, "password");
  const username = str(formData, "username");

  if (password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: username } },
  });
  if (error) return { ok: false, error: error.message };

  if (!data.session) {
    return {
      ok: true,
      message: "Cuenta creada. Revisa tu correo para confirmar la cuenta.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

// -----------------------------------------------------------------------------
// Partidas
// -----------------------------------------------------------------------------

export async function createMatchAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión no válida." };

  const parsed = matchInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;

  let eventSetId = input.event_set_id ?? null;
  if (!eventSetId && input.event_id) {
    const { data: event } = await supabase
      .from("events")
      .select("set_focus_id")
      .eq("id", input.event_id)
      .maybeSingle();
    eventSetId = (event?.set_focus_id as string | null) ?? null;
  }

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      user_id: user.id,
      deck_version_id: input.deck_version_id,
      played_at: localToIso(input.played_at),
      opponent_legend_id: input.opponent_legend_id ?? null,
      opponent_archetype: input.opponent_archetype ?? null,
      opponent_player_label: input.opponent_player_label ?? null,
      result: input.result,
      game_wins: input.game_wins ?? null,
      game_losses: input.game_losses ?? null,
      game_draws: input.game_draws ?? null,
      event_id: input.event_id ?? null,
      event_set_id: eventSetId,
      round_number: input.round_number ?? null,
      format_code: input.format_code || "1v1",
      result_source: "manual",
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  if (input.note_content) {
    await supabase.from("match_notes").insert({
      match_id: match.id,
      user_id: user.id,
      category: input.note_category ?? "otros",
      content: input.note_content,
      tags: [],
    });
  }

  revalidateAll();
  redirect(`/matches/${match.id}`);
}

export async function updateMatchAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const id = str(formData, "id");
  const parsed = matchInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;

  const { error } = await supabase
    .from("matches")
    .update({
      deck_version_id: input.deck_version_id,
      played_at: localToIso(input.played_at),
      opponent_legend_id: input.opponent_legend_id ?? null,
      opponent_archetype: input.opponent_archetype ?? null,
      opponent_player_label: input.opponent_player_label ?? null,
      result: input.result,
      game_wins: input.game_wins ?? null,
      game_losses: input.game_losses ?? null,
      game_draws: input.game_draws ?? null,
      event_id: input.event_id ?? null,
      event_set_id: input.event_set_id ?? null,
      round_number: input.round_number ?? null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidateAll();
  revalidatePath(`/matches/${id}`);
  redirect(`/matches/${id}`);
}

export async function deleteMatchAction(formData: FormData): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  const id = str(formData, "id");
  await supabase.from("matches").delete().eq("id", id);
  revalidateAll();
  redirect("/matches");
}

// -----------------------------------------------------------------------------
// Mazos y versiones
// -----------------------------------------------------------------------------

export async function createDeckAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión no válida." };

  const parsed = deckInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;

  const { data: deck, error } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Toda version necesita al menos un snapshot inicial.
  await supabase.from("deck_versions").insert({
    deck_id: deck.id,
    version_number: 1,
    label: `${input.name} V1`,
    legend_id: input.legend_id ?? null,
    champion_name: input.champion_name ?? null,
    decklist: input.decklist ? { text: input.decklist } : null,
  });

  revalidatePath("/decks");
  redirect(`/decks/${deck.id}`);
}

export async function createDeckVersionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const parsed = deckVersionInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;

  const { data: existing } = await supabase
    .from("deck_versions")
    .select("version_number")
    .eq("deck_id", input.deck_id)
    .order("version_number", { ascending: false })
    .limit(1);
  const nextNumber = ((existing?.[0]?.version_number as number) ?? 0) + 1;

  const { error } = await supabase.from("deck_versions").insert({
    deck_id: input.deck_id,
    version_number: nextNumber,
    label: input.label ?? `V${nextNumber}`,
    legend_id: input.legend_id ?? null,
    champion_name: input.champion_name ?? null,
    decklist: input.decklist ? { text: input.decklist } : null,
    notes: input.notes ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/decks/${input.deck_id}`);
  revalidatePath("/decks");
  return { ok: true, message: `Versión V${nextNumber} creada.` };
}

export async function deleteDeckAction(formData: FormData): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.from("decks").delete().eq("id", str(formData, "id"));
  revalidatePath("/decks");
  redirect("/decks");
}

// -----------------------------------------------------------------------------
// Torneos
// -----------------------------------------------------------------------------

export async function createEventAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión no válida." };

  const parsed = eventInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      name: input.name,
      event_type: input.event_type ?? null,
      format_code: input.format_code || "1v1",
      set_focus_id: input.set_focus_id ?? null,
      start_date: localToIso(input.start_date),
      end_date: input.end_date ? localToIso(input.end_date) : null,
      location: input.location ?? null,
      external_url: input.external_url ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.from("events").delete().eq("id", str(formData, "id"));
  revalidatePath("/events");
  redirect("/events");
}

// -----------------------------------------------------------------------------
// Anotaciones
// -----------------------------------------------------------------------------

export async function createNoteAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión no válida." };

  const parsed = noteInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;

  const { error } = await supabase.from("match_notes").insert({
    match_id: input.match_id,
    user_id: user.id,
    category: input.category,
    content: input.content,
    tags: input.tags,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/matches/${input.match_id}`);
  revalidatePath("/matches");
  return { ok: true, message: "Anotación guardada." };
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  const matchId = str(formData, "match_id");
  await supabase.from("match_notes").delete().eq("id", str(formData, "id"));
  revalidatePath(`/matches/${matchId}`);
}

// -----------------------------------------------------------------------------
// Sideboard tracker
// -----------------------------------------------------------------------------

export async function createMatchSideboardChangeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: DEMO_ERROR };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión no válida." };

  const matchId = str(formData, "match_id");
  const gameNumber = str(formData, "game_number");
  const cardsOut = str(formData, "cards_out");
  const cardsIn = str(formData, "cards_in");

  if (!matchId || !gameNumber || !cardsOut || !cardsIn) {
    return { ok: false, error: "Todos los campos son obligatorios." };
  }

  const { error } = await supabase.from("match_sideboard_changes").insert({
    match_id: matchId,
    game_number: Number(gameNumber),
    cards_out: cardsOut,
    cards_in: cardsIn,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/matches/${matchId}`);
  return { ok: true, message: "Cambio de sideboard guardado." };
}

export async function deleteMatchSideboardChangeAction(
  formData: FormData
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  const matchId = str(formData, "match_id");
  await supabase
    .from("match_sideboard_changes")
    .delete()
    .eq("id", str(formData, "id"));
  revalidatePath(`/matches/${matchId}`);
}

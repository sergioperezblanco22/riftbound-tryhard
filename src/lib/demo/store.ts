import type {
  DeckRow,
  DeckVersionRow,
  EventRow,
  LegendRow,
  MatchEnrichedRow,
  MatchGameRow,
  MatchNoteRow,
  NoteCategory,
  Outcome,
  ProfileRow,
  SetRow,
} from "@/lib/db/types";

// =============================================================================
// Modo demo: conjunto de datos deterministico para desarrollar la interfaz sin
// credenciales de Supabase. NO se usa en produccion.
// =============================================================================

export interface DemoStore {
  profile: ProfileRow;
  sets: SetRow[];
  legends: LegendRow[];
  decks: DeckRow[];
  deckVersions: (DeckVersionRow & { legend_name: string | null })[];
  events: EventRow[];
  matches: MatchEnrichedRow[];
  games: MatchGameRow[];
  notes: MatchNoteRow[];
}

const USER_ID = "00000000-0000-4000-8000-000000000001";

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function random() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SET_DEFS = [
  { id: "set_ogn", code: "OGN", name: "Origins", release: "2025-10-31" },
  { id: "set_sfd", code: "SFD", name: "Spiritforged", release: "2026-02-13" },
  { id: "set_unl", code: "UNL", name: "Unleashed", release: "2026-05-08" },
  { id: "set_ven", code: "VEN", name: "Vendetta", release: "2026-07-31" },
  { id: "set_rad", code: "RAD", name: "Radiance", release: "2026-10-23" },
];

// Catalogo de leyendas tomado de https://riftdecks.com/legends (metagame
// Radiance, noviembre 2026). `metashare` es su cuota de metagame en % y solo se
// usa para repartir los rivales que genera el modo demo.
const LEGEND_DEFS: {
  id: string;
  code: string;
  name: string;
  title: string;
  metashare: number;
}[] = [
  { id: "leg_riven", code: "RIVEN", name: "Riven", title: "Riven, The Exile", metashare: 20.7 },
  { id: "leg_kaisa", code: "KAISA", name: "Kai'Sa", title: "Kai'Sa, Daughter of the Void", metashare: 13.9 },
  { id: "leg_kennen", code: "KENNEN", name: "Kennen", title: "Kennen, Heart of the Tempest", metashare: 11 },
  { id: "leg_master_yi_bladesman", code: "MASTER_YI_BLADESMAN", name: "Master Yi (Wuju Bladesman)", title: "Master Yi, Wuju Bladesman", metashare: 4.3 },
  { id: "leg_rengar", code: "RENGAR", name: "Rengar", title: "Rengar, Pridestalker", metashare: 3.8 },
  { id: "leg_reksai", code: "REKSAI", name: "Rek'Sai", title: "Rek'Sai, Void Burrower", metashare: 3.5 },
  { id: "leg_vex", code: "VEX", name: "Vex", title: "Vex, Gloomist", metashare: 3.1 },
  { id: "leg_jayce", code: "JAYCE", name: "Jayce", title: "Jayce, Defender of Tomorrow", metashare: 2.8 },
  { id: "leg_irelia", code: "IRELIA", name: "Irelia", title: "Irelia, Blade Dancer", metashare: 2.8 },
  { id: "leg_akali", code: "AKALI", name: "Akali", title: "Akali, Rogue Assassin", metashare: 2.6 },
  { id: "leg_leblanc", code: "LEBLANC", name: "LeBlanc", title: "LeBlanc, Deceiver", metashare: 2.4 },
  { id: "leg_lillia", code: "LILLIA", name: "Lillia", title: "Lillia, Bashful Bloom", metashare: 2.2 },
  { id: "leg_viktor", code: "VIKTOR", name: "Viktor", title: "Viktor, Herald of the Arcane", metashare: 2.2 },
  { id: "leg_azir", code: "AZIR", name: "Azir", title: "Azir, Emperor of the Sands", metashare: 2 },
  { id: "leg_evelynn", code: "EVELYNN", name: "Evelynn", title: "Evelynn, Agony's Embrace", metashare: 2 },
  { id: "leg_khazix", code: "KHAZIX", name: "Kha'Zix", title: "Kha'Zix, Voidreaver", metashare: 1.6 },
  { id: "leg_mordekaiser", code: "MORDEKAISER", name: "Mordekaiser", title: "Mordekaiser, Iron Revenant", metashare: 1.6 },
  { id: "leg_diana", code: "DIANA", name: "Diana", title: "Diana, Scorn of the Moon", metashare: 1.3 },
  { id: "leg_ornn", code: "ORNN", name: "Ornn", title: "Ornn, Fire Below the Mountain", metashare: 1.3 },
  { id: "leg_orianna", code: "ORIANNA", name: "Orianna", title: "Orianna, Lady of Clockwork", metashare: 1.3 },
  { id: "leg_nasus", code: "NASUS", name: "Nasus", title: "Nasus, Curator of the Sands", metashare: 1.1 },
  { id: "leg_ekko", code: "EKKO", name: "Ekko", title: "Ekko, Boy Who Shattered Time", metashare: 1 },
  { id: "leg_sett", code: "SETT", name: "Sett", title: "Sett, The Boss", metashare: 0.9 },
  { id: "leg_seraphine", code: "SERAPHINE", name: "Seraphine", title: "Seraphine, Starry-Eyed Songstress", metashare: 0.9 },
  { id: "leg_fiora", code: "FIORA", name: "Fiora", title: "Fiora, Grand Duelist", metashare: 0.8 },
  { id: "leg_volibear", code: "VOLIBEAR", name: "Volibear", title: "Volibear, Relentless Storm", metashare: 0.7 },
  { id: "leg_jarvan_iv", code: "JARVAN_IV", name: "Jarvan IV", title: "Jarvan IV, Exemplar of Demacia", metashare: 0.7 },
  { id: "leg_ziggs", code: "ZIGGS", name: "Ziggs", title: "Ziggs, Hexplosives Expert", metashare: 0.6 },
  { id: "leg_ezreal", code: "EZREAL", name: "Ezreal", title: "Ezreal, Prodigal Explorer", metashare: 0.5 },
  { id: "leg_pyke", code: "PYKE", name: "Pyke", title: "Pyke, Bloodharbor Ripper", metashare: 0.5 },
  { id: "leg_teemo", code: "TEEMO", name: "Teemo", title: "Teemo, Swift Scout", metashare: 0.5 },
  { id: "leg_master_yi_master", code: "MASTER_YI_MASTER", name: "Master Yi (Wuju Master)", title: "Master Yi, Wuju Master", metashare: 0.5 },
  { id: "leg_ksante", code: "KSANTE", name: "K'Sante", title: "K'Sante, Pride of Nazumah", metashare: 0.5 },
  { id: "leg_jhin", code: "JHIN", name: "Jhin", title: "Jhin, Virtuoso", metashare: 0.4 },
  { id: "leg_ivern", code: "IVERN", name: "Ivern", title: "Ivern, Green Father", metashare: 0.4 },
  { id: "leg_vi", code: "VI", name: "Vi", title: "Vi, Piltover Enforcer", metashare: 0.3 },
  { id: "leg_draven", code: "DRAVEN", name: "Draven", title: "Draven, Glorious Executioner", metashare: 0.3 },
  { id: "leg_lucian", code: "LUCIAN", name: "Lucian", title: "Lucian, Purifier", metashare: 0.3 },
  { id: "leg_mel", code: "MEL", name: "Mel", title: "Mel, Soul's Reflection", metashare: 0.3 },
  { id: "leg_leona", code: "LEONA", name: "Leona", title: "Leona, Radiant Dawn", metashare: 0.3 },
  { id: "leg_zed", code: "ZED", name: "Zed", title: "Zed, Master of Shadows", metashare: 0.3 },
  { id: "leg_renekton", code: "RENEKTON", name: "Renekton", title: "Renekton, Butcher of the Sands", metashare: 0.2 },
  { id: "leg_poppy", code: "POPPY", name: "Poppy", title: "Poppy, Keeper of the Hammer", metashare: 0.2 },
  { id: "leg_rumble", code: "RUMBLE", name: "Rumble", title: "Rumble, Mechanized Menace", metashare: 0.2 },
  { id: "leg_shen", code: "SHEN", name: "Shen", title: "Shen, Eye of Twilight", metashare: 0.2 },
  { id: "leg_ambessa", code: "AMBESSA", name: "Ambessa", title: "Ambessa, Matriarch of War", metashare: 0.2 },
  { id: "leg_darius", code: "DARIUS", name: "Darius", title: "Darius, Hand of Noxus", metashare: 0.1 },
  { id: "leg_yasuo", code: "YASUO", name: "Yasuo", title: "Yasuo, Unforgiven", metashare: 0.1 },
  { id: "leg_miss_fortune", code: "MISS_FORTUNE", name: "Miss Fortune", title: "Miss Fortune, Bounty Hunter", metashare: 0.1 },
  { id: "leg_annie", code: "ANNIE", name: "Annie", title: "Annie, Dark Child", metashare: 0.1 },
  { id: "leg_lee_sin", code: "LEE_SIN", name: "Lee Sin", title: "Lee Sin, Blind Monk", metashare: 0.1 },
  { id: "leg_ahri", code: "AHRI", name: "Ahri", title: "Ahri, Nine-Tailed Fox", metashare: 0.1 },
  { id: "leg_jax", code: "JAX", name: "Jax", title: "Jax, Grandmaster at Arms", metashare: 0.1 },
  { id: "leg_jinx", code: "JINX", name: "Jinx", title: "Jinx, Loose Cannon", metashare: 0 },
  { id: "leg_lux", code: "LUX", name: "Lux", title: "Lux, Lady of Luminosity", metashare: 0 },
  { id: "leg_sivir", code: "SIVIR", name: "Sivir", title: "Sivir, Battle Mistress", metashare: 0 },
  { id: "leg_garen", code: "GAREN", name: "Garen", title: "Garen, Might of Demacia", metashare: 0 },
  { id: "leg_renata_glasc", code: "RENATA_GLASC", name: "Renata Glasc", title: "Renata Glasc, Chem-Baroness", metashare: 0 },
];

/**
 * Peso de cada leyenda como rival en el modo demo. Se aplana la raiz de la
 * cuota de metagame para que las leyendas minoritarias tambien aparezcan y el
 * conjunto de ejemplo deje probar la interfaz: insinua el metagame, no lo
 * reproduce.
 */
const OPPONENT_POOL = LEGEND_DEFS.map((legend) => ({
  ...legend,
  weight: Math.max(2, Math.round(Math.sqrt(legend.metashare) * 12)),
}));

interface DeckDef {
  id: string;
  name: string;
  description: string;
  legendCode: string;
  versions: { label: string; champion: string }[];
  probs: Record<string, number>;
  base: number;
  weight: number;
}

const DECK_DEFS: DeckDef[] = [
  {
    id: "deck_ahri",
    name: "Ahri Control",
    description: "Mazo de control con plan de recurso largo.",
    legendCode: "AHRI",
    versions: [
      { label: "Ahri Control V1", champion: "Ahri" },
      { label: "Ahri Control V2", champion: "Ahri" },
      { label: "Ahri Control V3", champion: "Ahri" },
    ],
    probs: { JINX: 0.4, YASUO: 0.55, VIKTOR: 0.7, AHRI: 0.6, LUX: 0.62, DARIUS: 0.5 },
    base: 0.53,
    weight: 34,
  },
  {
    id: "deck_jinx",
    name: "Jinx Aggro",
    description: "Presion temprana y cierre rapido.",
    legendCode: "JINX",
    versions: [
      { label: "Jinx Aggro V1", champion: "Jinx" },
      { label: "Jinx Aggro V2", champion: "Jinx" },
    ],
    probs: { AHRI: 0.55, JINX: 0.65, YASUO: 0.45, VIKTOR: 0.5, ZED: 0.42 },
    base: 0.52,
    weight: 26,
  },
  {
    id: "deck_yasuo",
    name: "Yasuo Midrange",
    description: "Curva media con amenazas resilientes.",
    legendCode: "YASUO",
    versions: [{ label: "Yasuo Midrange V1", champion: "Yasuo" }],
    probs: { AHRI: 0.45, JINX: 0.6, YASUO: 0.58, VIKTOR: 0.5, GAREN: 0.62 },
    base: 0.51,
    weight: 20,
  },
  {
    id: "deck_viktor",
    name: "Viktor Combo",
    description: "Ensamblaje de combo y turnos explosivos.",
    legendCode: "VIKTOR",
    versions: [
      { label: "Viktor Combo V1", champion: "Viktor" },
      { label: "Viktor Combo V2", champion: "Viktor" },
    ],
    probs: { AHRI: 0.35, JINX: 0.55, YASUO: 0.5, VIKTOR: 0.6, DARIUS: 0.44 },
    base: 0.49,
    weight: 20,
  },
];

const EVENT_DEFS = [
  { name: "Local Semanal #12", type: "locals", setCode: "RAD", daysAgo: 6, rounds: 5 },
  { name: "Local Semanal #13", type: "locals", setCode: "RAD", daysAgo: 13, rounds: 5 },
  { name: "Regional Qualifier", type: "regional", setCode: "RAD", daysAgo: 24, rounds: 8 },
  { name: "Local Semanal #14", type: "locals", setCode: "VEN", daysAgo: 20, rounds: 5 },
  { name: "Testing Team", type: "testing", setCode: "UNL", daysAgo: 30, rounds: 6 },
  { name: "Local Semanal #15", type: "locals", setCode: "RAD", daysAgo: 3, rounds: 5 },
];

const NOTE_TEMPLATES: Record<NoteCategory, string[]> = {
  mulligan: [
    "Mulligan codicioso buscando la curva perfecta; deberia haber aceptado una mano mas lenta.",
    "Carte por una carta clave y me quede sin jugadas de turno 1.",
    "Error al elegir que descartar en el mulligan de Londres.",
  ],
  error_decision: [
    "Atake al campeon en vez de limpiar el tablero y perdi el tempo.",
    "Guarde el removal demasiado tiempo y no llegue a la ventana clave.",
    "Decidi correr en vez de bloquear y me costo la partida.",
  ],
  problema_tempo: [
    "Perdi el tempo en el turno 3 y ya no recupere la iniciativa.",
    "Iba por detras toda la partida; no encontre forma de estabilizar.",
    "El rival encadeno amenazas y no tuve respuestas al ritmo necesario.",
  ],
  sideboard: [
    "Cambie 3 cartas y me quede con demasiados recursos caros.",
    "Falte de respuestas al plan agresivo tras el sideboard.",
    "El sideboard contra control fue demasiado conservador.",
  ],
  plan_partida: [
    "Plan: agotar recursos y ganar en el late. Funciono cuando evite el tempo temprano.",
    "Hay que priorizar la ventana de turno 4 para cerrar antes del combo.",
  ],
  error_ejecucion: [
    "Olvide activar la habilidad del campeon antes de atacar.",
    "Jugue el removal en el objetivo equivocado.",
    "Contre mal la secuencia de hechizos del rival.",
  ],
  otros: [
    "Partida muy ajustada; el rival topdeckeo la respuesta exacta.",
    "Buena lectura del matchup en general.",
  ],
};

const CATEGORY_POOL: NoteCategory[] = [
  "mulligan",
  "mulligan",
  "error_decision",
  "problema_tempo",
  "problema_tempo",
  "problema_tempo",
  "sideboard",
  "plan_partida",
  "error_ejecucion",
  "otros",
];

function pickWeighted<T extends { weight: number }>(items: T[], r: number): T {
  const total = items.reduce((acc, item) => acc + item.weight, 0);
  let target = r * total;
  for (const item of items) {
    target -= item.weight;
    if (target <= 0) return item;
  }
  return items[items.length - 1];
}

let cached: DemoStore | null = null;

export function getDemoStore(): DemoStore {
  if (cached) return cached;

  const random = mulberry32(20261111);
  const now = new Date();

  const sets: SetRow[] = SET_DEFS.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    release_date: s.release,
    active: true,
  }));

  const legends: LegendRow[] = LEGEND_DEFS.map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    title: l.title,
    active: true,
  }));
  const legendById = new Map(legends.map((l) => [l.id, l]));
  const legendByCode = new Map(legends.map((l) => [l.code, l]));

  const decks: DeckRow[] = [];
  const deckVersions: (DeckVersionRow & { legend_name: string | null })[] = [];

  for (const def of DECK_DEFS) {
    const legend = legendByCode.get(def.legendCode)!;
    decks.push({
      id: def.id,
      user_id: USER_ID,
      name: def.name,
      description: def.description,
      created_at: new Date(now.getTime() - 90 * 86400000).toISOString(),
    });
    def.versions.forEach((version, index) => {
      deckVersions.push({
        id: `${def.id}_v${index + 1}`,
        deck_id: def.id,
        version_number: index + 1,
        label: version.label,
        legend_id: legend.id,
        champion_name: version.champion,
        decklist: null,
        notes: null,
        created_at: new Date(
          now.getTime() - (80 - index * 25) * 86400000
        ).toISOString(),
        legend_name: legend.name,
      });
    });
  }

  const events: EventRow[] = EVENT_DEFS.map((def, index) => {
    const set = sets.find((s) => s.code === def.setCode)!;
    const start = new Date(now.getTime() - def.daysAgo * 86400000);
    return {
      id: `event_${index + 1}`,
      user_id: USER_ID,
      name: def.name,
      event_type: def.type,
      format_code: "1v1",
      set_focus_id: set.id,
      start_date: start.toISOString(),
      end_date: new Date(start.getTime() + 8 * 3600000).toISOString(),
      location: def.type === "testing" ? null : "Tienda local",
      external_url: null,
      notes: null,
    };
  });

  const matches: MatchEnrichedRow[] = [];
  const games: MatchGameRow[] = [];
  const notes: MatchNoteRow[] = [];
  const versionByDeck = new Map<string, typeof deckVersions>();
  for (const v of deckVersions) {
    const list = versionByDeck.get(v.deck_id) ?? [];
    list.push(v);
    versionByDeck.set(v.deck_id, list);
  }

  const TOTAL_MATCHES = 168;

  for (let i = 0; i < TOTAL_MATCHES; i += 1) {
    const deckDef = pickWeighted(
      DECK_DEFS.map((d) => ({ ...d, weight: d.weight })),
      random()
    );
    const versions = versionByDeck.get(deckDef.id)!;
    // Sesga hacia la version mas reciente (ultimas versiones se juegan mas).
    const versionIndex = Math.min(
      versions.length - 1,
      Math.floor(Math.pow(random(), 1.6) * versions.length)
    );
    const version = versions[versionIndex];
    const legend = legendById.get(version.legend_id!)!;

    const opponent = pickWeighted(OPPONENT_POOL, random());

    // Fecha: reparto sesgado hacia las ultimas semanas.
    const daysAgo = Math.floor(Math.pow(random(), 1.7) * 150);
    const playedAt = new Date(
      now.getTime() - daysAgo * 86400000 - Math.floor(random() * 8 * 3600000)
    );

    const p = deckDef.probs[opponent.code] ?? deckDef.base;
    const roll = random();
    let result: Outcome;
    if (roll < p) result = "win";
    else if (roll < p + 0.07) result = "draw";
    else result = "loss";

    // Un 12% de partidas se juegan en un evento.
    const inEvent = random() < 0.55;
    const event = inEvent
      ? events[Math.floor(random() * events.length)]
      : null;
    const set = event
      ? sets.find((s) => s.id === event.set_focus_id) ?? null
      : random() < 0.8
        ? sets[Math.floor(random() * sets.length)]
        : null;

    const matchId = `match_${i + 1}`;

    let gameWins: number | null = null;
    let gameLosses: number | null = null;
    let gameDraws: number | null = null;
    if (random() < 0.72) {
      if (result === "win") {
        gameWins = 2;
        gameLosses = random() < 0.6 ? 0 : 1;
      } else if (result === "loss") {
        gameWins = random() < 0.55 ? 0 : 1;
        gameLosses = 2;
      } else {
        gameWins = 1;
        gameLosses = 1;
        gameDraws = 0;
      }

      const total = gameWins + gameLosses;
      for (let g = 1; g <= total; g += 1) {
        const isWin = g <= gameWins;
        games.push({
          id: `${matchId}_g${g}`,
          match_id: matchId,
          game_number: g,
          result: isWin ? "win" : "loss",
          went_first: random() < 0.5,
          battlefield_name: null,
          notes: null,
        });
      }
    }

    matches.push({
      id: matchId,
      user_id: USER_ID,
      played_at: playedAt.toISOString(),
      result,
      format_code: "1v1",
      event_id: event?.id ?? null,
      event_set_id: set?.id ?? null,
      round_number: event ? Math.min(8, 1 + Math.floor(random() * 8)) : null,
      opponent_legend_id: opponent.id,
      opponent_archetype: null,
      opponent_player_label: null,
      game_wins: gameWins,
      game_losses: gameLosses,
      game_draws: gameDraws,
      result_source: "manual",
      created_at: playedAt.toISOString(),
      updated_at: playedAt.toISOString(),
      deck_version_id: version.id,
      version_number: version.version_number,
      version_label: version.label,
      champion_name: version.champion_name,
      deck_id: deckDef.id,
      deck_name: deckDef.name,
      own_legend_id: legend.id,
      own_legend_name: legend.name,
      event_name: event?.name ?? null,
      set_id: set?.id ?? null,
      set_code: set?.code ?? null,
      set_name: set?.name ?? null,
      opponent_legend_code: opponent.code,
      opponent_legend_name: opponent.name,
      note_count: 0,
      note_content: null,
      note_category: null,
    });

    // Notas en ~30% de las partidas.
    if (random() < 0.3) {
      const category = CATEGORY_POOL[Math.floor(random() * CATEGORY_POOL.length)];
      const pool = NOTE_TEMPLATES[category];
      const content = pool[Math.floor(random() * pool.length)];
      notes.push({
        id: `${matchId}_n1`,
        match_id: matchId,
        user_id: USER_ID,
        category,
        content,
        tags: [],
        created_at: playedAt.toISOString(),
      });
    }
  }

  // Recalcula note_count.
  const noteCount = new Map<string, number>();
  for (const note of notes) {
    noteCount.set(note.match_id, (noteCount.get(note.match_id) ?? 0) + 1);
  }
  // Recalcula la nota mas reciente de cada partido.
  const notesByMatch = new Map<string, MatchNoteRow[]>();
  for (const note of notes) {
    const list = notesByMatch.get(note.match_id) ?? [];
    list.push(note);
    notesByMatch.set(note.match_id, list);
  }
  for (const matchNotes of notesByMatch.values()) {
    matchNotes.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  for (const match of matches) {
    match.note_count = noteCount.get(match.id) ?? 0;
    const matchNotes = notesByMatch.get(match.id);
    if (matchNotes?.[0]) {
      match.note_content = matchNotes[0].content;
      match.note_category = matchNotes[0].category;
    }
  }

  cached = {
    profile: {
      id: USER_ID,
      username: "demo_player",
      display_name: "Jugador Demo",
      created_at: new Date(now.getTime() - 120 * 86400000).toISOString(),
      updated_at: now.toISOString(),
    },
    sets,
    legends,
    decks,
    deckVersions,
    events,
    matches,
    games,
    notes,
  };

  return cached;
}

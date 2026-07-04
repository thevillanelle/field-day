import type { VibeType, Vertical, DbProfile, DbUser } from "./types";
import { LONG_GAMES } from "./games-data";

// ─── Vibe type compatibility matrix ──────────────────────────────────────────
// Ported from api/matching.py — scores range 0.2–1.0
const VIBE_COMPAT: Record<VibeType, Record<VibeType, number>> = {
  explorer:   { explorer: 0.8, challenger: 0.6, creator: 0.7, wanderer: 0.6 },
  challenger: { explorer: 0.6, challenger: 0.9, creator: 0.7, wanderer: 0.5 },
  creator:    { explorer: 0.7, challenger: 0.7, creator: 0.8, wanderer: 0.8 },
  wanderer:   { explorer: 0.6, challenger: 0.5, creator: 0.8, wanderer: 0.7 },
};

// ─── Game suggestion per vibe pairing ────────────────────────────────────────
type VibeCombo = `${VibeType}+${VibeType}`;

const GAME_SUGGESTIONS: Partial<Record<VibeCombo, { slug: string; why: string }>> = {
  "explorer+explorer":   { slug: "openguessr",  why: "Two geography obsessives — may the best explorer win." },
  "challenger+challenger": { slug: "lichess",   why: "Apex predators. See who cracks first." },
  "creator+creator":     { slug: "gartic-phone", why: "Artistic chaos. The story will be a disaster. You'll love it." },
  "wanderer+wanderer":   { slug: "connections",  why: "Low stakes, low pressure, maximum vibe alignment." },
  "explorer+challenger": { slug: "typeracer",    why: "Curiosity meets competition — fastest fingers win." },
  "challenger+explorer": { slug: "typeracer",    why: "Curiosity meets competition — fastest fingers win." },
  "explorer+creator":    { slug: "wavelength",   why: "See if your minds map the world the same way." },
  "creator+explorer":    { slug: "wavelength",   why: "See if your minds map the world the same way." },
  "explorer+wanderer":   { slug: "worldle",      why: "Discovery energy meets chill energy. Perfect travel buddies test." },
  "wanderer+explorer":   { slug: "worldle",      why: "Discovery energy meets chill energy. Perfect travel buddies test." },
  "challenger+creator":  { slug: "codenames",    why: "Precision clues, creative leaps — the dream team combo." },
  "creator+challenger":  { slug: "codenames",    why: "Precision clues, creative leaps — the dream team combo." },
  "challenger+wanderer": { slug: "battleship",   why: "Competitive edge meets relaxed patience. Classic clash." },
  "wanderer+challenger": { slug: "battleship",   why: "Competitive edge meets relaxed patience. Classic clash." },
  "creator+wanderer":    { slug: "story-chain",  why: "You'll build something weird and wonderful together." },
  "wanderer+creator":    { slug: "story-chain",  why: "You'll build something weird and wonderful together." },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MatchCandidate {
  user: DbUser;
  profile: DbProfile;
  preferShortGames?: boolean;
  preferNoDrawing?: boolean;
}

export interface MatchPair {
  player1: MatchCandidate;
  player2: MatchCandidate;
  score: number;
  suggested_game: string;
  match_reason: {
    score: number;
    game_name: string;
    game_url: string | null;
    why: string;
    type_combo: string;
  };
}

// ─── Scoring weights (tunable per vertical) ───────────────────────────────────

interface ScoringWeights {
  vibeCompat: number;
  domainDiversity: number;
  interests: number;
  drawingCompat: number;
  durationCompat: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  vibeCompat:      0.35,
  domainDiversity: 0.20,
  interests:       0.25,
  drawingCompat:   0.10,
  durationCompat:  0.10,
};

const VERTICAL_WEIGHTS: Partial<Record<Vertical, Partial<ScoringWeights>>> = {
  dating:  { vibeCompat: 0.25, interests: 0.40, domainDiversity: 0.10 },
  school:  { domainDiversity: 0.30, interests: 0.30 },
  work:    { domainDiversity: 0.30, interests: 0.25 },
  friends: { interests: 0.35, vibeCompat: 0.30 },
};

function weights(vertical: Vertical): ScoringWeights {
  return { ...DEFAULT_WEIGHTS, ...VERTICAL_WEIGHTS[vertical] };
}

// ─── Pair scoring ─────────────────────────────────────────────────────────────

function scorePair(
  a: MatchCandidate,
  b: MatchCandidate,
  vertical: Vertical
): number {
  const w = weights(vertical);

  // Vibe compatibility
  const vibeA = a.profile.vibe_type ?? "wanderer";
  const vibeB = b.profile.vibe_type ?? "wanderer";
  const vibeScore = VIBE_COMPAT[vibeA][vibeB] * w.vibeCompat;

  // Domain diversity (different email domains = cross-org connection, valued)
  const domainScore =
    a.user.email_domain !== b.user.email_domain ? w.domainDiversity : 0;

  // Interest overlap (Jaccard similarity)
  const ia = new Set(a.profile.interests ?? []);
  const ib = new Set(b.profile.interests ?? []);
  const intersection = [...ia].filter((x) => ib.has(x)).length;
  const union = new Set([...ia, ...ib]).size;
  const interestScore = union === 0 ? 0.1 : (intersection / union) * w.interests;

  // Drawing compatibility
  const bothOk = !a.preferNoDrawing && !b.preferNoDrawing;
  const drawScore = bothOk ? w.drawingCompat : 0;

  // Duration compatibility
  const durationScore =
    a.preferShortGames === b.preferShortGames ? w.durationCompat : 0;

  return vibeScore + domainScore + interestScore + drawScore + durationScore;
}

// ─── Game suggestion ──────────────────────────────────────────────────────────

function suggestGame(
  a: MatchCandidate,
  b: MatchCandidate
): { slug: string; why: string } {
  const vibeA = a.profile.vibe_type ?? "wanderer";
  const vibeB = b.profile.vibe_type ?? "wanderer";

  const comboKey: VibeCombo = `${vibeA}+${vibeB}`;
  let suggestion = GAME_SUGGESTIONS[comboKey] ?? { slug: "wordle", why: "A classic starting point — no wrong answers." };

  // Override: no-drawing preference
  if ((a.preferNoDrawing || b.preferNoDrawing) && isDrawingGame(suggestion.slug)) {
    const isCreatorCombo = vibeA === "creator" || vibeB === "creator";
    suggestion = isCreatorCombo
      ? { slug: "story-chain", why: "Creative energy without the pencil." }
      : { slug: "wordle", why: "Same vibe, no drawing required." };
  }

  // Override: short session + long game
  const wantShort = a.preferShortGames || b.preferShortGames;
  if (wantShort && LONG_GAMES.has(suggestion.slug)) {
    suggestion = { slug: "hot-take", why: "Quick, punchy, revealing. Perfect for a short session." };
  }

  return suggestion;
}

function isDrawingGame(slug: string): boolean {
  return ["gartic-phone", "skribbl", "story-chain"].includes(slug);
}

// ─── Greedy matching (Hungarian is overkill for <1000 candidates) ─────────────

export function runMatching(
  pool: MatchCandidate[],
  vertical: Vertical,
  gameUrlMap: Map<string, string | null>
): MatchPair[] {
  const unmatched = [...pool];
  const pairs: MatchPair[] = [];

  while (unmatched.length >= 2) {
    const a = unmatched.shift()!;
    let bestScore = -1;
    let bestIdx = -1;

    for (let i = 0; i < unmatched.length; i++) {
      const b = unmatched[i];
      // Hard constraint: never same-domain in school/work (cross-dept) if possible
      if (
        (vertical === "school" || vertical === "work") &&
        a.user.email_domain === b.user.email_domain &&
        unmatched.length > 2
      ) {
        continue;
      }
      const s = scorePair(a, b, vertical);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }

    // Fallback: if no cross-domain pair found, just take best overall
    if (bestIdx === -1) {
      for (let i = 0; i < unmatched.length; i++) {
        const s = scorePair(a, unmatched[i], vertical);
        if (s > bestScore) {
          bestScore = s;
          bestIdx = i;
        }
      }
    }

    if (bestIdx === -1) break;

    const b = unmatched.splice(bestIdx, 1)[0];
    const game = suggestGame(a, b);
    const vibeA = a.profile.vibe_type ?? "wanderer";
    const vibeB = b.profile.vibe_type ?? "wanderer";

    pairs.push({
      player1: a,
      player2: b,
      score: bestScore,
      suggested_game: game.slug,
      match_reason: {
        score: bestScore,
        game_name: game.slug,
        game_url: gameUrlMap.get(game.slug) ?? null,
        why: game.why,
        type_combo: `${vibeA}+${vibeB}`,
      },
    });
  }

  return pairs;
}

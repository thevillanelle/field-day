"use server";

import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { findBestMatch, pairKey, type MatchCandidate } from "@/lib/matching";
import { GAMES_SEED } from "@/lib/games-data";
import type { Vertical } from "@/lib/types";

// The `games` table isn't seeded yet (Phase 2 doesn't touch that — see
// RUBRIC.md's non-goals about not over-building beyond what's needed).
// Game metadata for matching purposes comes straight from the same
// GAMES_SEED constant matching.ts's suggestGame() slugs are drawn from.
const GAME_URL_MAP = new Map(GAMES_SEED.map((g) => [g.slug, g.external_url]));

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  return session.user.id;
}

export async function findMatch(vertical: Extract<Vertical, "dating" | "friends">) {
  const userId = await requireUserId();
  const supabase = createAdminClient();

  // Already have an active match in this vertical? Go back to it instead of
  // creating a new one.
  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("vertical", vertical)
    .eq("status", "active")
    .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  if (existing) return { matchId: existing.id };

  const { data: selfEnrollment } = await supabase
    .from("vertical_enrollments")
    .select("seeking, status")
    .eq("user_id", userId)
    .eq("vertical", vertical)
    .single();

  if (!selfEnrollment || selfEnrollment.status !== "active") {
    return { error: "Join this vertical before finding a match." };
  }

  const [{ data: selfUser }, { data: selfProfile }] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).single(),
    supabase.from("profiles").select("*").eq("user_id", userId).single(),
  ]);

  if (!selfUser || !selfProfile) return { error: "Finish your profile first." };

  const self: MatchCandidate = {
    user: selfUser,
    profile: selfProfile,
    seeking: selfEnrollment.seeking,
  };

  // Cooldown/exclusion: never re-match someone you've already been matched
  // with in this vertical, regardless of how that match ended.
  const { data: pastMatches } = await supabase
    .from("matches")
    .select("player_1_id, player_2_id")
    .eq("vertical", vertical)
    .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`);

  const alreadyMatchedIds = new Set(
    (pastMatches ?? []).map((m) => (m.player_1_id === userId ? m.player_2_id : m.player_1_id))
  );

  const { data: blockRows } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  const blockedPairs = new Set(
    (blockRows ?? []).map((b) => pairKey(b.blocker_id, b.blocked_id))
  );

  const { data: enrollments } = await supabase
    .from("vertical_enrollments")
    .select("user_id, seeking")
    .eq("vertical", vertical)
    .eq("status", "active")
    .neq("user_id", userId);

  const candidateIds = (enrollments ?? [])
    .map((e) => e.user_id)
    .filter((id) => !alreadyMatchedIds.has(id));

  if (candidateIds.length === 0) {
    return { error: "No one available right now — check back soon." };
  }

  const [{ data: candidateUsers }, { data: candidateProfiles }] = await Promise.all([
    supabase.from("users").select("*").in("id", candidateIds),
    supabase.from("profiles").select("*").in("user_id", candidateIds),
  ]);

  const profileByUserId = new Map((candidateProfiles ?? []).map((p) => [p.user_id, p]));
  const seekingByUserId = new Map((enrollments ?? []).map((e) => [e.user_id, e.seeking]));

  const pool: MatchCandidate[] = [];
  for (const u of candidateUsers ?? []) {
    const profile = profileByUserId.get(u.id);
    if (!profile) continue;
    pool.push({ user: u, profile, seeking: seekingByUserId.get(u.id) ?? [] });
  }

  const result = findBestMatch(self, pool, vertical, GAME_URL_MAP, blockedPairs);
  if (!result) return { error: "No one available right now — check back soon." };

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      player_1_id: userId,
      player_2_id: result.player2.user.id,
      vertical,
      suggested_game: result.suggested_game,
      match_score: result.score,
      match_reason: result.match_reason,
      status: "active",
    })
    .select("id")
    .single();

  if (matchError || !match) {
    return { error: matchError?.message ?? "Couldn't create a match." };
  }

  await supabase.from("game_sessions").insert({
    match_id: match.id,
    game_slug: result.suggested_game,
    mode: "async",
    status: "waiting",
  });

  return { matchId: match.id };
}

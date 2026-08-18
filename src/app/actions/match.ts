"use server";

import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAMES_SEED } from "@/lib/games-data";
import type { DbMatch, DbGameSession } from "@/lib/types";

const GAME_BY_SLUG = new Map(GAMES_SEED.map((g) => [g.slug, g]));

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  return session.user.id;
}

async function requireParticipant(matchId: string) {
  const userId = await requireUserId();
  const supabase = createAdminClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single<DbMatch>();

  if (!match || (match.player_1_id !== userId && match.player_2_id !== userId)) {
    throw new Error("Not part of this match");
  }

  const otherUserId = match.player_1_id === userId ? match.player_2_id : match.player_1_id;
  return { supabase, userId, match, otherUserId, isPlayer1: match.player_1_id === userId };
}

// Only fields safe to show a match partner pre-connection — no exact
// location, no last name (first name only), no age/gender.
function toSafeProfile(
  user: { id: string; name: string; avatar_url: string | null; email_domain: string },
  profile: { bio: string | null; vibe_type: string | null; interests: string[] } | null
) {
  return {
    id: user.id,
    firstName: user.name?.split(" ")[0] ?? "Someone",
    avatarUrl: user.avatar_url,
    bio: profile?.bio ?? null,
    vibeType: profile?.vibe_type ?? null,
    interests: profile?.interests ?? [],
  };
}

export async function getMatchDetail(matchId: string) {
  const { supabase, userId, match, otherUserId, isPlayer1 } = await requireParticipant(matchId);

  const [{ data: otherUser }, { data: otherProfile }, { data: session }, { data: signals }] =
    await Promise.all([
      supabase.from("users").select("id, name, avatar_url, email_domain").eq("id", otherUserId).single(),
      supabase.from("profiles").select("bio, vibe_type, interests").eq("user_id", otherUserId).single(),
      supabase.from("game_sessions").select("*").eq("match_id", matchId).single<DbGameSession>(),
      supabase.from("play_again_signals").select("from_user_id").eq("match_id", matchId),
    ]);

  if (!otherUser || !session) return { error: "Match not found." };

  const game = GAME_BY_SLUG.get(match.suggested_game);
  const result = (session.result ?? {}) as Record<string, unknown>;

  // Story Chain is turn-based, not "both submit independently" — done-ness
  // comes from the session status (set once all turns are written), not
  // from result[userId] presence like the other native games.
  const isStoryChain = match.suggested_game === "story-chain";
  const myDone = isStoryChain ? session.status === "complete" : Boolean(result[userId]);
  const theirDone = isStoryChain ? session.status === "complete" : Boolean(result[otherUserId]);
  const bothDone = isStoryChain ? session.status === "complete" : myDone && theirDone;

  const signaledUserIds = new Set((signals ?? []).map((s) => s.from_user_id));

  return {
    match,
    session,
    game,
    partner: toSafeProfile(otherUser, otherProfile),
    isPlayer1,
    myDone,
    theirDone,
    bothDone,
    myPlayAgain: signaledUserIds.has(userId),
    partnerPlayAgain: signaledUserIds.has(otherUserId),
  };
}

// Shared by every "both players answer independently, then compare" native
// game (This or That, Hot Take, Wavelength) and by the external-game
// self-report flow. The shape of `answers` is opaque here — each game's UI
// component and its own read of session.result interpret it.
export async function submitGameAnswers(matchId: string, answers: Record<string, unknown>) {
  const { supabase, userId, match, otherUserId } = await requireParticipant(matchId);

  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, result")
    .eq("match_id", matchId)
    .single<Pick<DbGameSession, "id" | "result">>();

  if (!session) return { error: "Session not found." };

  const result = { ...(session.result ?? {}), [userId]: { answers } };
  const otherDone = Boolean((session.result ?? {} as Record<string, unknown>)[otherUserId]);
  const status = otherDone ? "complete" : match.player_1_id === userId ? "player1_done" : "player2_done";

  const { error } = await supabase
    .from("game_sessions")
    .update({
      result,
      status,
      completed_at: otherDone ? new Date().toISOString() : null,
    })
    .eq("id", session.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function reportExternalGameDone(matchId: string) {
  return submitGameAnswers(matchId, {});
}

const STORY_CHAIN_TURNS = 8;

export async function submitStoryChainTurn(matchId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Write something first." };
  if (trimmed.length > 280) return { error: "Keep each line under 280 characters." };

  const { supabase, userId, match } = await requireParticipant(matchId);

  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, result, status")
    .eq("match_id", matchId)
    .single<Pick<DbGameSession, "id" | "result" | "status">>();

  if (!session) return { error: "Session not found." };
  if (session.status === "complete") return { error: "This story is already finished." };

  const turns = ((session.result as { turns?: { userId: string; text: string }[] } | null)?.turns) ?? [];
  const expectedTurnUserId = turns.length % 2 === 0 ? match.player_1_id : match.player_2_id;

  if (userId !== expectedTurnUserId) return { error: "It's not your turn yet." };

  const nextTurns = [...turns, { userId, text: trimmed }];
  const complete = nextTurns.length >= STORY_CHAIN_TURNS;

  const { error } = await supabase
    .from("game_sessions")
    .update({
      result: { turns: nextTurns },
      status: complete ? "complete" : "waiting",
      completed_at: complete ? new Date().toISOString() : null,
    })
    .eq("id", session.id);

  if (error) return { error: error.message };
  return { success: true, complete };
}

export async function signalPlayAgain(matchId: string) {
  const { supabase, userId, match, otherUserId } = await requireParticipant(matchId);

  await supabase
    .from("play_again_signals")
    .upsert({ match_id: matchId, from_user_id: userId }, { onConflict: "match_id,from_user_id" });

  const { data: signals } = await supabase
    .from("play_again_signals")
    .select("from_user_id")
    .eq("match_id", matchId);

  const bothSignaled = (signals ?? []).some((s) => s.from_user_id === otherUserId);
  if (!bothSignaled) return { bothSignaled: false };

  const [user1, user2] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
  await supabase.from("connections").upsert(
    { user_1_id: user1, user_2_id: user2, vertical: match.vertical, match_id: matchId },
    { onConflict: "user_1_id,user_2_id,vertical" }
  );

  return { bothSignaled: true };
}

// Live sessions unlock only after both players have signaled play-again.
// The realtime_token is only ever returned here, never in a list/public
// query — see 005_realtime_token.sql for why it's the access control.
export async function getLiveSession(matchId: string) {
  const { supabase, userId, match, otherUserId } = await requireParticipant(matchId);

  const { data: signals } = await supabase
    .from("play_again_signals")
    .select("from_user_id")
    .eq("match_id", matchId);

  const signaledUserIds = new Set((signals ?? []).map((s) => s.from_user_id));
  if (!signaledUserIds.has(userId) || !signaledUserIds.has(otherUserId)) {
    return { error: "Live isn't unlocked for this match yet." };
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select("realtime_token")
    .eq("match_id", matchId)
    .single();

  const { data: otherUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", otherUserId)
    .single();

  if (!session) return { error: "Session not found." };

  return {
    realtimeToken: session.realtime_token as string,
    userId,
    partnerFirstName: otherUser?.name?.split(" ")[0] ?? "Your match",
    vertical: match.vertical,
    suggestedGame: match.suggested_game,
  };
}

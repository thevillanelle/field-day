"use server";

import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import type { DbMatch, DbReport } from "@/lib/types";

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
  return { supabase, userId, match, otherUserId };
}

async function blockPair(
  supabase: ReturnType<typeof createAdminClient>,
  blockerId: string,
  blockedId: string,
  matchId: string
) {
  await supabase
    .from("blocks")
    .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" });

  // A block ends any active match between the two of them — no more
  // interaction, no more field notes, no live session.
  await supabase.from("matches").update({ status: "expired" }).eq("id", matchId).eq("status", "active");
}

export async function reportUser(
  matchId: string,
  reason: string,
  details: string,
  alsoBlock: boolean
) {
  if (!reason.trim()) return { error: "Choose a reason." };

  const { supabase, userId, otherUserId } = await requireParticipant(matchId);

  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    reported_user_id: otherUserId,
    match_id: matchId,
    reason,
    details: details.trim() || null,
  });

  if (error) return { error: error.message };

  if (alsoBlock) {
    await blockPair(supabase, userId, otherUserId, matchId);
  }

  return { success: true };
}

export async function blockUserFromMatch(matchId: string) {
  const { supabase, userId, otherUserId } = await requireParticipant(matchId);
  await blockPair(supabase, userId, otherUserId, matchId);
  return { success: true };
}

// ─── Admin ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) throw new Error("Not authorized");
  return createAdminClient();
}

export async function listOpenReports() {
  const supabase = await requireAdmin();

  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<DbReport[]>();

  if (!reports || reports.length === 0) return [];

  const userIds = [...new Set(reports.flatMap((r) => [r.reporter_id, r.reported_user_id]))];
  const { data: users } = await supabase.from("users").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  return reports.map((r) => ({
    ...r,
    reporter: userById.get(r.reporter_id) ?? null,
    reportedUser: userById.get(r.reported_user_id) ?? null,
  }));
}

export async function updateReportStatus(reportId: string, status: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) return { error: error.message };
  return { success: true };
}

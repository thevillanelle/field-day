"use server";

import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DbMatch, DbFieldNote } from "@/lib/types";

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
  return { supabase, userId, otherUserId };
}

export async function getFieldNotes(matchId: string) {
  const { supabase, userId, otherUserId } = await requireParticipant(matchId);

  const [{ data: notes }, { data: partner }] = await Promise.all([
    supabase
      .from("field_notes")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .returns<DbFieldNote[]>(),
    supabase.from("users").select("name").eq("id", otherUserId).single(),
  ]);

  // Mark anything sent to me as read now that I've opened the thread.
  await supabase
    .from("field_notes")
    .update({ is_read: true })
    .eq("match_id", matchId)
    .eq("to_user_id", userId)
    .eq("is_read", false);

  return {
    userId,
    partnerFirstName: partner?.name?.split(" ")[0] ?? "Your match",
    notes: notes ?? [],
  };
}

export async function sendFieldNote(matchId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Note can't be empty." };
  if (trimmed.length > 500) return { error: "Keep it under 500 characters." };

  const { supabase, userId, otherUserId } = await requireParticipant(matchId);

  const { error } = await supabase.from("field_notes").insert({
    match_id: matchId,
    from_user_id: userId,
    to_user_id: otherUserId,
    type: "message",
    content: { text: trimmed },
  });

  if (error) return { error: error.message };
  return { success: true };
}

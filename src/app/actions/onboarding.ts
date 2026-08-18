"use server";

import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Vertical, VibeType } from "@/lib/types";

const MIN_AGE = 18;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  return session.user.id;
}

export async function saveProfile(formData: FormData) {
  const userId = await requireUserId();
  const bio = (formData.get("bio") as string) || null;
  const location = (formData.get("location") as string) || null;
  const gender = (formData.get("gender") as string) || null;
  const ageRaw = formData.get("age") as string;
  const age = ageRaw ? Number(ageRaw) : null;

  if (age !== null && (Number.isNaN(age) || age < MIN_AGE)) {
    return { error: `You must be at least ${MIN_AGE} to use Field Day.` };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: userId, bio, location, gender, age },
      { onConflict: "user_id" }
    );

  if (error) return { error: error.message };
  return { success: true };
}

export async function enrollVertical(
  vertical: Extract<Vertical, "dating" | "friends">,
  intent: string,
  seeking: string[]
) {
  const userId = await requireUserId();
  const supabase = createAdminClient();

  // Defense in depth: re-check age server-side even though the profile step
  // already gates it, since Dating specifically requires the age floor.
  if (vertical === "dating") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("age")
      .eq("user_id", userId)
      .single();

    if (!profile?.age || profile.age < MIN_AGE) {
      return { error: `You must be at least ${MIN_AGE} to join Dating.` };
    }
  }

  const { error } = await supabase.from("vertical_enrollments").upsert(
    {
      user_id: userId,
      vertical,
      intent,
      seeking,
      status: "active",
    },
    { onConflict: "user_id,vertical" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

export async function joinWaitlist(vertical: Extract<Vertical, "school" | "work">) {
  const userId = await requireUserId();
  const supabase = createAdminClient();

  const { error } = await supabase.from("vertical_enrollments").upsert(
    {
      user_id: userId,
      vertical,
      status: "waitlist",
    },
    { onConflict: "user_id,vertical" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Vibe quiz scoring ──────────────────────────────────────────────────────
// Each answer nudges toward one or two vibe types; the highest total wins.
// Ties fall back to "wanderer" (the lowest-commitment, broadest-compat type
// per matching.ts's VIBE_COMPAT matrix).

const VIBE_WEIGHTS: Record<string, Partial<Record<VibeType, number>>> = {
  "trip-research": { explorer: 2 },
  "trip-wing-it": { wanderer: 2 },
  "trip-plan-everything": { challenger: 2 },
  "trip-whoever-invites": { creator: 1, wanderer: 1 },
  "weekend-new-place": { explorer: 2 },
  "weekend-competitive-game": { challenger: 2 },
  "weekend-making-something": { creator: 2 },
  "weekend-low-key": { wanderer: 2 },
  "conflict-debate-it-out": { challenger: 2 },
  "conflict-need-space": { wanderer: 2 },
  "conflict-reframe-it": { creator: 1, explorer: 1 },
  "energy-plan-the-plan": { challenger: 1, explorer: 1 },
  "energy-see-what-happens": { wanderer: 2 },
  "energy-make-something-of-it": { creator: 2 },
};

export async function saveQuiz(answers: Record<string, string>) {
  const userId = await requireUserId();

  const totals: Record<VibeType, number> = {
    explorer: 0,
    challenger: 0,
    creator: 0,
    wanderer: 0,
  };

  for (const answerId of Object.values(answers)) {
    const weights = VIBE_WEIGHTS[answerId];
    if (!weights) continue;
    for (const [vibe, points] of Object.entries(weights) as [VibeType, number][]) {
      totals[vibe] += points;
    }
  }

  const vibeType = (Object.keys(totals) as VibeType[]).reduce((best, vibe) =>
    totals[vibe] > totals[best] ? vibe : best
  , "wanderer" as VibeType);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ vibe_type: vibeType, quiz_answers: answers })
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return { success: true, vibeType };
}

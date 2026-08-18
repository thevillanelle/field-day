import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { FindMatchButton } from "./find-match-button";

const LABELS: Record<string, { emoji: string; label: string; cta: string }> = {
  dating: { emoji: "💘", label: "Dating", cta: "Find a match" },
  friends: { emoji: "🌻", label: "Friends", cta: "Find a friend" },
};

export default async function DiscoverPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const supabase = createAdminClient();
  const { data: enrollments } = await supabase
    .from("vertical_enrollments")
    .select("vertical")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .in("vertical", ["dating", "friends"]);

  const activeVerticals = (enrollments ?? []).map((e) => e.vertical as "dating" | "friends");

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2d1a0e]">Discover</h1>
        <p className="text-[#7a6e65] mt-1">We&apos;ll find you someone and a game to break the ice.</p>
      </div>

      {activeVerticals.length === 0 ? (
        <Card className="border-dashed border-2 border-[#e0d8ce] rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
          <div className="text-3xl">🧭</div>
          <p className="text-sm text-[#7a6e65] max-w-xs">
            You&apos;re not enrolled in Dating or Friends yet. Join one to start finding matches.
          </p>
          <Link href="/onboarding/vertical">
            <Button className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white mt-2">
              Choose your field →
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {activeVerticals.map((v) => {
            const meta = LABELS[v];
            return (
              <Card key={v} className="rounded-2xl border border-[#e0d8ce] p-6 flex flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-2xl mb-1">{meta.emoji}</div>
                  <div className="font-bold text-[#2d1a0e]">{meta.label}</div>
                </div>
                <FindMatchButton vertical={v} label={meta.cta} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

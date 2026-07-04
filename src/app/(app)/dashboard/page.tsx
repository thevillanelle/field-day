import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[#2d1a0e]">
          Hey, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-[#7a6e65] mt-1">Your active games and field notes live here.</p>
      </div>

      {/* Empty state — will be replaced once matching is wired */}
      <Card className="border-dashed border-2 border-[#e0d8ce] rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">🏁</div>
        <h2 className="font-bold text-[#2d1a0e]">No active games yet</h2>
        <p className="text-sm text-[#7a6e65] max-w-xs">
          Once you&apos;re matched, your game will appear here. Make sure you&apos;ve joined a vertical first.
        </p>
        <Link href="/onboarding/vertical">
          <Button className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white mt-2">
            Join a vertical →
          </Button>
        </Link>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/discover", emoji: "🌍", label: "Discover people" },
          { href: "/games", emoji: "🎮", label: "Browse games" },
          { href: "/onboarding/vertical", emoji: "🧭", label: "My verticals" },
          { href: `/profile/${session?.user?.id}`, emoji: "👤", label: "My profile" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-white rounded-xl border border-[#e0d8ce] p-4 flex flex-col items-center gap-2 text-center hover:border-[#3a7d44] transition-colors">
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-xs font-medium text-[#2d1a0e]">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

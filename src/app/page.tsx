import Link from "next/link";
import { Button } from "@/components/ui/button";

const VERTICALS = [
  {
    id: "dating",
    emoji: "💘",
    label: "Dating",
    tagline: "Play before you fall.",
    description: "Meet someone through a game before you ever meet IRL.",
    color: "#e85d8a",
    bg: "#fdf0f5",
  },
  {
    id: "school",
    emoji: "🎓",
    label: "School",
    tagline: "Know your campus.",
    description: "Connect across majors, dorms, and clubs without the awkward intro.",
    color: "#4a90d9",
    bg: "#eff6fd",
  },
  {
    id: "friends",
    emoji: "🌻",
    label: "Friends",
    tagline: "Hang with your people.",
    description: "Find your kind of person through the games you love.",
    color: "#d4a017",
    bg: "#fdf9e8",
  },
  {
    id: "work",
    emoji: "⚡",
    label: "Work",
    tagline: "Team, but make it fun.",
    description: "Break the Zoom ice. Cross departments. Actually enjoy it.",
    color: "#2d6a4f",
    bg: "#eef6f2",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf8f3] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#e0d8ce]">
        <span className="text-xl font-bold tracking-tight text-[#2d1a0e]">
          Field Day
        </span>
        <div className="flex gap-3">
          <Link href="/games">
            <Button variant="ghost" size="sm">Browse games</Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="bg-[#3a7d44] hover:bg-[#2e6337] text-white rounded-full px-5">
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 gap-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f0ece4] px-4 py-1.5 text-sm font-medium text-[#2d1a0e]">
          🏁 The first meet is a game
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[#2d1a0e] max-w-2xl leading-tight">
          Find your person<br />through play.
        </h1>
        <p className="text-lg text-[#7a6e65] max-w-md leading-relaxed">
          Field Day matches you with someone, gives you a game to play on your own time,
          then lets you decide if there&apos;s a second round.
        </p>
        <div className="flex gap-3 flex-wrap justify-center mt-2">
          <Link href="/login">
            <Button size="lg" className="bg-[#3a7d44] hover:bg-[#2e6337] text-white rounded-full px-8 text-base">
              Start playing →
            </Button>
          </Link>
          <Link href="/games">
            <Button size="lg" variant="outline" className="rounded-full px-8 text-base border-[#e0d8ce]">
              See the games
            </Button>
          </Link>
        </div>
      </section>

      {/* Verticals */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <p className="text-center text-sm font-medium text-[#7a6e65] uppercase tracking-widest mb-8">
          Choose your field
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VERTICALS.map((v) => (
            <Link key={v.id} href={`/login?vertical=${v.id}`}>
              <div
                className="rounded-2xl p-6 border border-[#e0d8ce] hover:border-transparent hover:shadow-md transition-all cursor-pointer group"
                style={{ background: v.bg }}
              >
                <div className="text-3xl mb-3">{v.emoji}</div>
                <div className="font-bold text-lg text-[#2d1a0e] mb-1">{v.label}</div>
                <div className="text-sm font-medium mb-2" style={{ color: v.color }}>
                  {v.tagline}
                </div>
                <p className="text-sm text-[#7a6e65] leading-relaxed">
                  {v.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#f0ece4] px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#2d1a0e] mb-10">
            How a Field Day works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              {
                step: "01",
                title: "Get matched",
                body: "Take a quick vibe quiz. We pair you with someone based on personality, interests, and how you play.",
              },
              {
                step: "02",
                title: "Play async",
                body: "You each play the suggested game on your own time. No scheduling. No pressure. Just the game.",
              },
              {
                step: "03",
                title: "Go live or move on",
                body: "If you both want a second round, we unlock a live session. If not, no hard feelings — it's just a game.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <span className="text-4xl font-black text-[#e0d8ce]">{item.step}</span>
                <h3 className="font-bold text-[#2d1a0e]">{item.title}</h3>
                <p className="text-sm text-[#7a6e65] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-[#e0d8ce] mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-[#7a6e65]">
          <span className="font-semibold text-[#2d1a0e]">Field Day</span>
          <span>by VILE LLC</span>
        </div>
      </footer>
    </div>
  );
}

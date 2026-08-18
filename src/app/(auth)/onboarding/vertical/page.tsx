"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { enrollVertical, joinWaitlist } from "@/app/actions/onboarding";
import type { Vertical } from "@/lib/types";

const LIVE_VERTICALS = [
  {
    id: "dating" as const,
    emoji: "💘",
    label: "Dating",
    tagline: "Play before you fall.",
    color: "#e85d8a",
    bg: "#fdf0f5",
    intents: ["Something casual", "Something serious", "Not sure yet — let's just play"],
  },
  {
    id: "friends" as const,
    emoji: "🌻",
    label: "Friends",
    tagline: "Hang with your people.",
    color: "#d4a017",
    bg: "#fdf9e8",
    intents: ["New in town", "Expanding my circle", "Activity partners"],
  },
];

const SEEKING_OPTIONS = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "nonbinary", label: "Nonbinary people" },
  { id: "everyone", label: "Everyone" },
];

const COMING_SOON_VERTICALS = [
  { id: "school" as const, emoji: "🎓", label: "School", tagline: "Know your campus.", color: "#4a90d9", bg: "#eff6fd" },
  { id: "work" as const, emoji: "⚡", label: "Work", tagline: "Team, but make it fun.", color: "#2d6a4f", bg: "#eef6f2" },
];

export default function OnboardingVerticalPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"dating" | "friends" | null>(null);
  const [intent, setIntent] = useState<string>("");
  const [seeking, setSeeking] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [waitlisted, setWaitlisted] = useState<Set<Vertical>>(new Set());

  function toggleSeeking(id: string) {
    setSeeking((prev) => {
      if (id === "everyone") return prev.includes("everyone") ? [] : ["everyone"];
      const withoutEveryone = prev.filter((s) => s !== "everyone");
      return withoutEveryone.includes(id)
        ? withoutEveryone.filter((s) => s !== id)
        : [...withoutEveryone, id];
    });
  }

  function selectVertical(id: "dating" | "friends") {
    setSelected(id);
    setIntent("");
    setSeeking([]);
    setError(null);
  }

  async function handleContinue() {
    if (!selected || !intent) return;
    if (selected === "dating" && seeking.length === 0) {
      setError("Let us know who you'd like to be matched with.");
      return;
    }

    setPending(true);
    setError(null);
    const result = await enrollVertical(selected, intent, seeking);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push("/onboarding/quiz");
  }

  async function handleWaitlist(vertical: Vertical) {
    const result = await joinWaitlist(vertical as "school" | "work");
    if (!result?.error) {
      setWaitlisted((prev) => new Set(prev).add(vertical));
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44] mb-2">
            Step 2 of 3
          </p>
          <h1 className="text-2xl font-bold text-[#2d1a0e]">Choose your field</h1>
          <p className="text-sm text-[#7a6e65] mt-1">
            You can join more later — start with the one you&apos;re here for.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LIVE_VERTICALS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVertical(v.id)}
              className="text-left rounded-2xl p-6 border-2 transition-all cursor-pointer"
              style={{
                background: v.bg,
                borderColor: selected === v.id ? v.color : "transparent",
              }}
            >
              <div className="text-3xl mb-3">{v.emoji}</div>
              <div className="font-bold text-lg text-[#2d1a0e] mb-1">{v.label}</div>
              <div className="text-sm font-medium" style={{ color: v.color }}>{v.tagline}</div>
            </button>
          ))}
        </div>

        {selected && (
          <Card className="rounded-2xl border border-[#e0d8ce] p-6 gap-4">
            <div>
              <p className="text-sm font-semibold text-[#2d1a0e] mb-2">What are you looking for?</p>
              <div className="flex flex-col gap-2">
                {LIVE_VERTICALS.find((v) => v.id === selected)!.intents.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIntent(option)}
                    className={`text-left text-sm rounded-lg border px-3 py-2 transition-colors ${
                      intent === option
                        ? "border-[#3a7d44] bg-[#eef6f0] text-[#2d1a0e]"
                        : "border-[#e0d8ce] text-[#7a6e65] hover:border-[#3a7d44]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {selected === "dating" && (
              <div>
                <p className="text-sm font-semibold text-[#2d1a0e] mb-2">Who would you like to meet?</p>
                <div className="flex flex-wrap gap-2">
                  {SEEKING_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleSeeking(option.id)}
                      className={`text-sm rounded-full border px-3 py-1.5 transition-colors ${
                        seeking.includes(option.id)
                          ? "border-[#3a7d44] bg-[#eef6f0] text-[#2d1a0e]"
                          : "border-[#e0d8ce] text-[#7a6e65] hover:border-[#3a7d44]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="button"
              disabled={!intent || pending}
              onClick={handleContinue}
              className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white h-10 self-start px-6"
            >
              {pending ? "Joining…" : "Continue →"}
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COMING_SOON_VERTICALS.map((v) => (
            <div
              key={v.id}
              className="rounded-2xl p-6 border border-[#e0d8ce] relative opacity-90"
              style={{ background: v.bg }}
            >
              <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wide text-[#7a6e65] bg-white/70 rounded-full px-2 py-1">
                Coming soon
              </span>
              <div className="text-3xl mb-3">{v.emoji}</div>
              <div className="font-bold text-lg text-[#2d1a0e] mb-1">{v.label}</div>
              <div className="text-sm font-medium mb-4" style={{ color: v.color }}>{v.tagline}</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={waitlisted.has(v.id)}
                onClick={() => handleWaitlist(v.id)}
                className="rounded-full border-[#e0d8ce] bg-white"
              >
                {waitlisted.has(v.id) ? "You're on the list ✓" : "Notify me"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

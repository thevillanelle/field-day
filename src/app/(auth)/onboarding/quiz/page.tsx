"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveQuiz } from "@/app/actions/onboarding";
import type { VibeType } from "@/lib/types";

const QUESTIONS = [
  {
    id: "trip",
    prompt: "You're planning a weekend trip. What's your role?",
    options: [
      { id: "trip-research", label: "Research every detail before we go" },
      { id: "trip-wing-it", label: "Wing it once we get there" },
      { id: "trip-plan-everything", label: "Build the itinerary down to the hour" },
      { id: "trip-whoever-invites", label: "Whoever invites me, I show up" },
    ],
  },
  {
    id: "weekend",
    prompt: "Free Saturday, no plans. What actually happens?",
    options: [
      { id: "weekend-new-place", label: "Explore a part of the city I've never seen" },
      { id: "weekend-competitive-game", label: "Round up people for a competitive game night" },
      { id: "weekend-making-something", label: "Get lost making something" },
      { id: "weekend-low-key", label: "Do absolutely nothing, and love it" },
    ],
  },
  {
    id: "conflict",
    prompt: "Something's off with a friend. What's your move?",
    options: [
      { id: "conflict-debate-it-out", label: "Talk it out, directly, now" },
      { id: "conflict-need-space", label: "Give it space before saying anything" },
      { id: "conflict-reframe-it", label: "Find a way to laugh about it first" },
    ],
  },
  {
    id: "energy",
    prompt: "Your best ideas show up when...",
    options: [
      { id: "energy-plan-the-plan", label: "You've mapped out the whole plan" },
      { id: "energy-see-what-happens", label: "You stop trying to control it" },
      { id: "energy-make-something-of-it", label: "You're actually making something" },
    ],
  },
];

const VIBE_COPY: Record<VibeType, { label: string; blurb: string }> = {
  explorer: { label: "The Explorer", blurb: "Curious first, cautious never." },
  challenger: { label: "The Challenger", blurb: "You show up to win, warmly." },
  creator: { label: "The Creator", blurb: "You'd rather make it than watch it." },
  wanderer: { label: "The Wanderer", blurb: "Low pressure, high presence." },
};

export default function OnboardingQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<VibeType | null>(null);
  const [pending, setPending] = useState(false);

  const question = QUESTIONS[step];

  async function selectAnswer(optionId: string) {
    const nextAnswers = { ...answers, [question.id]: optionId };
    setAnswers(nextAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    setPending(true);
    const res = await saveQuiz(nextAnswers);
    setPending(false);
    if (res?.vibeType) setResult(res.vibeType);
  }

  if (result) {
    const copy = VIBE_COPY[result];
    return (
      <div className="min-h-screen bg-[#faf8f3] flex flex-col items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md rounded-2xl border border-[#e0d8ce] p-8 gap-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44]">
            Your vibe
          </p>
          <h1 className="text-3xl font-bold text-[#2d1a0e]">{copy.label}</h1>
          <p className="text-sm text-[#7a6e65]">{copy.blurb}</p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white h-10 mt-2 self-center px-8"
          >
            Go to dashboard →
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44] mb-2">
            Step 3 of 3 · Question {step + 1} of {QUESTIONS.length}
          </p>
        </div>

        <Card className="rounded-2xl border border-[#e0d8ce] p-8 gap-5">
          <h1 className="text-xl font-bold text-[#2d1a0e]">{question.prompt}</h1>
          <div className="flex flex-col gap-2">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={pending}
                onClick={() => selectAnswer(option.id)}
                className="text-left text-sm rounded-lg border border-[#e0d8ce] px-4 py-3 text-[#2d1a0e] hover:border-[#3a7d44] hover:bg-[#eef6f0] transition-colors disabled:opacity-50"
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

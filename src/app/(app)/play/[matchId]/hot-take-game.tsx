"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { HOT_TAKE_PROMPTS } from "@/lib/hot-take";
import { submitGameAnswers } from "@/app/actions/match";

const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function HotTakeGame({
  matchId,
  onComplete,
}: {
  matchId: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const prompt = HOT_TAKE_PROMPTS[step];

  async function rate(value: number) {
    const next = { ...answers, [prompt.id]: value };
    setAnswers(next);

    if (step < HOT_TAKE_PROMPTS.length - 1) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    await submitGameAnswers(matchId, next);
    setSubmitting(false);
    onComplete();
  }

  return (
    <Card className="rounded-2xl border border-[#e0d8ce] p-8 gap-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44]">
        Hot Take · {step + 1} of {HOT_TAKE_PROMPTS.length}
      </p>
      <p className="text-lg font-bold text-[#2d1a0e] text-center">&ldquo;{prompt.statement}&rdquo;</p>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-[#7a6e65] px-1">
          <span>Hard disagree</span>
          <span>Hard agree</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {SCALE.map((n) => (
            <button
              key={n}
              type="button"
              disabled={submitting}
              onClick={() => rate(n)}
              className="rounded-lg border border-[#e0d8ce] py-3 text-center font-bold text-[#2d1a0e] hover:border-[#3a7d44] hover:bg-[#eef6f0] transition-colors disabled:opacity-50"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

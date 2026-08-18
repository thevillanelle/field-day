"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { THIS_OR_THAT_PROMPTS } from "@/lib/this-or-that";
import { submitGameAnswers } from "@/app/actions/match";

export function ThisOrThatGame({
  matchId,
  onComplete,
}: {
  matchId: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "a" | "b">>({});
  const [submitting, setSubmitting] = useState(false);

  const prompt = THIS_OR_THAT_PROMPTS[step];

  async function pick(choice: "a" | "b") {
    const next = { ...answers, [prompt.id]: choice };
    setAnswers(next);

    if (step < THIS_OR_THAT_PROMPTS.length - 1) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    await submitGameAnswers(matchId, next);
    setSubmitting(false);
    onComplete();
  }

  return (
    <Card className="rounded-2xl border border-[#e0d8ce] p-8 gap-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44]">
        This or That · {step + 1} of {THIS_OR_THAT_PROMPTS.length}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => pick("a")}
          className="rounded-xl border border-[#e0d8ce] py-8 px-4 text-center font-bold text-[#2d1a0e] hover:border-[#3a7d44] hover:bg-[#eef6f0] transition-colors disabled:opacity-50"
        >
          {prompt.a}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => pick("b")}
          className="rounded-xl border border-[#e0d8ce] py-8 px-4 text-center font-bold text-[#2d1a0e] hover:border-[#3a7d44] hover:bg-[#eef6f0] transition-colors disabled:opacity-50"
        >
          {prompt.b}
        </button>
      </div>
    </Card>
  );
}

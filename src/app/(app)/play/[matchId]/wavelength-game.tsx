"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WAVELENGTH_PROMPTS } from "@/lib/wavelength";
import { submitGameAnswers } from "@/app/actions/match";

export function WavelengthGame({
  matchId,
  onComplete,
}: {
  matchId: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState(50);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const prompt = WAVELENGTH_PROMPTS[step];

  async function lockIn() {
    const next = { ...answers, [prompt.id]: value };
    setAnswers(next);
    setValue(50);

    if (step < WAVELENGTH_PROMPTS.length - 1) {
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
        Wavelength · {step + 1} of {WAVELENGTH_PROMPTS.length}
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between text-sm font-bold text-[#2d1a0e]">
          <span>{prompt.left}</span>
          <span>{prompt.right}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          disabled={submitting}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full accent-[#3a7d44]"
        />
      </div>
      <Button
        onClick={lockIn}
        disabled={submitting}
        className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white self-center px-8"
      >
        Lock it in
      </Button>
    </Card>
  );
}

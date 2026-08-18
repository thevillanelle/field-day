"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitStoryChainTurn } from "@/app/actions/match";

const TOTAL_TURNS = 8;

export function StoryChainGame({
  matchId,
  isPlayer1,
  partnerFirstName,
  initialTurns,
  onComplete,
}: {
  matchId: string;
  isPlayer1: boolean;
  partnerFirstName: string;
  initialTurns: { userId: string; text: string }[];
  onComplete: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Turn parity: even turn index = player 1's line, odd = player 2's.
  const nextTurnIsPlayer1 = initialTurns.length % 2 === 0;
  const isMyTurn = nextTurnIsPlayer1 === isPlayer1;

  async function submit() {
    if (!draft.trim()) return;
    setPending(true);
    setError(null);
    const result = await submitStoryChainTurn(matchId, draft);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    setDraft("");
    if (result?.complete) {
      onComplete();
    } else {
      router.refresh();
    }
  }

  return (
    <Card className="rounded-2xl border border-[#e0d8ce] p-8 gap-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44]">
        Story Chain · {initialTurns.length} of {TOTAL_TURNS} lines
      </p>

      <div className="flex flex-col gap-2">
        {initialTurns.length === 0 ? (
          <p className="text-sm text-[#7a6e65]">Nobody&apos;s written the first line yet.</p>
        ) : (
          initialTurns.map((turn, i) => {
            const authoredByPlayer1 = i % 2 === 0;
            const mine = authoredByPlayer1 === isPlayer1;
            return (
              <p key={i} className="text-sm text-[#2d1a0e]">
                <span className="font-semibold text-[#3a7d44]">{mine ? "You" : partnerFirstName}: </span>
                {turn.text}
              </p>
            );
          })
        )}
      </div>

      {isMyTurn ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={initialTurns.length === 0 ? "Write the first line…" : "Write the next line…"}
            maxLength={280}
            className="border-[#e0d8ce] min-h-16"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            onClick={submit}
            disabled={pending || !draft.trim()}
            className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white self-start px-6"
          >
            {pending ? "Adding…" : "Add your line"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-[#7a6e65]">Waiting for {partnerFirstName} to write the next line…</p>
          <Button variant="outline" onClick={() => router.refresh()} className="rounded-full border-[#e0d8ce]">
            Check again
          </Button>
        </div>
      )}
    </Card>
  );
}

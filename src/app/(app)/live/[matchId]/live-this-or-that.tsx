"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { THIS_OR_THAT_PROMPTS } from "@/lib/this-or-that";

type Choice = "a" | "b";

interface AnswerPayload {
  fromUserId: string;
  promptId: string;
  choice: Choice;
}

const REVEAL_DELAY_MS = 1400;

export function LiveThisOrThat({
  matchId,
  realtimeToken,
  userId,
  partnerFirstName,
}: {
  matchId: string;
  realtimeToken: string;
  userId: string;
  partnerFirstName: string;
}) {
  const [partnerPresent, setPartnerPresent] = useState(false);
  const [step, setStep] = useState(0);
  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [partnerChoice, setPartnerChoice] = useState<Choice | null>(null);
  const [matches, setMatches] = useState(0);
  const [finished, setFinished] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const stepRef = useRef(step);
  const myChoiceRef = useRef<Choice | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    myChoiceRef.current = myChoice;
  }, [myChoice]);

  const prompt = THIS_OR_THAT_PROMPTS[step];

  // NOTE: no reconnect/replay logic — if a client refreshes mid-round it
  // loses its place. Fine for this pass; live progress isn't persisted to
  // the DB at all (see getLiveSession in match.ts), the session is purely
  // ephemeral over the realtime channel.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`live:${realtimeToken}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others = Object.keys(state).filter((key) => key !== userId);
        setPartnerPresent(others.length > 0);
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        const event = payload as AnswerPayload;
        if (event.fromUserId === userId) return;
        if (event.promptId !== THIS_OR_THAT_PROMPTS[stepRef.current]?.id) return;
        setPartnerChoice(event.choice);
        if (myChoiceRef.current) revealAndAdvance(myChoiceRef.current, event.choice);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeToken, userId]);

  // Triggered from an event handler (a click, or a realtime broadcast
  // callback) — never from an effect body — so it's safe to setState
  // synchronously here. Uses functional updates throughout so it doesn't
  // depend on a fresh closure over `step`/`matches`.
  function revealAndAdvance(mine: Choice, theirs: Choice) {
    if (mine === theirs) setMatches((m) => m + 1);

    setTimeout(() => {
      setMyChoice(null);
      setPartnerChoice(null);
      setStep((s) => {
        const next = s + 1;
        if (next >= THIS_OR_THAT_PROMPTS.length) {
          setFinished(true);
          return s;
        }
        return next;
      });
    }, REVEAL_DELAY_MS);
  }

  function pick(choice: Choice) {
    if (myChoice) return;
    setMyChoice(choice);
    channelRef.current?.send({
      type: "broadcast",
      event: "answer",
      payload: { fromUserId: userId, promptId: prompt.id, choice } satisfies AnswerPayload,
    });
    if (partnerChoice) revealAndAdvance(choice, partnerChoice);
  }

  if (!partnerPresent) {
    return (
      <Card className="rounded-2xl border border-[#e0d8ce] p-10 flex flex-col items-center gap-3 text-center">
        <div className="text-3xl animate-pulse">📡</div>
        <p className="font-bold text-[#2d1a0e]">Waiting for {partnerFirstName} to join…</p>
        <p className="text-sm text-[#7a6e65]">Keep this open — it&apos;ll start as soon as they&apos;re here.</p>
        <Link href={`/play/${matchId}`}>
          <Button variant="outline" className="rounded-full border-[#e0d8ce] mt-2">
            Back to match
          </Button>
        </Link>
      </Card>
    );
  }

  if (finished) {
    return (
      <Card className="rounded-2xl border border-[#e0d8ce] p-10 flex flex-col items-center gap-3 text-center">
        <div className="text-3xl">🏁</div>
        <p className="font-bold text-[#2d1a0e]">
          You matched on {matches} of {THIS_OR_THAT_PROMPTS.length}!
        </p>
        <Link href="/dashboard">
          <Button className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white mt-2">
            Back to dashboard
          </Button>
        </Link>
      </Card>
    );
  }

  const revealed = Boolean(myChoice && partnerChoice);

  return (
    <Card className="rounded-2xl border border-[#e0d8ce] p-8 gap-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44]">
        Live · This or That · {step + 1} of {THIS_OR_THAT_PROMPTS.length} · {matches} matched
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(["a", "b"] as const).map((choice) => {
          const label = choice === "a" ? prompt.a : prompt.b;
          const isMine = myChoice === choice;
          const isPartners = revealed && partnerChoice === choice;
          return (
            <button
              key={choice}
              type="button"
              disabled={Boolean(myChoice)}
              onClick={() => pick(choice)}
              className={`rounded-xl border py-8 px-4 text-center font-bold transition-colors disabled:opacity-100 ${
                isMine || isPartners
                  ? "border-[#3a7d44] bg-[#eef6f0] text-[#2d1a0e]"
                  : "border-[#e0d8ce] text-[#2d1a0e] hover:border-[#3a7d44] hover:bg-[#eef6f0]"
              }`}
            >
              {label}
              {isMine && !isPartners && <div className="text-xs font-normal text-[#7a6e65] mt-1">You</div>}
              {isPartners && !isMine && (
                <div className="text-xs font-normal text-[#7a6e65] mt-1">{partnerFirstName}</div>
              )}
              {isMine && isPartners && (
                <div className="text-xs font-normal text-[#3a7d44] mt-1">You both ✓</div>
              )}
            </button>
          );
        })}
      </div>
      {myChoice && !partnerChoice && (
        <p className="text-sm text-[#7a6e65] text-center">Waiting for {partnerFirstName}…</p>
      )}
    </Card>
  );
}

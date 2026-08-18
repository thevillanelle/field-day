"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HOT_TAKE_PROMPTS } from "@/lib/hot-take";

interface RatePayload {
  fromUserId: string;
  promptId: string;
  value: number;
}

const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const REVEAL_DELAY_MS = 1600;

export function LiveHotTake({
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
  const [myValue, setMyValue] = useState<number | null>(null);
  const [partnerValue, setPartnerValue] = useState<number | null>(null);
  const [closeCalls, setCloseCalls] = useState(0);
  const [finished, setFinished] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const stepRef = useRef(step);
  const myValueRef = useRef<number | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    myValueRef.current = myValue;
  }, [myValue]);

  const prompt = HOT_TAKE_PROMPTS[step];

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`live:${realtimeToken}:hot-take`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others = Object.keys(state).filter((key) => key !== userId);
        setPartnerPresent(others.length > 0);
      })
      .on("broadcast", { event: "rate" }, ({ payload }) => {
        const event = payload as RatePayload;
        if (event.fromUserId === userId) return;
        if (event.promptId !== HOT_TAKE_PROMPTS[stepRef.current]?.id) return;
        setPartnerValue(event.value);
        if (myValueRef.current !== null) revealAndAdvance(myValueRef.current, event.value);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ userId });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeToken, userId]);

  function revealAndAdvance(mine: number, theirs: number) {
    if (Math.abs(mine - theirs) <= 1) setCloseCalls((c) => c + 1);

    setTimeout(() => {
      setMyValue(null);
      setPartnerValue(null);
      setStep((s) => {
        const next = s + 1;
        if (next >= HOT_TAKE_PROMPTS.length) {
          setFinished(true);
          return s;
        }
        return next;
      });
    }, REVEAL_DELAY_MS);
  }

  function rate(value: number) {
    if (myValue !== null) return;
    setMyValue(value);
    channelRef.current?.send({
      type: "broadcast",
      event: "rate",
      payload: { fromUserId: userId, promptId: prompt.id, value } satisfies RatePayload,
    });
    if (partnerValue !== null) revealAndAdvance(value, partnerValue);
  }

  if (!partnerPresent) {
    return (
      <Card className="rounded-2xl border border-[#e0d8ce] p-10 flex flex-col items-center gap-3 text-center">
        <div className="text-3xl animate-pulse">📡</div>
        <p className="font-bold text-[#2d1a0e]">Waiting for {partnerFirstName} to join…</p>
        <Link href={`/play/${matchId}`}>
          <Button variant="outline" className="rounded-full border-[#e0d8ce] mt-2">Back to match</Button>
        </Link>
      </Card>
    );
  }

  if (finished) {
    return (
      <Card className="rounded-2xl border border-[#e0d8ce] p-10 flex flex-col items-center gap-3 text-center">
        <div className="text-3xl">🔥</div>
        <p className="font-bold text-[#2d1a0e]">
          You were within a point on {closeCalls} of {HOT_TAKE_PROMPTS.length} takes!
        </p>
        <Link href="/dashboard">
          <Button className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white mt-2">Back to dashboard</Button>
        </Link>
      </Card>
    );
  }

  const revealed = myValue !== null && partnerValue !== null;

  return (
    <Card className="rounded-2xl border border-[#e0d8ce] p-8 gap-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44]">
        Live · Hot Take · {step + 1} of {HOT_TAKE_PROMPTS.length}
      </p>
      <p className="text-lg font-bold text-[#2d1a0e] text-center">&ldquo;{prompt.statement}&rdquo;</p>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {SCALE.map((n) => {
          const isMine = myValue === n;
          const isPartners = revealed && partnerValue === n;
          return (
            <button
              key={n}
              type="button"
              disabled={myValue !== null}
              onClick={() => rate(n)}
              className={`rounded-lg border py-3 text-center font-bold transition-colors disabled:opacity-100 ${
                isMine || isPartners
                  ? "border-[#3a7d44] bg-[#eef6f0] text-[#2d1a0e]"
                  : "border-[#e0d8ce] text-[#2d1a0e] hover:border-[#3a7d44] hover:bg-[#eef6f0]"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {myValue !== null && partnerValue === null && (
        <p className="text-sm text-[#7a6e65] text-center">Waiting for {partnerFirstName}…</p>
      )}
    </Card>
  );
}

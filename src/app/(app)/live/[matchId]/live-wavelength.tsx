"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WAVELENGTH_PROMPTS } from "@/lib/wavelength";

interface PlacePayload {
  fromUserId: string;
  promptId: string;
  value: number;
}

const REVEAL_DELAY_MS = 1800;
const CLOSE_THRESHOLD = 15;

export function LiveWavelength({
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
  const [slider, setSlider] = useState(50);
  const [myValue, setMyValue] = useState<number | null>(null);
  const [partnerValue, setPartnerValue] = useState<number | null>(null);
  const [aligned, setAligned] = useState(0);
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

  const prompt = WAVELENGTH_PROMPTS[step];

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`live:${realtimeToken}:wavelength`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others = Object.keys(state).filter((key) => key !== userId);
        setPartnerPresent(others.length > 0);
      })
      .on("broadcast", { event: "place" }, ({ payload }) => {
        const event = payload as PlacePayload;
        if (event.fromUserId === userId) return;
        if (event.promptId !== WAVELENGTH_PROMPTS[stepRef.current]?.id) return;
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
    if (Math.abs(mine - theirs) <= CLOSE_THRESHOLD) setAligned((a) => a + 1);

    setTimeout(() => {
      setMyValue(null);
      setPartnerValue(null);
      setSlider(50);
      setStep((s) => {
        const next = s + 1;
        if (next >= WAVELENGTH_PROMPTS.length) {
          setFinished(true);
          return s;
        }
        return next;
      });
    }, REVEAL_DELAY_MS);
  }

  function lockIn() {
    if (myValue !== null) return;
    setMyValue(slider);
    channelRef.current?.send({
      type: "broadcast",
      event: "place",
      payload: { fromUserId: userId, promptId: prompt.id, value: slider } satisfies PlacePayload,
    });
    if (partnerValue !== null) revealAndAdvance(slider, partnerValue);
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
        <div className="text-3xl">〰️</div>
        <p className="font-bold text-[#2d1a0e]">
          You were on the same wavelength {aligned} of {WAVELENGTH_PROMPTS.length} times!
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
        Live · Wavelength · {step + 1} of {WAVELENGTH_PROMPTS.length}
      </p>
      <div className="flex justify-between text-sm font-bold text-[#2d1a0e]">
        <span>{prompt.left}</span>
        <span>{prompt.right}</span>
      </div>

      <div className="relative h-8">
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 rounded-full bg-[#e0d8ce]" />
        {revealed && (
          <>
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-4 rounded-full bg-[#3a7d44] border-2 border-white shadow"
              style={{ left: `${myValue}%` }}
              title="You"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-4 rounded-full bg-[#e85d8a] border-2 border-white shadow"
              style={{ left: `${partnerValue}%` }}
              title={partnerFirstName}
            />
          </>
        )}
      </div>

      {myValue === null ? (
        <>
          <input
            type="range"
            min={0}
            max={100}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
            className="w-full accent-[#3a7d44]"
          />
          <Button
            onClick={lockIn}
            className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white self-center px-8"
          >
            Lock it in
          </Button>
        </>
      ) : (
        <p className="text-sm text-[#7a6e65] text-center">
          {revealed ? "Nice." : `Waiting for ${partnerFirstName}…`}
        </p>
      )}
    </Card>
  );
}

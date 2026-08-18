"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThisOrThatGame } from "./this-or-that-game";
import { SafetyMenu } from "./safety-menu";
import { reportExternalGameDone, signalPlayAgain } from "@/app/actions/match";

const BUILT_NATIVE_GAMES = new Set(["this-or-that"]);

interface MatchDetail {
  match: { suggested_game: string; match_reason: { why: string } };
  game?: { name: string; description: string; is_native: boolean; external_url: string | null };
  partner: { firstName: string; avatarUrl: string | null; bio: string | null };
  myDone: boolean;
  theirDone: boolean;
  bothDone: boolean;
  myPlayAgain: boolean;
  partnerPlayAgain: boolean;
}

export function MatchView({ matchId, detail }: { matchId: string; detail: MatchDetail }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { game, partner, myDone, theirDone, bothDone, myPlayAgain, partnerPlayAgain } = detail;

  const isNative = game?.is_native ?? false;
  const playingBuiltNative = isNative && BUILT_NATIVE_GAMES.has(detail.match.suggested_game);
  const showThisOrThatFallback = isNative && !BUILT_NATIVE_GAMES.has(detail.match.suggested_game);

  async function handleExternalDone() {
    setPending(true);
    await reportExternalGameDone(matchId);
    setPending(false);
    router.refresh();
  }

  async function handlePlayAgain() {
    setPending(true);
    await signalPlayAgain(matchId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border border-[#e0d8ce] p-6 flex flex-row items-center gap-4">
        <Avatar size="lg">
          {partner.avatarUrl && <AvatarImage src={partner.avatarUrl} alt={partner.firstName} />}
          <AvatarFallback>{partner.firstName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-[#2d1a0e]">{partner.firstName}</p>
          {partner.bio && <p className="text-sm text-[#7a6e65] line-clamp-2">{partner.bio}</p>}
        </div>
      </Card>

      <SafetyMenu matchId={matchId} partnerFirstName={partner.firstName} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44] mb-1">
          Your game
        </p>
        <h1 className="text-xl font-bold text-[#2d1a0e]">{game?.name ?? detail.match.suggested_game}</h1>
        <p className="text-sm text-[#7a6e65] mt-1">{detail.match.match_reason.why}</p>
      </div>

      {bothDone ? (
        <Card className="rounded-2xl border border-[#e0d8ce] p-8 flex flex-col items-center gap-3 text-center">
          <div className="text-3xl">🎉</div>
          <p className="font-bold text-[#2d1a0e]">You both finished {game?.name ?? "the game"}!</p>
          {myPlayAgain && partnerPlayAgain ? (
            <>
              <p className="text-sm text-[#7a6e65]">You both want a second round.</p>
              <Link href={`/live/${matchId}`}>
                <Button className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white mt-2">
                  Go live →
                </Button>
              </Link>
            </>
          ) : myPlayAgain ? (
            <p className="text-sm text-[#7a6e65]">Waiting to see if {partner.firstName} wants a rematch.</p>
          ) : (
            <Button
              onClick={handlePlayAgain}
              disabled={pending}
              className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white mt-2"
            >
              Play again with {partner.firstName}?
            </Button>
          )}
          <Link href={`/field-notes/${matchId}`} className="text-sm text-[#3a7d44] underline underline-offset-2 mt-1">
            Leave a field note →
          </Link>
        </Card>
      ) : myDone ? (
        <Card className="rounded-2xl border border-[#e0d8ce] p-8 flex flex-col items-center gap-3 text-center">
          <div className="text-3xl">⏳</div>
          <p className="font-bold text-[#2d1a0e]">You&apos;re done!</p>
          <p className="text-sm text-[#7a6e65]">Waiting on {partner.firstName} to finish.</p>
          <Button variant="outline" onClick={() => router.refresh()} className="rounded-full border-[#e0d8ce] mt-2">
            Check again
          </Button>
        </Card>
      ) : playingBuiltNative ? (
        <ThisOrThatGame matchId={matchId} onComplete={() => router.refresh()} />
      ) : showThisOrThatFallback ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[#7a6e65]">
            {game?.name ?? "This game"} is still in the workshop — playing This or That instead, just as good.
          </p>
          <ThisOrThatGame matchId={matchId} onComplete={() => router.refresh()} />
        </div>
      ) : (
        <Card className="rounded-2xl border border-[#e0d8ce] p-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-[#7a6e65]">{game?.description}</p>
          {game?.external_url && (
            <a href={game.external_url} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white">
                Open {game.name} →
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            onClick={handleExternalDone}
            disabled={pending}
            className="rounded-full border-[#e0d8ce]"
          >
            {theirDone ? "I finished too" : "I finished — log it"}
          </Button>
        </Card>
      )}
    </div>
  );
}

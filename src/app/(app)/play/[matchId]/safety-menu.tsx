"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportUser, blockUserFromMatch } from "@/app/actions/safety";

const REASONS = [
  "Inappropriate messages",
  "Fake profile",
  "Harassment",
  "Made me uncomfortable",
  "Other",
];

export function SafetyMenu({ matchId, partnerFirstName }: { matchId: string; partnerFirstName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "report" | "confirmBlock">("closed");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submitReport() {
    if (!reason) return;
    setPending(true);
    const result = await reportUser(matchId, reason, details, alsoBlock);
    setPending(false);
    if (!result?.error) {
      setDone(alsoBlock ? `Reported and blocked ${partnerFirstName}.` : `Reported ${partnerFirstName}.`);
      setMode("closed");
      router.refresh();
    }
  }

  async function confirmBlock() {
    setPending(true);
    await blockUserFromMatch(matchId);
    setPending(false);
    setDone(`Blocked ${partnerFirstName}.`);
    setMode("closed");
    router.refresh();
  }

  if (done) {
    return <p className="text-sm text-[#7a6e65]">{done}</p>;
  }

  if (mode === "closed") {
    return (
      <div className="flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => setMode("report")}
          className="text-[#7a6e65] underline underline-offset-2 hover:text-[#2d1a0e]"
        >
          Report {partnerFirstName}
        </button>
        <button
          type="button"
          onClick={() => setMode("confirmBlock")}
          className="text-[#7a6e65] underline underline-offset-2 hover:text-[#2d1a0e]"
        >
          Block {partnerFirstName}
        </button>
      </div>
    );
  }

  if (mode === "confirmBlock") {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-[#2d1a0e]">
          Block {partnerFirstName}? You won&apos;t be matched again and this match will end.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={confirmBlock}
            className="rounded-full"
          >
            Yes, block
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode("closed")} className="rounded-full border-[#e0d8ce]">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="font-medium text-[#2d1a0e]">Report {partnerFirstName}</p>
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={`text-xs rounded-full border px-3 py-1.5 transition-colors ${
              reason === r
                ? "border-[#3a7d44] bg-[#eef6f0] text-[#2d1a0e]"
                : "border-[#e0d8ce] text-[#7a6e65] hover:border-[#3a7d44]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <Textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Anything else we should know? (optional)"
        className="border-[#e0d8ce] min-h-16"
      />
      <label className="flex items-center gap-2 text-xs text-[#7a6e65]">
        <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
        Also block {partnerFirstName}
      </label>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!reason || pending}
          onClick={submitReport}
          className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white"
        >
          Submit report
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMode("closed")} className="rounded-full border-[#e0d8ce]">
          Cancel
        </Button>
      </div>
    </div>
  );
}

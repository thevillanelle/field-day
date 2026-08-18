"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { findMatch } from "@/app/actions/discover";
import type { Vertical } from "@/lib/types";

export function FindMatchButton({ vertical, label }: { vertical: Extract<Vertical, "dating" | "friends">; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await findMatch(vertical);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.matchId) router.push(`/play/${result.matchId}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleClick}
        disabled={pending}
        className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white h-10 px-6"
      >
        {pending ? "Finding someone…" : label}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

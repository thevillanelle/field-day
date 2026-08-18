"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendFieldNote } from "@/app/actions/field-notes";
import type { DbFieldNote } from "@/lib/types";

interface Detail {
  userId: string;
  partnerFirstName: string;
  notes: DbFieldNote[];
}

function noteText(note: DbFieldNote): string {
  if (note.type === "message" && typeof note.content?.text === "string") {
    return note.content.text;
  }
  return "(untitled note)";
}

export function FieldNotesThread({ matchId, initial }: { matchId: string; initial: Detail }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!draft.trim()) return;
    setPending(true);
    setError(null);
    const result = await sendFieldNote(matchId, draft);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    setDraft("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3a7d44] mb-1">
          Field notes
        </p>
        <h1 className="text-xl font-bold text-[#2d1a0e]">You &amp; {initial.partnerFirstName}</h1>
      </div>

      <div className="flex flex-col gap-3">
        {initial.notes.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-2 border-[#e0d8ce] p-8 text-center">
            <p className="text-sm text-[#7a6e65]">
              No notes yet — leave {initial.partnerFirstName} something.
            </p>
          </Card>
        ) : (
          initial.notes.map((note) => {
            const mine = note.from_user_id === initial.userId;
            return (
              <div key={note.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm ${
                    mine
                      ? "bg-[#3a7d44] text-white"
                      : "bg-white border border-[#e0d8ce] text-[#2d1a0e]"
                  }`}
                >
                  {noteText(note)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Card className="rounded-2xl border border-[#e0d8ce] p-4 gap-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Leave a note for ${initial.partnerFirstName}…`}
          maxLength={500}
          className="border-[#e0d8ce] min-h-20"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          onClick={handleSend}
          disabled={pending || !draft.trim()}
          className="rounded-full bg-[#3a7d44] hover:bg-[#2e6337] text-white self-end px-6"
        >
          {pending ? "Sending…" : "Send"}
        </Button>
      </Card>
    </div>
  );
}

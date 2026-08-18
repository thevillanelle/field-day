import { redirect } from "next/navigation";
import { getLiveSession } from "@/app/actions/match";
import { LiveThisOrThat } from "./live-this-or-that";

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const session = await getLiveSession(matchId);

  if ("error" in session) redirect(`/play/${matchId}`);

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-10">
      <LiveThisOrThat
        matchId={matchId}
        realtimeToken={session.realtimeToken}
        userId={session.userId}
        partnerFirstName={session.partnerFirstName}
      />
    </div>
  );
}

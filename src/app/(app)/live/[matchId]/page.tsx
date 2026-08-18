import { redirect } from "next/navigation";
import { getLiveSession } from "@/app/actions/match";
import { LiveThisOrThat } from "./live-this-or-that";
import { LiveHotTake } from "./live-hot-take";
import { LiveWavelength } from "./live-wavelength";

// Live is meant to be a real-time bonus round regardless of what was played
// async — only games with their own live variant use it; anything else
// (Story Chain, external games) falls back to This or That as the live
// round, same "don't dead-end" reasoning as the async fallback.
export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const session = await getLiveSession(matchId);

  if ("error" in session) redirect(`/play/${matchId}`);

  const props = {
    matchId,
    realtimeToken: session.realtimeToken,
    userId: session.userId,
    partnerFirstName: session.partnerFirstName,
  };

  const LiveComponent =
    session.suggestedGame === "hot-take"
      ? LiveHotTake
      : session.suggestedGame === "wavelength"
        ? LiveWavelength
        : LiveThisOrThat;

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-10">
      <LiveComponent {...props} />
    </div>
  );
}

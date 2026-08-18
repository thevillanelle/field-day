import { redirect } from "next/navigation";
import { getMatchDetail } from "@/app/actions/match";
import { MatchView } from "./match-view";

export default async function PlayMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const detail = await getMatchDetail(matchId);

  if ("error" in detail) redirect("/discover");

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-10">
      <MatchView matchId={matchId} detail={detail} />
    </div>
  );
}

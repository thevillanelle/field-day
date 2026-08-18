import { redirect } from "next/navigation";
import { getFieldNotes } from "@/app/actions/field-notes";
import { FieldNotesThread } from "./field-notes-thread";

export default async function FieldNotesPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  let detail;
  try {
    detail = await getFieldNotes(matchId);
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-10">
      <FieldNotesThread matchId={matchId} initial={detail} />
    </div>
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { listOpenReports } from "@/app/actions/safety";
import { ReportsList } from "./reports-list";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/dashboard");

  const reports = await listOpenReports();

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2d1a0e]">Reports</h1>
        <p className="text-[#7a6e65] mt-1">{reports.length} total</p>
      </div>
      <ReportsList reports={reports} />
    </div>
  );
}

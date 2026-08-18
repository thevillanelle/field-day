"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateReportStatus } from "@/app/actions/safety";
import type { DbReport } from "@/lib/types";

type ReportRow = DbReport & {
  reporter: { id: string; name: string; email: string } | null;
  reportedUser: { id: string; name: string; email: string } | null;
};

const STATUSES = ["open", "reviewed", "actioned", "dismissed"];

export function ReportsList({ reports }: { reports: ReportRow[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-[#7a6e65]">No reports yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reports.map((report) => (
        <ReportRow key={report.id} report={report} />
      ))}
    </div>
  );
}

function ReportRow({ report }: { report: ReportRow }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setStatus(status: string) {
    setPending(true);
    await updateReportStatus(report.id, status);
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="rounded-2xl border border-[#e0d8ce] p-5 gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[#2d1a0e]">{report.reason}</p>
        <Badge variant={report.status === "open" ? "default" : "secondary"}>{report.status}</Badge>
      </div>
      <p className="text-sm text-[#7a6e65]">
        {report.reporter?.name ?? "Unknown"} ({report.reporter?.email ?? "?"}) reported{" "}
        {report.reportedUser?.name ?? "Unknown"} ({report.reportedUser?.email ?? "?"})
      </p>
      {report.details && <p className="text-sm text-[#2d1a0e]">{report.details}</p>}
      <p className="text-xs text-[#7a6e65]">{new Date(report.created_at).toLocaleString()}</p>
      <div className="flex gap-2 flex-wrap">
        {STATUSES.filter((s) => s !== report.status).map((s) => (
          <Button
            key={s}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setStatus(s)}
            className="rounded-full border-[#e0d8ce]"
          >
            Mark {s}
          </Button>
        ))}
      </div>
    </Card>
  );
}

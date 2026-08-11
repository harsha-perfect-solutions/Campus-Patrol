import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { ReportDetail } from "../reports.$reportId";

export const Route = createFileRoute("/hod/cases/$reportId")({
  head: ({ params }) => ({ meta: [{ title: `Case ${params.reportId} — HOD Review` }] }),
  component: HODCaseDetailPage,
});

function HODCaseDetailPage() {
  return (
    <RoleGuard allowedRoles={["hod"]}>
      <ReportDetail />
    </RoleGuard>
  );
}

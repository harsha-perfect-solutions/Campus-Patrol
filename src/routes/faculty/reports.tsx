import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { ReportsTable } from "../reports.index";
import { useCmadms } from "@/lib/cmadms-store";

export const Route = createFileRoute("/faculty/reports")({
  head: () => ({ meta: [{ title: "My Reports — Faculty Portal" }] }),
  component: FacultyReportsPage,
});

function FacultyReportsPage() {
  const { reports } = useCmadms();
  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Reports"
          description="Track unauthorized movement cases submitted by you."
          breadcrumb={[{ label: "Faculty", to: "/faculty/dashboard" }, { label: "My Reports" }]}
        />
        <ReportsTable
          reports={reports}
          title="Faculty Submitted Reports"
          description="Cases filed by faculty and undergoing student explanation/HOD review."
        />
      </div>
    </RoleGuard>
  );
}

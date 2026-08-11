import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { ReportsTable } from "../reports.index";
import { useCmadms } from "@/lib/cmadms-store";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hod/cases")({
  head: () => ({ meta: [{ title: "Department Cases Queue — HOD Portal" }] }),
  component: HODCasesPage,
});

function HODCasesPage() {
  const { reports } = useCmadms();
  const { profile } = useAuth();

  const userDept = profile?.department || "CSE";
  const departmentReports = reports.filter((r) => r.department === userDept);

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        <PageHeader
          title={`${userDept} Department Cases Queue`}
          description={`Review unauthorized movement violation reports submitted for ${userDept} department.`}
          breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Cases" }]}
        />

        <ReportsTable
          reports={departmentReports}
          title={`${userDept} Department Violation Case Files`}
          description="Review student explanations and execute final HOD decisions."
        />
      </div>
    </RoleGuard>
  );
}

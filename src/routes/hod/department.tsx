import { createFileRoute } from "@tanstack/react-router";
import { Building2, GraduationCap, Users } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hod/department")({
  head: () => ({ meta: [{ title: "Department Overview — HOD Portal" }] }),
  component: HODDepartmentPage,
});

function HODDepartmentPage() {
  const { profile } = useAuth();
  const userDept = profile?.department || "CSE";

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="Department Discipline Overview"
          description={`${userDept} Department Structure & Metrics.`}
          breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Department Overview" }]}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Total Students
            </span>
            <p className="text-3xl font-extrabold text-foreground mt-2">1,240</p>
          </div>
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Faculty Members
            </span>
            <p className="text-3xl font-extrabold text-foreground mt-2">48</p>
          </div>
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Active Classrooms
            </span>
            <p className="text-3xl font-extrabold text-foreground mt-2">16 Rooms</p>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

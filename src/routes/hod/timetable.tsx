import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { TimetablePage } from "../timetable";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hod/timetable")({
  head: () => ({ meta: [{ title: "Department Timetable — HOD Portal" }] }),
  component: HODTimetablePage,
});

function HODTimetablePage() {
  const { profile } = useAuth();
  const userDept = profile?.department || "CSE";

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="Department Master Timetable"
          description={`Master teaching schedule and room allocation across ${userDept} department.`}
          breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Department Timetable" }]}
        />
        <TimetablePage hideHeader />
      </div>
    </RoleGuard>
  );
}

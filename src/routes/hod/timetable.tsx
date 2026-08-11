import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { TimetablePage } from "../timetable";

export const Route = createFileRoute("/hod/timetable")({
  head: () => ({ meta: [{ title: "Department Timetable — HOD Portal" }] }),
  component: HODTimetablePage,
});

function HODTimetablePage() {
  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="Department Master Timetable"
          description="Master teaching schedule and room allocation across CSE department."
          breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Department Timetable" }]}
        />
        <TimetablePage />
      </div>
    </RoleGuard>
  );
}

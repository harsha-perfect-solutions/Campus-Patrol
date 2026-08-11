import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { TimetablePage } from "../timetable";

export const Route = createFileRoute("/faculty/timetable")({
  head: () => ({ meta: [{ title: "My Timetable — Faculty Portal" }] }),
  component: FacultyTimetablePage,
});

function FacultyTimetablePage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Timetable"
          description="View your teaching schedule and classroom period assignments."
          breadcrumb={[{ label: "Faculty", to: "/faculty/dashboard" }, { label: "My Timetable" }]}
        />
        <TimetablePage />
      </div>
    </RoleGuard>
  );
}

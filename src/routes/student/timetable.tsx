import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { TimetablePage } from "../timetable";

export const Route = createFileRoute("/student/timetable")({
  head: () => ({ meta: [{ title: "My Timetable — Student Portal" }] }),
  component: StudentTimetablePage,
});

function StudentTimetablePage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Timetable"
          description="View your semester class schedule and assigned rooms."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "My Timetable" }]}
        />
        <TimetablePage hideHeader />
      </div>
    </RoleGuard>
  );
}

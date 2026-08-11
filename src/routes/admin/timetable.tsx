import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { TimetablePage } from "../timetable";

export const Route = createFileRoute("/admin/timetable")({
  head: () => ({ meta: [{ title: "Master Timetable — Admin Console" }] }),
  component: AdminTimetablePage,
});

function AdminTimetablePage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Master Institutional Timetable"
          description="Manage period schedules, time slots and master timetable master."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Master Timetable" }]}
        />
        <TimetablePage />
      </div>
    </RoleGuard>
  );
}

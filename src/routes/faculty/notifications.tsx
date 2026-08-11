import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { NotificationsPage } from "../notifications";

export const Route = createFileRoute("/faculty/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Faculty Portal" }] }),
  component: FacultyNotificationsPage,
});

function FacultyNotificationsPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <NotificationsPage />
    </RoleGuard>
  );
}

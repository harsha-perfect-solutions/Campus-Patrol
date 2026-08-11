import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { NotificationsPage } from "../notifications";

export const Route = createFileRoute("/student/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Student Portal" }] }),
  component: StudentNotificationsPage,
});

function StudentNotificationsPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <NotificationsPage />
    </RoleGuard>
  );
}

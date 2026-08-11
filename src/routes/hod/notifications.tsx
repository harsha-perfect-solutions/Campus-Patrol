import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { NotificationsPage } from "../notifications";

export const Route = createFileRoute("/hod/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HOD Portal" }] }),
  component: HODNotificationsPage,
});

function HODNotificationsPage() {
  return (
    <RoleGuard allowedRoles={["hod"]}>
      <NotificationsPage />
    </RoleGuard>
  );
}

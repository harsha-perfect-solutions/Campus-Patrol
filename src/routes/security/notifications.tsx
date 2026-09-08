import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { NotificationsPage } from "../notifications";

export const Route = createFileRoute("/security/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Security Portal" }] }),
  component: SecurityNotificationsPage,
});

function SecurityNotificationsPage() {
  return (
    <RoleGuard allowedRoles={["security"]}>
      <NotificationsPage />
    </RoleGuard>
  );
}


import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { SettingsPage } from "../settings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "System Settings — Admin Console" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <SettingsPage />
    </RoleGuard>
  );
}

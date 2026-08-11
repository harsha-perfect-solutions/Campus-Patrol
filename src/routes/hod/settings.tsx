import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { SettingsPage } from "../settings";

export const Route = createFileRoute("/hod/settings")({
  head: () => ({ meta: [{ title: "Settings — HOD Portal" }] }),
  component: HODSettingsPage,
});

function HODSettingsPage() {
  return (
    <RoleGuard allowedRoles={["hod"]}>
      <SettingsPage />
    </RoleGuard>
  );
}

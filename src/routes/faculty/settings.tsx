import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { SettingsPage } from "../settings";

export const Route = createFileRoute("/faculty/settings")({
  head: () => ({ meta: [{ title: "Settings — Faculty Portal" }] }),
  component: FacultySettingsPage,
});

function FacultySettingsPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <SettingsPage />
    </RoleGuard>
  );
}

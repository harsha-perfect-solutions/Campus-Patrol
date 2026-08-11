import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { SettingsPage } from "../settings";

export const Route = createFileRoute("/student/settings")({
  head: () => ({ meta: [{ title: "Settings — Student Portal" }] }),
  component: StudentSettingsPage,
});

function StudentSettingsPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <SettingsPage />
    </RoleGuard>
  );
}

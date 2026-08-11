import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({ meta: [{ title: "Rooms & Buildings — Admin Console" }] }),
  component: AdminRoomsPage,
});

function AdminRoomsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Rooms & Campus Buildings"
          description="Manage classroom numbers, laboratories, and building locations."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Rooms" }]}
        />
        <div className="card-surface p-5 rounded-2xl border border-border text-xs">
          <p className="text-muted-foreground">Classroom inventory active (Rooms C-101 through C-308).</p>
        </div>
      </div>
    </RoleGuard>
  );
}

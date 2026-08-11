import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { faculty } from "@/lib/cmadms-data";

export const Route = createFileRoute("/admin/faculty")({
  head: () => ({ meta: [{ title: "Faculty Master — Admin Console" }] }),
  component: AdminFacultyPage,
});

function AdminFacultyPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Faculty & Teaching Staff Master"
          description="Manage faculty profiles, staff codes and teaching assignments."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Faculty Master" }]}
        />

        <div className="card-surface p-5 rounded-2xl border border-border text-xs max-w-md space-y-2">
          <span className="font-bold text-foreground text-sm block">{faculty.name}</span>
          <p className="text-muted-foreground">Staff Code: <strong className="text-foreground">{faculty.role}</strong></p>
          <p className="text-muted-foreground">Department: <strong className="text-foreground">{faculty.department}</strong></p>
        </div>
      </div>
    </RoleGuard>
  );
}

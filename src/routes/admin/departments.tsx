import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/admin/departments")({
  head: () => ({ meta: [{ title: "Departments — Admin Console" }] }),
  component: AdminDepartmentsPage,
});

function AdminDepartmentsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Academic Departments"
          description="Manage institutional departments and section structures."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Departments" }]}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"].map((dept) => (
            <div key={dept} className="card-surface p-5 rounded-2xl border border-border text-xs">
              <span className="font-bold text-foreground text-sm block">{dept} Department</span>
              <p className="text-muted-foreground mt-1">Status: Active</p>
            </div>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/admin/courses")({
  head: () => ({ meta: [{ title: "Courses — Admin Console" }] }),
  component: AdminCoursesPage,
});

function AdminCoursesPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Academic Courses"
          description="Manage course subjects, credits and curriculum offerings."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Courses" }]}
        />
        <div className="card-surface p-5 rounded-2xl border border-border text-xs">
          <p className="text-muted-foreground">Course catalog database active.</p>
        </div>
      </div>
    </RoleGuard>
  );
}

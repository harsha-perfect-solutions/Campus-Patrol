import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { students } from "@/lib/cmadms-data";

export const Route = createFileRoute("/admin/students")({
  head: () => ({ meta: [{ title: "Student Master — Admin Console" }] }),
  component: AdminStudentsPage,
});

function AdminStudentsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Student Master Database"
          description="Manage institutional student profiles, enrollments and semester assignments."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Students" }]}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {students.map((s) => (
            <div key={s.id} className="card-surface p-5 rounded-2xl border border-border text-xs space-y-2">
              <span className="font-bold text-foreground text-sm block">{s.name}</span>
              <p className="text-muted-foreground">Roll No: <strong className="text-foreground">{s.id}</strong></p>
              <p className="text-muted-foreground">Dept: <strong className="text-foreground">{s.department}</strong></p>
              <p className="text-muted-foreground">Year/Sec: <strong className="text-foreground">{s.year} &bull; {s.section}</strong></p>
            </div>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}

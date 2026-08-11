import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Calendar, CheckCircle2, Database, FolderGit2, GraduationCap, Key, ShieldAlert, UserCog, Users } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Console — CMADMS" }] }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}

function AdminDashboardContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CMADMS System Administration"
        description="Master Management Console for Users, Academic Structures, Timetables, and System Policies."
        breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Dashboard" }]}
      />

      {/* Global System Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Students", value: "3,480", icon: GraduationCap, color: "bg-emerald-100 text-emerald-700" },
          { label: "Faculty Members", value: "142", icon: UserCog, color: "bg-blue-100 text-blue-700" },
          { label: "HOD Offices", value: "8", icon: Building2, color: "bg-indigo-100 text-indigo-700" },
          { label: "Active Gate Passes", value: "64", icon: CheckCircle2, color: "bg-amber-100 text-amber-700" },
        ].map((s) => (
          <div key={s.label} className="card-surface p-5 rounded-2xl border border-border shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <span className={`grid size-8 place-items-center rounded-xl ${s.color}`}>
                <s.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Admin Master Modules Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Reported Cases", desc: "Monitor all unauthorized movement reports across departments", to: "/admin/reports", icon: ShieldAlert },
          { title: "User Management", desc: "Manage Faculty, HOD, Student & Admin user accounts", to: "/admin/users", icon: Users },
          { title: "Student Master", desc: "Manage enrolled student profiles and semester records", to: "/admin/students", icon: GraduationCap },
          { title: "Faculty Master", desc: "Manage staff codes, departments & subject assignments", to: "/admin/faculty", icon: UserCog },
          { title: "Departments", desc: "Manage CSE, ECE, EEE, MECH & CIVIL structures", to: "/admin/departments", icon: Building2 },
          { title: "Master Timetable", desc: "Schedule periods, time slots & classroom allocations", to: "/admin/timetable", icon: Calendar },
          { title: "Pass Policies", desc: "Configure gate pass permission policies and rules", to: "/admin/permissions", icon: CheckCircle2 },
          { title: "Audit Logs", desc: "Track system access, reports & administrative actions", to: "/admin/audit-logs", icon: FolderGit2 },
        ].map((m) => (
          <div key={m.title} className="card-surface p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <m.icon className="size-4" />
                </span>
                <h3 className="font-bold text-foreground text-sm">{m.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{m.desc}</p>
            </div>
            <Button variant="outline" size="sm" asChild className="mt-4 w-full rounded-xl font-semibold text-xs">
              <Link to={m.to as any}>Open Module &rarr;</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  CheckCircle2,
  DoorOpen,
  FolderGit2,
  GraduationCap,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  getAdminDashboardStatsApi,
  getAdminViolationReportsApi,
} from "@/lib/api/admin.server";
import type { AdminDashboardStats } from "@/lib/db/admin.server";
import type { DBViolationReport } from "@/lib/db/violations.server";
import { AlertTriangle, ArrowRight, Shield } from "lucide-react";

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
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalStudents: 0,
    totalFaculty: 0,
    totalHods: 8,
    activeGatePasses: 0,
    totalUsers: 0,
    totalDepartments: 6,
    totalReports: 0,
    totalAuditLogs: 0,
  });
  const [criticalReports, setCriticalReports] = useState<DBViolationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const [res, criticalRes] = await Promise.all([
          getAdminDashboardStatsApi(),
          getAdminViolationReportsApi({ data: { severity: "Critical" } }),
        ]);
        if (isMounted && res.success && res.stats) {
          setStats(res.stats);
        }
        if (isMounted && criticalRes.success) {
          setCriticalReports(
            criticalRes.reports.filter((r) => r.status !== "resolved" && r.status !== "dismissed").slice(0, 3),
          );
        }
      } catch (err) {
        console.error("Failed to load admin stats from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMADMS System Administration"
        description="Master Management Console for Users, Academic Structures, Timetables, and System Policies."
        breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Dashboard" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" asChild className="rounded-xl text-xs font-semibold h-9 flex-1 sm:flex-initial">
              <Link to="/admin/violations">Incidents</Link>
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs h-9 w-full sm:w-auto" asChild>
              <Link to="/admin/emergency">Emergency Center</Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="rounded-xl text-xs font-semibold h-9 flex-1 sm:flex-initial">
              <Link to="/admin/timetable">Timetable</Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="rounded-xl text-xs font-semibold h-9 flex-1 sm:flex-initial">
              <Link to="/notifications">Notifications</Link>
            </Button>
          </div>
        }
      />

      {/* Critical Incidents Banner */}
      {criticalReports.length > 0 && (
        <section className="rounded-2xl border-2 border-red-500/80 bg-red-50/90 dark:bg-red-950/40 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-red-600 text-white shadow-xs animate-pulse shrink-0">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-200 uppercase tracking-wide break-words">
                  🚨 CRITICAL INCIDENT ALERT — {criticalReports.length} Active Case(s)
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400">
                  Critical severity or physical altercation reports requiring institutional triage.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs h-9 w-full sm:w-auto"
                asChild
              >
                <Link to="/admin/emergency">Emergency Command Center &rarr;</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-bold rounded-xl text-xs h-9 w-full sm:w-auto"
                asChild
              >
                <Link to="/admin/violations">Disciplinary Console</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 pt-1">
            {criticalReports.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-white/80 dark:bg-card/80 rounded-xl border border-red-200 dark:border-red-900/60 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-foreground block truncate">
                    {r.student_name} ({r.student_code})
                  </span>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {r.department} • {r.violation_type}
                  </span>
                </div>
                <Button size="sm" variant="ghost" asChild className="h-7 text-xs font-semibold px-2 shrink-0">
                  <Link to="/admin/violations">View &rarr;</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Global System Stats */}
      <div className="grid gap-2.5 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Students",
            value: loading ? "..." : stats.totalStudents.toLocaleString(),
            icon: GraduationCap,
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
          },
          {
            label: "Faculty Members",
            value: loading ? "..." : stats.totalFaculty.toLocaleString(),
            icon: UserCog,
            color: "bg-primary/10 text-primary",
          },
          {
            label: "HOD Offices",
            value: loading ? "..." : stats.totalHods.toLocaleString(),
            icon: Building2,
            color: "bg-primary/10 text-primary",
          },
          {
            label: "Active Gate Passes",
            value: loading ? "..." : stats.activeGatePasses.toLocaleString(),
            icon: CheckCircle2,
            color: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                {s.label}
              </span>
              <span className={`grid size-8 place-items-center rounded-xl ${s.color}`}>
                <s.icon className="size-4" />
              </span>
            </div>
            <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Admin Master Modules Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Incidents & Violations",
            desc: "Disciplinary triage, critical incidents & HOD escalated cases",
            to: "/admin/violations",
            icon: ShieldAlert,
          },
          {
            title: "Movement Passes",
            desc: "Institutional movement pass oversight, live outside tracking & revocation",
            to: "/admin/movement-passes",
            icon: CheckCircle2,
          },
          {
            title: "Master Timetable",
            desc: "Schedule periods, time slots & classroom allocations",
            to: "/admin/timetable",
            icon: Calendar,
          },
          {
            title: "User Management",
            desc: "Manage Faculty, HOD, Student & Admin user accounts",
            to: "/admin/users",
            icon: Users,
          },
          {
            title: "Student Master",
            desc: "Manage enrolled student profiles and semester records",
            to: "/admin/students",
            icon: GraduationCap,
          },
          {
            title: "Faculty Master",
            desc: "Manage staff codes, departments & subject assignments",
            to: "/admin/faculty",
            icon: UserCog,
          },
          {
            title: "Departments",
            desc: "Manage CSE, ECE, EEE, MECH & CIVIL structures",
            to: "/admin/departments",
            icon: Building2,
          },
          {
            title: "Campus Areas & Facilities",
            desc: "Manage campus buildings, canteens, parking zones & lab locations",
            to: "/admin/rooms",
            icon: DoorOpen,
          },
          {
            title: "Audit Logs",
            desc: "Track system access, reports & administrative actions",
            to: "/admin/audit-logs",
            icon: FolderGit2,
          },
        ].map((m) => (
          <div
            key={m.title}
            className="card-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <m.icon className="size-4" />
                </span>
                <h3 className="font-bold text-foreground text-sm">{m.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{m.desc}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="mt-4 w-full rounded-xl font-semibold text-xs"
            >
              <Link to={m.to as any}>Open Module &rarr;</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  CheckCircle2,
  FolderGit2,
  GraduationCap,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getAdminDashboardStatsApi } from "@/lib/api/admin.server";
import type { AdminDashboardStats } from "@/lib/db/admin.server";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const res = await getAdminDashboardStatsApi();
        if (isMounted && res.success && res.stats) {
          setStats(res.stats);
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
      />

      {/* Global System Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
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
            className="card-surface p-5 rounded-2xl border border-border shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {s.label}
              </span>
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
          {
            title: "Reported Cases",
            desc: "Monitor all unauthorized movement reports across departments",
            to: "/admin/reports",
            icon: ShieldAlert,
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
            title: "Master Timetable",
            desc: "Schedule periods, time slots & classroom allocations",
            to: "/admin/timetable",
            icon: Calendar,
          },
          {
            title: "Pass Policies",
            desc: "Configure gate pass permission policies and rules",
            to: "/admin/permissions",
            icon: CheckCircle2,
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
            className="card-surface p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between"
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

import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  UserCheck,
  Building2,
  Search,
  Filter,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAdminMovementPassesApi,
  getAdminMovementPassStatsApi,
} from "@/lib/api/admin.server";
import type { AdminMovementPass, AdminMovementPassStats } from "@/lib/db/admin.server";

export const Route = createFileRoute("/admin/permissions")({
  head: () => ({ meta: [{ title: "Permission Policies & Pass Oversight — Admin Console" }] }),
  component: AdminPermissionsPage,
});

export function AdminPermissionsPage() {
  const [passes, setPasses] = useState<AdminMovementPass[]>([]);
  const [stats, setStats] = useState<AdminMovementPassStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [passesRes, statsRes] = await Promise.all([
          getAdminMovementPassesApi({ data: {} }),
          getAdminMovementPassStatsApi(),
        ]);

        if (isMounted && passesRes.success) setPasses(passesRes.passes);
        if (isMounted && statsRes.success) setStats(statsRes.stats);
      } catch (err) {
        console.error("Failed to load movement passes for admin permission policies:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute late vs on-time stats
  const currentlyOutsideCount = passes.filter((p) => p.currentlyOutside).length;
  const returnedOnTimeCount = passes.filter(
    (p) => p.completed && p.entryAt && p.validUntil && p.entryAt <= p.validUntil,
  ).length;
  const lateReturnCount = passes.filter(
    (p) =>
      (p.completed && p.entryAt && p.validUntil && p.entryAt > p.validUntil) ||
      (p.currentlyOutside && p.validUntil && new Date().toLocaleTimeString("en-US", { hour12: false }) > p.validUntil),
  ).length;

  const filteredPasses = passes.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "outside") return p.currentlyOutside;
    if (statusFilter === "late") {
      return (
        (p.completed && p.entryAt && p.validUntil && p.entryAt > p.validUntil) ||
        (p.currentlyOutside && p.validUntil && new Date().toLocaleTimeString("en-US", { hour12: false }) > p.validUntil)
      );
    }
    if (statusFilter === "ontime") {
      return p.completed && p.entryAt && p.validUntil && p.entryAt <= p.validUntil;
    }
    if (statusFilter === "approved") return p.status === "approved";
    return true;
  });

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Gate & Movement Permission Policies"
          description="Master movement clearance rules, HOD approval audit, and student gate entry/exit compliance oversight."
          breadcrumb={[
            { label: "Admin", to: "/admin/dashboard" },
            { label: "Permission Policies" },
          ]}
          actions={
            <Button
              asChild
              size="sm"
              className="rounded-xl font-semibold bg-primary text-primary-foreground"
            >
              <Link to="/admin/movement-passes">
                Live Movement Console <ArrowUpRight className="size-4 ml-1" />
              </Link>
            </Button>
          }
        />

        {/* System Authorization Policy Callout */}
        <div className="card-surface p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <ShieldCheck className="size-5 shrink-0" />
            <span>Institutional Movement Pass Workflow Policy</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In accordance with campus security protocols: <strong className="text-foreground">Students</strong> submit gate pass requests, which are reviewed and approved exclusively by their respective <strong className="text-foreground">Head of Department (HOD)</strong>. Security guards scan digital QR passes at campus gates. As an <strong className="text-foreground">System Administrator</strong>, your console provides centralized oversight to track active passes, verify student return punctuality (on-time vs late), and enforce institutional compliance across all departments.
          </p>
        </div>

        {/* KPI Metrics Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="card-surface p-4 rounded-2xl border border-border space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Passes</span>
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <p className="text-2xl font-extrabold text-foreground">
              {stats?.totalRequests ?? passes.length}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">Recorded permissions</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Currently Outside</span>
              <UserCheck className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {currentlyOutsideCount}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">Students out of campus</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Returned On-Time</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {returnedOnTimeCount}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">Compliant returns</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Late / Overdue</span>
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <p className="text-2xl font-extrabold text-destructive">
              {lateReturnCount}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium font-bold">Late entry flags</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="card-surface p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student, reason, department..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="size-4 text-muted-foreground hidden sm:inline" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Movements</SelectItem>
                <SelectItem value="outside">Currently Outside Campus</SelectItem>
                <SelectItem value="ontime">Returned On Time</SelectItem>
                <SelectItem value="late">Late Returns / Overdue</SelectItem>
                <SelectItem value="approved">Approved & Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Student Gate Pass Clearance Table */}
        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading movement pass clearance records...
          </div>
        ) : (
          <div className="card-surface p-4 sm:p-6 rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Student Gate Pass Clearance & Attendance Log ({filteredPasses.length})
              </h3>
              <Link
                to="/admin/movement-passes"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View Full Audit History <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            {filteredPasses.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No movement pass records matched your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-divider text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Pass ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Reason / Pass Type</th>
                      <th className="py-3 px-4">Valid Window</th>
                      <th className="py-3 px-4">Approved By (HOD)</th>
                      <th className="py-3 px-4">Gate Exit / Entry</th>
                      <th className="py-3 px-4 text-right">Gate Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider font-medium">
                    {filteredPasses.map((p) => {
                      const isLate =
                        (p.completed && p.entryAt && p.validUntil && p.entryAt > p.validUntil) ||
                        (p.currentlyOutside && p.validUntil && new Date().toLocaleTimeString("en-US", { hour12: false }) > p.validUntil);
                      const isOnTime = p.completed && p.entryAt && p.validUntil && p.entryAt <= p.validUntil;

                      return (
                        <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            {String(p.id).slice(0, 8)}...
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-foreground">{p.studentName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{p.studentCode}</p>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-muted-foreground">{p.department}</td>
                          <td className="py-3.5 px-4 font-semibold text-primary">{p.reason}</td>
                          <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground" />
                              {p.validFrom || "10:00 AM"} – {p.validUntil}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-foreground font-semibold">
                            {p.issuedBy}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {p.exitAt ? (
                              <span>
                                Out: {p.exitAt}
                                {p.entryAt ? ` | In: ${p.entryAt}` : " | Still Out"}
                              </span>
                            ) : (
                              <span className="text-[11px]">Not exited yet</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {p.currentlyOutside ? (
                              <span className="rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                                Outside Campus
                              </span>
                            ) : isLate ? (
                              <span className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1 justify-end ml-auto w-fit">
                                <AlertTriangle className="size-3" /> Late Return
                              </span>
                            ) : isOnTime ? (
                              <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1 justify-end ml-auto w-fit">
                                <CheckCircle2 className="size-3" /> On-Time
                              </span>
                            ) : (
                              <span className="rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                                {p.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}


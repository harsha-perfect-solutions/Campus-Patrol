import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  Filter,
  Send,
  ArrowUpRight,
  RefreshCw,
  BookOpen,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Info,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToneBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import {
  getCounselorDashboardStatsApi,
  getCounselorStudentsApi,
  getCounselorViolationsApi,
  resolveCounselorViolationApi,
  escalateCounselorViolationApi,
  isFacultyCounselorApi,
} from "@/lib/api/counselor.server";
import type { DBCounselorStudent, CounselorDashboardStats } from "@/lib/db/counselor.server";
import type { DBViolationReport } from "@/lib/db/violations.server";

export const Route = createFileRoute("/faculty/counselor")({
  head: () => ({ meta: [{ title: "Counselor Workspace — Faculty Portal" }] }),
  component: FacultyCounselorPage,
});

function FacultyCounselorPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <FacultyCounselorContent />
    </RoleGuard>
  );
}

function FacultyCounselorContent() {
  const { profile } = useAuth();
  const [isCounselor, setIsCounselor] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"cases" | "students">("cases");

  const [stats, setStats] = useState<CounselorDashboardStats | null>(null);
  const [students, setStudents] = useState<DBCounselorStudent[]>([]);
  const [violations, setViolations] = useState<DBViolationReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const cCheck = await isFacultyCounselorApi();
      setIsCounselor(cCheck.isCounselor);

      if (cCheck.isCounselor) {
        const [sRes, stRes, vRes] = await Promise.all([
          getCounselorDashboardStatsApi(),
          getCounselorStudentsApi(),
          getCounselorViolationsApi({ data: { status: "ALL" } }),
        ]);
        setStats(sRes);
        setStudents(stRes);
        setViolations(vRes);
      }
    } catch (err: any) {
      console.error("Error loading counselor data:", err);
      toast.error(err.message || "Failed to load counselor workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground text-xs">
        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
        Verifying counselor authorization & loading workspace...
      </div>
    );
  }

  if (isCounselor === false) {
    return (
      <div className="p-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
          Counselor Authorization Required
        </div>
        <p className="text-xs leading-relaxed">
          You are currently not assigned as an active Counselor for any student class section. Contact your Admin Console to be assigned as a Class Counselor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Counselor Workspace — ${profile?.full_name || "Faculty"}`}
        description="First-level violation resolution & student counseling portal."
        breadcrumb={[{ label: "Faculty", to: "/faculty/dashboard" }, { label: "Counselor Workspace" }]}
      />

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              MY STUDENTS
            </span>
            <p className="mt-2 text-2xl font-extrabold text-foreground">{stats.totalStudents}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              PENDING CASES
            </span>
            <p className="mt-2 text-2xl font-extrabold text-amber-600">{stats.pendingViolations}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              AWAITING EXP.
            </span>
            <p className="mt-2 text-2xl font-extrabold text-blue-600">{stats.explanationsWaiting}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
              UNDER REVIEW
            </span>
            <p className="mt-2 text-2xl font-extrabold text-purple-600">{stats.underReview}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              RESOLVED
            </span>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600">{stats.resolved}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
              ESCALATED (HOD)
            </span>
            <p className="mt-2 text-2xl font-extrabold text-red-600">{stats.escalated}</p>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === "cases" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("cases")}
          className="rounded-xl text-xs font-bold gap-2"
        >
          <ShieldAlert className="size-3.5" /> Violation Cases ({violations.length})
        </Button>
        <Button
          variant={activeTab === "students" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("students")}
          className="rounded-xl text-xs font-bold gap-2"
        >
          <Users className="size-3.5" /> Assigned Students ({students.length})
        </Button>
      </div>

      {/* CASES TAB */}
      {activeTab === "cases" && (
        <div className="card-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              COUNSELING VIOLATION CASES
            </h4>
            <Button variant="ghost" size="sm" onClick={loadData} className="text-xs">
              <RefreshCw className="size-3 mr-1" /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-3">Report ID</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Violation Type</th>
                  <th className="px-4 py-3">Reported By</th>
                  <th className="px-4 py-3">Student Explanation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">
                      No violation reports found for your counseling students.
                    </td>
                  </tr>
                ) : (
                  violations.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold">
                        <Link to="/reports/$reportId" params={{ reportId: v.id }} className="text-primary hover:underline">
                          #{v.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <strong className="text-foreground">{v.student_name}</strong>
                        <p className="text-[11px] text-muted-foreground font-mono">{v.student_code} &bull; {v.year_section}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{v.violation_type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.reported_by}</td>
                      <td className="px-4 py-3 max-w-xs">
                        {v.explanation ? (
                          <p className="text-xs text-foreground italic truncate">"{v.explanation}"</p>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium italic">Awaiting Explanation</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ToneBadge
                          tone={
                            v.status === "resolved"
                              ? "success"
                              : v.status === "escalated_to_hod" || v.status === "escalated"
                              ? "danger"
                              : v.explanation
                              ? "info"
                              : "warning"
                          }
                        >
                          {v.status.toUpperCase()}
                        </ToneBadge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs font-semibold"
                        >
                          <Link to="/reports/$reportId" params={{ reportId: v.id }}>
                            Review & Action &rarr;
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === "students" && (
        <div className="card-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              MY ASSIGNED COUNSELING STUDENTS
            </h4>
            <span className="text-xs text-muted-foreground">Total: {students.length} Students</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Year & Section</th>
                  <th className="px-4 py-3">Assigned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{st.student_code}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{st.student_name || "Student"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{st.department}</td>
                    <td className="px-4 py-3 text-muted-foreground">{st.year} {st.section}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(st.assigned_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

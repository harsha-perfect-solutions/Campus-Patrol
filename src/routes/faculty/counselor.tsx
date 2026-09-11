import { useState, useEffect, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToneBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import {
  getCounselorDashboardStatsApi,
  getCounselorStudentsApi,
  getCounselorViolationsApi,
  getCounselorPassesApi,
  approveCounselorPassApi,
  resolveCounselorViolationApi,
  escalateCounselorViolationApi,
  isFacultyCounselorApi,
} from "@/lib/api/counselor.server";
import type { DBCounselorStudent, CounselorDashboardStats, DBCounselorPass } from "@/lib/db/counselor.server";
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
  const [activeTab, setActiveTab] = useState<"cases" | "students" | "passes">("cases");
  const [passStatusFilter, setPassStatusFilter] = useState<string>("ALL");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDeptFilter, setStudentDeptFilter] = useState("ALL");
  const [studentYearFilter, setStudentYearFilter] = useState("ALL");
  const [studentSecFilter, setStudentSecFilter] = useState("ALL");

  const [stats, setStats] = useState<CounselorDashboardStats | null>(null);
  const [students, setStudents] = useState<DBCounselorStudent[]>([]);
  const [violations, setViolations] = useState<DBViolationReport[]>([]);
  const [passes, setPasses] = useState<DBCounselorPass[]>([]);
  const [loading, setLoading] = useState(true);



  const loadData = async () => {
    setLoading(true);
    try {
      const cCheck = await isFacultyCounselorApi();
      setIsCounselor(cCheck.isCounselor);

      if (cCheck.isCounselor) {
        const [sRes, stRes, vRes, pRes] = await Promise.all([
          getCounselorDashboardStatsApi(),
          getCounselorStudentsApi(),
          getCounselorViolationsApi({ data: { status: "ALL" } }),
          getCounselorPassesApi({ data: { status: "ALL" } }),
        ]);
        setStats(sRes);
        setStudents(stRes);
        setViolations(vRes);
        setPasses(pRes);
      }
    } catch (err: any) {
      console.error("Error loading counselor data:", err);
      toast.error(err.message || "Failed to load counselor workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePass = async (passId: string, status: "approved" | "rejected") => {
    try {
      const res = await approveCounselorPassApi({ data: { passId, status } });
      if (res.success) {
        toast.success(`Movement Pass ${status === "approved" ? "Approved" : "Rejected"} Successfully`);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update pass status");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchTab = new URLSearchParams(window.location.search).get("tab");
      if (searchTab === "passes" || searchTab === "students" || searchTab === "cases") {
        setActiveTab(searchTab);
      }
    }
    loadData();
  }, []);


  const filteredPasses = useMemo(() => {
    if (passStatusFilter === "ALL") return passes;
    if (passStatusFilter.toLowerCase() === "pending") {
      return passes.filter(
        (p: DBCounselorPass) =>
          p.status.toLowerCase() === "pending" && (p.target_role || "counselor").toLowerCase() === "counselor"
      );
    }
    return passes.filter((p: DBCounselorPass) => p.status.toLowerCase() === passStatusFilter.toLowerCase());
  }, [passes, passStatusFilter]);

  const pendingPassesCount = useMemo(() => {
    return passes.filter(
      (p: DBCounselorPass) =>
        p.status.toLowerCase() === "pending" && (p.target_role || "counselor").toLowerCase() === "counselor"
    ).length;
  }, [passes]);

  const filteredStudents = useMemo(() => {
    return students.filter((st: DBCounselorStudent) => {
      if (studentDeptFilter !== "ALL" && st.department?.toUpperCase() !== studentDeptFilter.toUpperCase()) {
        return false;
      }
      if (studentYearFilter !== "ALL" && st.year?.toUpperCase() !== studentYearFilter.toUpperCase()) {
        return false;
      }
      if (studentSecFilter !== "ALL" && st.section?.toUpperCase() !== studentSecFilter.toUpperCase()) {
        return false;
      }
      if (studentSearch.trim()) {
        const q = studentSearch.trim().toLowerCase();
        const matchCode = st.student_code.toLowerCase().includes(q);
        const matchName = (st.student_name || "").toLowerCase().includes(q);
        const matchEmail = (st.email || "").toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [students, studentDeptFilter, studentYearFilter, studentSecFilter, studentSearch]);

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
        <div className="grid gap-2.5 sm:gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              MY STUDENTS
            </span>
            <p className="mt-1.5 text-xl sm:text-2xl font-extrabold text-foreground">{stats.totalStudents}</p>
          </div>

          <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              PENDING CASES
            </span>
            <p className="mt-1.5 text-xl sm:text-2xl font-extrabold text-amber-600">{stats.pendingViolations}</p>
          </div>

          <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              AWAITING EXP.
            </span>
            <p className="mt-1.5 text-xl sm:text-2xl font-extrabold text-blue-600">{stats.explanationsWaiting}</p>
          </div>

          <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider block">
              UNDER REVIEW
            </span>
            <p className="mt-1.5 text-xl sm:text-2xl font-extrabold text-primary">{stats.underReview}</p>
          </div>

          <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              RESOLVED
            </span>
            <p className="mt-1.5 text-xl sm:text-2xl font-extrabold text-emerald-600">{stats.resolved}</p>
          </div>

          <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-2xs">
            <span className="text-[10px] sm:text-[11px] font-bold text-destructive uppercase tracking-wider block">
              ESCALATED (HOD)
            </span>
            <p className="mt-1.5 text-xl sm:text-2xl font-extrabold text-destructive">{stats.escalated}</p>
          </div>
        </div>
      )}

      {/* Workspace Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-divider overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: "cases", label: "Violation Cases", icon: ShieldAlert, count: violations.length },
          { id: "passes", label: "Pass Approvals", icon: CheckCircle2, count: passes.length },
          { id: "students", label: "Assigned Students", icon: Users, count: students.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                isSelected
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
              <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                {tab.count}
              </span>
            </button>
          );
        })}
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

      {/* PASSES TAB */}
      {activeTab === "passes" && (
        <div className="card-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              COUNSELING STUDENT MOVEMENT PASSES & APPROVALS
            </h4>
            <div className="flex items-center gap-2">
              <Select value={passStatusFilter} onValueChange={setPassStatusFilter}>
                <SelectTrigger className="w-[160px] h-8 rounded-xl text-xs font-semibold bg-card border-border shadow-2xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="ALL">All Passes ({passes.length})</SelectItem>
                  <SelectItem value="pending">Pending ({pendingPassesCount})</SelectItem>
                  <SelectItem value="approved">Approved ({passes.filter((p: DBCounselorPass) => p.status.toLowerCase() === "approved").length})</SelectItem>
                  <SelectItem value="rejected">Rejected ({passes.filter((p: DBCounselorPass) => p.status.toLowerCase() === "rejected").length})</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={loadData} className="text-xs">
                <RefreshCw className="size-3 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-3">Pass ID</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Date & Time Window</th>
                  <th className="px-4 py-3">Status & Routing</th>
                  <th className="px-4 py-3">Issued / Approved By</th>
                  <th className="px-4 py-3 text-right">Acceptance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">
                      No movement pass requests found for your counseling students matching status filter "{passStatusFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredPasses.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-primary">#{p.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <strong className="text-foreground">{p.student_name || p.student_code}</strong>
                        <p className="text-[11px] text-muted-foreground font-mono">{p.student_code} &bull; {p.department}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{p.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{p.date}</div>
                        <div className="text-[11px] font-mono text-primary">{p.valid_from} - {p.valid_until}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <ToneBadge
                            tone={
                              p.status === "approved"
                                ? "success"
                                : p.status === "rejected"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {p.status.toUpperCase()}
                          </ToneBadge>
                          <span className="text-[9px] font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60 border border-border">
                            {(p.target_role || "counselor").toLowerCase() === "counselor" ? "To: Counselor" : "To: HOD"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.issued_by || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApprovePass(p.id, "approved")}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-3 h-8 shadow-xs"
                            >
                              <CheckCircle2 className="size-3.5 mr-1" /> Approve Pass
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovePass(p.id, "rejected")}
                              className="text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl text-xs font-bold px-3 h-8"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Pass {p.status}
                          </span>
                        )}
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
          <div className="p-4 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                MY ASSIGNED COUNSELING STUDENTS
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Showing {filteredStudents.length} of {students.length} assigned active students
              </p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search student..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 h-8 w-[160px] text-xs rounded-xl bg-card border-border"
                />
              </div>

              <Select value={studentDeptFilter} onValueChange={setStudentDeptFilter}>
                <SelectTrigger className="h-8 w-[120px] text-xs rounded-xl bg-card border-border">
                  <SelectValue placeholder="Dept" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="ALL">All Depts</SelectItem>
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                  <SelectItem value="MECH">MECH</SelectItem>
                  <SelectItem value="EEE">EEE</SelectItem>
                  <SelectItem value="CIVIL">CIVIL</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="AIML">AIML</SelectItem>
                </SelectContent>
              </Select>

              <Select value={studentYearFilter} onValueChange={setStudentYearFilter}>
                <SelectTrigger className="h-8 w-[110px] text-xs rounded-xl bg-card border-border">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="ALL">All Years</SelectItem>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                </SelectContent>
              </Select>

              <Select value={studentSecFilter} onValueChange={setStudentSecFilter}>
                <SelectTrigger className="h-8 w-[100px] text-xs rounded-xl bg-card border-border">
                  <SelectValue placeholder="Sec" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="ALL">All Secs</SelectItem>
                  <SelectItem value="A">Sec A</SelectItem>
                  <SelectItem value="B">Sec B</SelectItem>
                  <SelectItem value="C">Sec C</SelectItem>
                  <SelectItem value="D">Sec D</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={loadData} className="h-8 text-xs px-2">
                <RefreshCw className="size-3 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Year & Section</th>
                  <th className="px-4 py-3">Assigned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                      {students.length === 0
                        ? "You currently have no active assigned counseling students. Contact Admin to assign class sections."
                        : "No assigned students match the selected search/filter criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{st.student_code}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{st.student_name || "Student"}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{st.email || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{st.department || "CSE"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {st.year || "3rd Year"} &bull; Section {st.section || "A"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(st.assigned_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


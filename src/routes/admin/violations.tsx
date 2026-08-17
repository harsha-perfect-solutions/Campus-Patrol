import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  getAdminViolationReportsApi,
  getAdminViolationStatsApi,
  getAdminStudentViolationHistoryApi,
  acknowledgeViolationReportApi,
  addAdminViolationRemarkApi,
  closeInstitutionalViolationCaseApi,
  returnViolationToHodApi,
  requireDisciplinaryCommitteeApi,
  getAdminViolationAuditHistoryApi,
} from "@/lib/api/admin.server";
import type { DBViolationReport } from "@/lib/db/violations.server";
import type {
  AdminViolationStats,
  AdminStudentViolationHistory,
} from "@/lib/db/admin.server";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Building2,
  Calendar,
  MapPin,
  XCircle,
  Eye,
  Send,
  AlertOctagon,
  History,
  CornerUpLeft,
  Gavel,
  MessageSquare,
  FileCheck,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/violations")({
  head: () => ({ meta: [{ title: "Institutional Incidents & Violations — Admin Portal" }] }),
  component: AdminViolationsPage,
});

export default function AdminViolationsPage() {
  const { profile } = useAuth();

  const [reports, setReports] = useState<DBViolationReport[]>([]);
  const [stats, setStats] = useState<AdminViolationStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Queues & Filters
  const [selectedQueue, setSelectedQueue] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [violationTypeFilter, setViolationTypeFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Investigation State
  const [selectedReport, setSelectedReport] = useState<DBViolationReport | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Student Profile History Modal
  const [studentHistoryModalOpen, setStudentHistoryModalOpen] = useState(false);
  const [studentHistoryData, setStudentHistoryData] = useState<AdminStudentViolationHistory | null>(null);
  const [studentHistoryLoading, setStudentHistoryLoading] = useState(false);

  // Action Modals
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [remarkText, setRemarkText] = useState("");

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeRemarks, setCloseRemarks] = useState("");

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const [committeeModalOpen, setCommitteeModalOpen] = useState(false);
  const [committeeReason, setCommitteeReason] = useState("");

  const [submittingAction, setSubmittingAction] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const filterPayload: {
        department?: string;
        year?: string;
        severity?: string;
        violationType?: string;
        status?: string;
        search?: string;
      } = {};

      if (departmentFilter !== "ALL") filterPayload.department = departmentFilter;
      if (yearFilter !== "ALL") filterPayload.year = yearFilter;
      if (severityFilter !== "ALL") filterPayload.severity = severityFilter;
      if (violationTypeFilter !== "ALL") filterPayload.violationType = violationTypeFilter;
      if (searchQuery.trim()) filterPayload.search = searchQuery.trim();

      if (selectedQueue !== "ALL") {
        if (selectedQueue === "NEW") filterPayload.status = "new";
        else if (selectedQueue === "UNDER_REVIEW") filterPayload.status = "under_review";
        else if (selectedQueue === "ESCALATED") filterPayload.status = "escalated";
        else if (selectedQueue === "HIGH_SEVERITY") filterPayload.status = "high";
        else if (selectedQueue === "CRITICAL") filterPayload.status = "critical";
        else if (selectedQueue === "VIOLENCE") filterPayload.status = "violence";
        else if (selectedQueue === "RESOLVED") filterPayload.status = "resolved";
        else if (selectedQueue === "DISMISSED") filterPayload.status = "dismissed";
      }

      const [reportsRes, statsRes] = await Promise.all([
        getAdminViolationReportsApi({ data: filterPayload }),
        getAdminViolationStatsApi(),
      ]);

      if (reportsRes.success) {
        setReports(reportsRes.reports);
      }
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error("Failed to load Admin violations:", err);
      toast.error("Failed to load institutional violation reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedQueue, departmentFilter, severityFilter, violationTypeFilter, yearFilter]);

  async function handleOpenDrawer(report: DBViolationReport) {
    setSelectedReport(report);
    setDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const res = await getAdminViolationAuditHistoryApi({ data: { reportId: report.id } });
      if (res.success) {
        setAuditHistory(res.auditLogs);
      }
    } catch (err) {
      console.error("Error loading audit history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleOpenStudentHistory(studentCode: string) {
    setStudentHistoryLoading(true);
    setStudentHistoryModalOpen(true);
    try {
      const res = await getAdminStudentViolationHistoryApi({ data: { studentCode } });
      if (res.success && res.history) {
        setStudentHistoryData(res.history);
      }
    } catch (err) {
      console.error("Error loading student history:", err);
      toast.error("Failed to load student disciplinary history.");
    } finally {
      setStudentHistoryLoading(false);
    }
  }

  async function handleAcknowledge() {
    if (!selectedReport) return;
    setSubmittingAction(true);
    try {
      const res = await acknowledgeViolationReportApi({
        data: { reportId: selectedReport.id, remarks: "Acknowledged by Institutional Administration." },
      });
      if (res.success && res.report) {
        toast.success("Incident Acknowledged", {
          description: `Case #${selectedReport.id} acknowledged by Admin. Audit event recorded.`,
        });
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to acknowledge incident.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to acknowledge incident.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleAddRemarkSubmit() {
    if (!selectedReport || !remarkText.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await addAdminViolationRemarkApi({
        data: { reportId: selectedReport.id, remarks: remarkText.trim() },
      });
      if (res.success && res.report) {
        toast.success("Institutional Remark Added", {
          description: `Remark recorded in case #${selectedReport.id} audit trail.`,
        });
        setRemarkModalOpen(false);
        setRemarkText("");
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to add remark.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add remark.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleCloseCaseSubmit() {
    if (!selectedReport || !closeRemarks.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await closeInstitutionalViolationCaseApi({
        data: { reportId: selectedReport.id, closingRemarks: closeRemarks.trim() },
      });
      if (res.success && res.report) {
        toast.success("Institutional Case Closed", {
          description: `Case #${selectedReport.id} resolved at Institutional level. HOD and Student notified.`,
        });
        setCloseModalOpen(false);
        setCloseRemarks("");
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to close case.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to close case.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleReturnToHodSubmit() {
    if (!selectedReport || !returnReason.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await returnViolationToHodApi({
        data: { reportId: selectedReport.id, returnReason: returnReason.trim() },
      });
      if (res.success && res.report) {
        toast.success("Case Returned to HOD", {
          description: `Case #${selectedReport.id} returned to ${selectedReport.department} HOD for review.`,
        });
        setReturnModalOpen(false);
        setReturnReason("");
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to return case to HOD.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to return case to HOD.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleCommitteeSubmit() {
    if (!selectedReport || !committeeReason.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await requireDisciplinaryCommitteeApi({
        data: { reportId: selectedReport.id, committeeReason: committeeReason.trim() },
      });
      if (res.success && res.report) {
        toast.success("Disciplinary Committee Referral Recorded", {
          description: `Case #${selectedReport.id} flagged for Institutional Committee review.`,
        });
        setCommitteeModalOpen(false);
        setCommitteeReason("");
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to refer case to disciplinary committee.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to refer case to disciplinary committee.");
    } finally {
      setSubmittingAction(false);
    }
  }

  // Client search filter
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.student_name.toLowerCase().includes(q) ||
        r.student_code.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.violation_type.toLowerCase().includes(q) ||
        r.reported_by.toLowerCase().includes(q),
    );
  }, [reports, searchQuery]);

  const hasCriticalIncidents = (stats?.critical ?? 0) > 0 || (stats?.violenceReports ?? 0) > 0;
  const escalatedReports = reports.filter((r) => r.status === "escalated");

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Institutional Incident & Violation Management"
          description="Institution-Wide Disciplinary Oversight, Critical Triage & Escalated Case Management"
          breadcrumb={[
            { label: "Admin Portal", to: "/admin/dashboard" },
            { label: "Violations & Disciplinary Actions" },
          ]}
        />

        {/* Critical & Escalated Incidents Institutional Alert Section */}
        {hasCriticalIncidents && (
          <div className="rounded-2xl border-2 border-red-500/90 bg-red-50/90 dark:bg-red-950/40 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-xs">
                <ShieldAlert className="size-6" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-300 uppercase tracking-wide">
                  🚨 CRITICAL & REPORTED VIOLENCE INCIDENTS — IMMEDIATE ATTENTION REQUIRED
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Institutional administration alert: <strong>{stats?.critical}</strong> critical incident(s),{" "}
                  <strong>{stats?.violenceReports}</strong> suspected violence report(s), and{" "}
                  <strong>{stats?.escalated}</strong> HOD escalated case(s) active across campus.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex-1 md:flex-initial"
                onClick={() => {
                  setSelectedQueue("CRITICAL");
                }}
              >
                View Critical Incidents
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 bg-white/80 dark:bg-zinc-900 hover:bg-white text-red-700 dark:text-red-300 font-bold rounded-xl text-xs flex-1 md:flex-initial"
                onClick={() => {
                  setSelectedQueue("ESCALATED");
                }}
              >
                View Escalated ({stats?.escalated})
              </Button>
            </div>
          </div>
        )}

        {/* 9-Metric KPI Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
          {[
            { label: "Total Incidents", value: stats?.totalIncidents ?? 0, color: "text-foreground", bg: "bg-muted/40" },
            { label: "New Reports", value: stats?.newReports ?? 0, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/60 dark:bg-amber-950/20" },
            { label: "Under HOD Review", value: stats?.underReview ?? 0, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/60 dark:bg-blue-950/20" },
            { label: "Escalated to Admin", value: stats?.escalated ?? 0, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50/60 dark:bg-purple-950/20" },
            { label: "High Severity", value: stats?.highSeverity ?? 0, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50/60 dark:bg-orange-950/20" },
            { label: "Critical", value: stats?.critical ?? 0, color: "text-red-600 dark:text-red-400", bg: "bg-red-50/60 dark:bg-red-950/20" },
            { label: "Violence Reports", value: stats?.violenceReports ?? 0, color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50/60 dark:bg-rose-950/20" },
            { label: "Resolved", value: stats?.resolved ?? 0, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/60 dark:bg-emerald-950/20" },
            { label: "Dismissed", value: stats?.dismissed ?? 0, color: "text-muted-foreground", bg: "bg-muted/30" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={cn("p-4 rounded-2xl border border-border flex flex-col justify-between shadow-2xs", kpi.bg)}
            >
              <span className="text-[11px] font-semibold text-muted-foreground truncate">{kpi.label}</span>
              <span className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Filter Bar & Queue Switcher */}
        <div className="card-surface p-5 rounded-2xl border border-border space-y-4 shadow-xs">
          {/* Queue Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-divider">
            {[
              { id: "ALL", label: "All Incidents" },
              { id: "ESCALATED", label: `Escalated Queue (${stats?.escalated ?? 0})` },
              { id: "CRITICAL", label: "Critical" },
              { id: "VIOLENCE", label: "Violence / Suspected" },
              { id: "HIGH_SEVERITY", label: "High Severity" },
              { id: "NEW", label: "New Reports" },
              { id: "UNDER_REVIEW", label: "Under HOD Review" },
              { id: "RESOLVED", label: "Resolved" },
              { id: "DISMISSED", label: "Dismissed" },
            ].map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQueue(q.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  selectedQueue === q.id
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Advanced Multi-Factor Filters */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="relative col-span-2">
              <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search student, roll, ID, reporter, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-10 rounded-xl"
              />
            </div>

            <div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                  <SelectItem value="MECH">MECH</SelectItem>
                  <SelectItem value="CIVIL">CIVIL</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="EEE">EEE</SelectItem>
                  <SelectItem value="AI&DS">AI&DS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Severities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={violationTypeFilter} onValueChange={setViolationTypeFilter}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="Unauthorized Class Movement">Unauthorized Class Movement</SelectItem>
                  <SelectItem value="Corridor Presence During Class">Corridor Presence During Class</SelectItem>
                  <SelectItem value="Suspected Violence">Suspected Violence / Physical Altercation</SelectItem>
                  <SelectItem value="Verbal Altercation">Verbal Altercation</SelectItem>
                  <SelectItem value="Disruptive Behaviour">Disruptive Behaviour</SelectItem>
                  <SelectItem value="Unauthorized Campus Movement">Unauthorized Campus Movement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs rounded-xl border-border hover:bg-accent"
              onClick={() => {
                setSelectedQueue("ALL");
                setDepartmentFilter("ALL");
                setSeverityFilter("ALL");
                setViolationTypeFilter("ALL");
                setYearFilter("ALL");
                setSearchQuery("");
                loadData();
              }}
            >
              <RotateCcw className="size-3.5 mr-1.5" /> Reset Filters
            </Button>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-divider flex items-center justify-between bg-muted/20">
            <div>
              <h2 className="text-sm font-bold text-foreground">Institution-Wide Disciplinary Cases</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredReports.length} incident record(s) matching your filters.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading institutional incident records...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
              <h3 className="mt-3 font-bold text-foreground">No incidents found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                There are no incident records matching the selected queue or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-divider bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3.5 px-4">Case / Student</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Violation Category</th>
                    <th className="py-3.5 px-4">Severity</th>
                    <th className="py-3.5 px-4">Class & Location</th>
                    <th className="py-3.5 px-4">Reported By</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filteredReports.map((report) => {
                    const isCritical =
                      report.severity === "Critical" ||
                      report.violation_type.toLowerCase().includes("violence");
                    const isEscalated = report.status === "escalated";

                    return (
                      <tr
                        key={report.id}
                        className={cn(
                          "transition-colors hover:bg-accent/40",
                          isEscalated && "bg-purple-50/25 dark:bg-purple-950/15 font-medium",
                          isCritical && "bg-red-50/20 dark:bg-red-950/10",
                        )}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary border border-primary/20">
                              {report.student_name.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <span className="font-bold text-foreground block text-sm">
                                {report.student_name}
                              </span>
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {report.student_code} • {report.year_section}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-foreground block">
                            {report.department}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-foreground block">
                            {report.violation_type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">ID: {report.id}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
                              report.severity === "Critical" && "bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300",
                              report.severity === "High" && "bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300",
                              report.severity === "Medium" && "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
                              report.severity === "Low" && "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300",
                            )}
                          >
                            {report.severity === "Critical" && "🚨 "}
                            {report.severity}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-foreground block">
                            {report.class_name} ({report.room})
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3" /> {report.location}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-foreground block">
                            {report.reported_by}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase",
                              report.status === "resolved" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                              report.status === "dismissed" && "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
                              report.status === "under_review" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                              report.status === "reported" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                              report.status === "escalated" && "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 animate-pulse",
                            )}
                          >
                            {report.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-8 text-xs font-semibold rounded-xl",
                                isEscalated && "bg-purple-600 hover:bg-purple-700 text-white border-transparent",
                              )}
                              onClick={() => handleOpenDrawer(report)}
                            >
                              <Eye className="size-3.5 mr-1" /> {isEscalated ? "Open Case" : "Review"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Investigation Sheet / Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto space-y-6">
            {selectedReport && (
              <>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      INSTITUTIONAL CASE REVIEW #{selectedReport.id}
                    </span>
                    <span
                      className={cn(
                        "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase",
                        selectedReport.status === "resolved" && "bg-emerald-100 text-emerald-800",
                        selectedReport.status === "dismissed" && "bg-zinc-200 text-zinc-800",
                        selectedReport.status === "under_review" && "bg-blue-100 text-blue-800",
                        selectedReport.status === "reported" && "bg-amber-100 text-amber-800",
                        selectedReport.status === "escalated" && "bg-purple-100 text-purple-800 border border-purple-300",
                      )}
                    >
                      {selectedReport.status.replace("_", " ")}
                    </span>
                  </div>
                  <SheetTitle className="text-lg font-bold text-foreground">
                    {selectedReport.violation_type}
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    Department of {selectedReport.department} • Reported on{" "}
                    {new Date(selectedReport.created_at).toLocaleString("en-IN")}
                  </SheetDescription>
                </SheetHeader>

                {/* Section A: Student Information & History Quick Launcher */}
                <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-divider pb-2">
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        STUDENT INFORMATION
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] rounded-lg border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => handleOpenStudentHistory(selectedReport.student_code)}
                    >
                      <GraduationCap className="size-3 mr-1" /> Disciplinary History
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Name</span>
                      <span className="font-bold text-foreground">{selectedReport.student_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Roll Number</span>
                      <span className="font-bold text-foreground">{selectedReport.student_code}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Department</span>
                      <span className="font-bold text-foreground">{selectedReport.department}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Year / Section</span>
                      <span className="font-bold text-foreground">{selectedReport.year_section}</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Academic Timetable Snapshot */}
                <div className="p-4 rounded-2xl border border-blue-200/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        HISTORICAL TIMETABLE SNAPSHOT
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      Immutable Record
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Scheduled Subject</span>
                      <span className="font-bold text-foreground">{selectedReport.class_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Scheduled Room</span>
                      <span className="font-bold text-foreground">{selectedReport.room}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Class Window</span>
                      <span className="font-bold text-foreground">{selectedReport.scheduled_time}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Assigned Faculty</span>
                      <span className="font-bold text-foreground">{selectedReport.scheduled_faculty || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Section C: Faculty Observation Description */}
                <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2 border-b border-divider pb-2">
                    <MapPin className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      FACULTY OBSERVATION
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Observed Location</span>
                      <span className="font-semibold text-foreground">{selectedReport.location}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Observation Remarks</span>
                      <p className="font-medium text-foreground bg-background p-2.5 rounded-xl border border-border mt-1">
                        {selectedReport.remarks}
                      </p>
                    </div>
                    {selectedReport.witness_notes && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Witness / Additional Notes</span>
                        <p className="font-medium text-foreground italic mt-0.5">{selectedReport.witness_notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section D: HOD Investigation Details / Decision */}
                {selectedReport.decision && (
                  <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-purple-600" />
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                        DISCIPLINARY DECISION / HOD REMARKS ({selectedReport.decision_by})
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium">{selectedReport.decision}</p>
                    <span className="text-[10px] text-muted-foreground block">
                      Decided on: {new Date(selectedReport.decision_at || selectedReport.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* Section E: Admin Institutional Action Controls */}
                <div className="pt-3 border-t border-divider space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    ADMIN INSTITUTIONAL CONTROLS
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="outline"
                      className="h-10 text-xs font-bold rounded-xl border-border"
                      onClick={handleAcknowledge}
                      disabled={submittingAction}
                    >
                      <FileCheck className="size-3.5 mr-1.5" /> Acknowledge
                    </Button>

                    <Button
                      variant="outline"
                      className="h-10 text-xs font-bold rounded-xl border-border"
                      onClick={() => setRemarkModalOpen(true)}
                      disabled={submittingAction}
                    >
                      <MessageSquare className="size-3.5 mr-1.5" /> Add Remark
                    </Button>
                  </div>

                  {selectedReport.status === "escalated" && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button
                        className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                        onClick={() => setCloseModalOpen(true)}
                        disabled={submittingAction}
                      >
                        <CheckCircle2 className="size-3.5 mr-1.5" /> Close Institutional Case
                      </Button>

                      <Button
                        variant="outline"
                        className="h-10 text-xs font-bold rounded-xl border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
                        onClick={() => setReturnModalOpen(true)}
                        disabled={submittingAction}
                      >
                        <CornerUpLeft className="size-3.5 mr-1.5" /> Return to HOD
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="destructive"
                    className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
                    onClick={() => setCommitteeModalOpen(true)}
                    disabled={submittingAction}
                  >
                    <Gavel className="size-3.5 mr-1.5" /> Require Disciplinary Committee Review
                  </Button>
                </div>

                {/* Section F: Chronological Audit Trail */}
                <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2 border-b border-divider pb-2">
                    <History className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      FULL CASE AUDIT TIMELINE
                    </span>
                  </div>

                  {historyLoading ? (
                    <span className="text-xs text-muted-foreground">Loading audit trail...</span>
                  ) : auditHistory.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Initial report filed.</span>
                  ) : (
                    <div className="space-y-3 text-xs">
                      {auditHistory.map((item) => (
                        <div key={item.id} className="flex items-start gap-2.5 border-l-2 border-primary/40 pl-3">
                          <div>
                            <span className="font-bold text-foreground block">
                              {item.action.replace(/_/g, " ").toUpperCase()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              By {item.actor} ({item.actor_role}) • {new Date(item.timestamp).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Student Incident History Modal */}
        <Dialog open={studentHistoryModalOpen} onOpenChange={setStudentHistoryModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <GraduationCap className="size-5" /> Student Disciplinary Profile
              </DialogTitle>
              <DialogDescription>
                Complete institutional incident timeline and aggregated metrics.
              </DialogDescription>
            </DialogHeader>

            {studentHistoryLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading student profile...</div>
            ) : studentHistoryData?.student ? (
              <div className="space-y-4 py-2 text-xs">
                {/* Student Info Card */}
                <div className="p-4 rounded-2xl border border-border bg-muted/20 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Student Name</span>
                    <span className="font-bold text-foreground">{studentHistoryData.student.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Roll Number</span>
                    <span className="font-bold text-foreground">{studentHistoryData.student.studentCode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Department</span>
                    <span className="font-bold text-foreground">{studentHistoryData.student.department}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Year / Section</span>
                    <span className="font-bold text-foreground">{studentHistoryData.student.year} • {studentHistoryData.student.section}</span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2.5 rounded-xl border border-border bg-muted/30">
                    <span className="text-[10px] text-muted-foreground block">Total</span>
                    <span className="font-bold text-sm">{studentHistoryData.metrics.totalReports}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 text-amber-800 dark:text-amber-300">
                    <span className="text-[10px] block">Open</span>
                    <span className="font-bold text-sm">{studentHistoryData.metrics.openReports}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/40 text-purple-800 dark:text-purple-300">
                    <span className="text-[10px] block">Escalated</span>
                    <span className="font-bold text-sm">{studentHistoryData.metrics.escalatedReports}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40 text-red-800 dark:text-red-300">
                    <span className="text-[10px] block">Critical</span>
                    <span className="font-bold text-sm">{studentHistoryData.metrics.criticalIncidents}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-emerald-800 dark:text-emerald-300">
                    <span className="text-[10px] block">Resolved</span>
                    <span className="font-bold text-sm">{studentHistoryData.metrics.resolvedReports}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/40 text-zinc-800 dark:text-zinc-300">
                    <span className="text-[10px] block">Dismissed</span>
                    <span className="font-bold text-sm">{studentHistoryData.metrics.dismissedReports}</span>
                  </div>
                </div>

                {/* Incident Timeline */}
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Incident History Timeline</h4>
                  {studentHistoryData.timeline.length === 0 ? (
                    <p className="text-muted-foreground">No prior incidents on record for this student.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {studentHistoryData.timeline.map((item, idx) => (
                        <div key={item.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between">
                          <div>
                            <span className="font-bold text-foreground block">{item.violation_type}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString("en-IN")} • Reported by {item.reported_by} ({item.location})
                            </span>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              item.status === "resolved" && "bg-emerald-100 text-emerald-800",
                              item.status === "dismissed" && "bg-zinc-200 text-zinc-800",
                              item.status === "escalated" && "bg-purple-100 text-purple-800",
                              item.status === "reported" && "bg-amber-100 text-amber-800",
                            )}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground p-4">Student profile not found.</p>
            )}

            <DialogFooter>
              <Button onClick={() => setStudentHistoryModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Remark Modal */}
        <Dialog open={remarkModalOpen} onOpenChange={setRemarkModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <MessageSquare className="size-5" /> Add Institutional Remark
              </DialogTitle>
              <DialogDescription>
                Record an official institutional observation. This is logged to the immutable audit trail.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="rem-text" className="text-xs font-medium">Institutional Remark *</Label>
              <Textarea
                id="rem-text"
                rows={4}
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="e.g. CCTV footage reviewed by Chief Security Officer. Verified corridor presence."
                className="text-xs rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemarkModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAddRemarkSubmit}
                loading={submittingAction}
                disabled={!remarkText.trim()}
              >
                Record Remark
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Close Institutional Case Modal */}
        <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-5" /> Close Institutional Case
              </DialogTitle>
              <DialogDescription>
                Officially close this escalated incident with final institutional remarks. This will notify the Department HOD and the student.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="close-rem" className="text-xs font-medium">Final Closing Remarks *</Label>
              <Textarea
                id="close-rem"
                rows={4}
                value={closeRemarks}
                onChange={(e) => setCloseRemarks(e.target.value)}
                placeholder="e.g. Disciplinary enquiry completed. Written undertaking submitted by student and parent."
                className="text-xs rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                onClick={handleCloseCaseSubmit}
                loading={submittingAction}
                disabled={!closeRemarks.trim()}
              >
                Confirm Case Closure
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return to HOD Modal */}
        <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-600">
                <CornerUpLeft className="size-5" /> Return Case to Department HOD
              </DialogTitle>
              <DialogDescription>
                Return this escalated case back to the Department HOD for departmental investigation and counseling.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="ret-reason" className="text-xs font-medium">Return Instructions / Reason *</Label>
              <Textarea
                id="ret-reason"
                rows={4}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Please conduct departmental mentor counseling and record formal warning."
                className="text-xs rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReturnModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 font-bold"
                onClick={handleReturnToHodSubmit}
                loading={submittingAction}
                disabled={!returnReason.trim()}
              >
                Return to HOD
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Require Disciplinary Committee Modal */}
        <Dialog open={committeeModalOpen} onOpenChange={setCommitteeModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Gavel className="size-5" /> Require Disciplinary Committee Review
              </DialogTitle>
              <DialogDescription>
                Flag this critical incident for formal review by the Institutional Disciplinary Committee.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="com-reason" className="text-xs font-medium">Referral Reason *</Label>
              <Textarea
                id="com-reason"
                rows={4}
                value={committeeReason}
                onChange={(e) => setCommitteeReason(e.target.value)}
                placeholder="e.g. Repeated physical altercation requires formal institutional hearing."
                className="text-xs rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCommitteeModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 font-bold"
                onClick={handleCommitteeSubmit}
                loading={submittingAction}
                disabled={!committeeReason.trim()}
              >
                Confirm Committee Referral
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

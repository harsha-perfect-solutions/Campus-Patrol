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
  getHodViolationReportsApi,
  getHodDashboardStatsApi,
  startViolationReviewApi,
  resolveViolationReportApi,
  dismissViolationReportApi,
  escalateViolationReportApi,
  getViolationAuditHistoryApi,
} from "@/lib/api/hod.server";
import type { DBViolationReport } from "@/lib/db/violations.server";
import type { HODDashboardStats } from "@/lib/db/hod.server";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Info,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hod/violations")({
  head: () => ({ meta: [{ title: "Incident & Violation Management — HOD Portal" }] }),
  component: HODViolationsPage,
});

export default function HODViolationsPage() {
  const { profile } = useAuth();
  const userDept = profile?.department || "CSE";

  const [reports, setReports] = useState<DBViolationReport[]>([]);
  const [stats, setStats] = useState<HODDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedQueue, setSelectedQueue] = useState<"ALL" | "NEW" | "UNDER_REVIEW" | "ESCALATED" | "CRITICAL" | "VIOLENCE" | "RESOLVED" | "DISMISSED">("NEW");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [violationTypeFilter, setViolationTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Investigation State
  const [selectedReport, setSelectedReport] = useState<DBViolationReport | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Action Modals
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveRemarks, setResolveRemarks] = useState("");
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Timer for 'Updated X seconds ago'
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const filterPayload: {
        status?: string;
        severity?: string;
        violationType?: string;
        search?: string;
      } = {};

      if (selectedQueue !== "ALL") {
        if (selectedQueue === "NEW") filterPayload.status = "reported";
        else if (selectedQueue === "CRITICAL") filterPayload.severity = "Critical";
        else if (selectedQueue === "VIOLENCE") filterPayload.violationType = "Violence";
        else filterPayload.status = selectedQueue.toLowerCase();
      }
      if (severityFilter !== "ALL") {
        filterPayload.severity = severityFilter;
      }
      if (violationTypeFilter !== "ALL") {
        filterPayload.violationType = violationTypeFilter;
      }
      if (searchQuery.trim()) {
        filterPayload.search = searchQuery.trim();
      }

      const [reportsRes, statsRes] = await Promise.all([
        getHodViolationReportsApi({
          data: filterPayload,
        }),
        getHodDashboardStatsApi(),
      ]);

      if (reportsRes.success) {
        setReports(reportsRes.reports);
      }
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (err) {
      console.error("Failed to load HOD violations:", err);
      if (!silent) toast.error("Failed to load department violation reports.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Initial and trigger load
  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 12000);
    return () => clearInterval(interval);
  }, [selectedQueue, severityFilter, violationTypeFilter]);

  async function handleOpenDrawer(report: DBViolationReport) {
    setSelectedReport(report);
    setDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const res = await getViolationAuditHistoryApi({ data: { reportId: report.id } });
      if (res.success) {
        setAuditHistory(res.history);
      }
    } catch (err) {
      console.error("Error loading audit history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleStartReview() {
    if (!selectedReport) return;
    setSubmittingAction(true);
    try {
      const res = await startViolationReviewApi({ data: { reportId: selectedReport.id } });
      if (res.success && res.report) {
        toast.success("Review started", {
          description: `Case ${selectedReport.id} is now under HOD review. Faculty notified.`,
        });
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to start review.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start review.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleResolveSubmit() {
    if (!selectedReport || !resolveRemarks.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await resolveViolationReportApi({
        data: { reportId: selectedReport.id, remarks: resolveRemarks.trim() },
      });
      if (res.success && res.report) {
        toast.success("Violation case resolved", {
          description: `Resolution recorded for case ${selectedReport.id}. Faculty and Student notified.`,
        });
        setResolveOpen(false);
        setResolveRemarks("");
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to resolve case.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve case.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleDismissSubmit() {
    if (!selectedReport || !dismissReason.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await dismissViolationReportApi({
        data: { reportId: selectedReport.id, dismissalReason: dismissReason.trim() },
      });
      if (res.success && res.report) {
        toast.success("Violation report dismissed", {
          description: `Case ${selectedReport.id} dismissed. Faculty and Student notified.`,
        });
        setDismissOpen(false);
        setDismissReason("");
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to dismiss report.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dismiss report.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleEscalateSubmit() {
    if (!selectedReport || !escalateReason.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await escalateViolationReportApi({
        data: { reportId: selectedReport.id, escalationReason: escalateReason.trim() },
      });
      if (res.success && res.report) {
        toast.success("Incident escalated to Admin", {
          description: `Critical case ${selectedReport.id} escalated to Institutional Admin.`,
        });
        setEscalateOpen(false);
        setEscalateReason("");
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to escalate incident.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to escalate incident.");
    } finally {
      setSubmittingAction(false);
    }
  }

  // Client-side search filtering
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.student_name.toLowerCase().includes(q) ||
        r.student_code.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.violation_type.toLowerCase().includes(q) ||
        r.reported_by.toLowerCase().includes(q),
    );
  }, [reports, searchQuery]);

  const hasCriticalIncidents = (stats?.criticalIncidents ?? 0) > 0;

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="HOD Incident & Violation Management"
          description={`Department Discipline Oversight & Investigation Queue (${userDept} Department)`}
          breadcrumb={[
            { label: "HOD Portal", to: "/hod/dashboard" },
            { label: "Violations & Incidents" },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                Updated {secondsAgo}s ago
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData()}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5"
              >
                <RotateCcw className="size-3.5" /> Refresh
              </Button>
            </div>
          }
        />

        {/* Critical Incidents Warning Banner */}
        {hasCriticalIncidents && (
          <div className="rounded-2xl border-2 border-red-500/80 bg-red-50/90 dark:bg-red-950/40 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3.5">
              <span className="grid size-10 place-items-center rounded-xl bg-red-600 text-white shadow-xs">
                <ShieldAlert className="size-6" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-300 uppercase tracking-wide">
                  🚨 CRITICAL INCIDENTS REQUIRE IMMEDIATE ATTENTION
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  There are <strong>{stats?.criticalIncidents}</strong> critical or suspected violence report(s) awaiting your review in the {userDept} department queue.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shrink-0"
              onClick={() => {
                setSeverityFilter("Critical");
                setSelectedQueue("ALL");
              }}
            >
              View Critical Cases
            </Button>
          </div>
        )}

        {/* 8-Metric KPI Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Total Reports", value: stats?.totalReports ?? 0, color: "text-foreground", bg: "bg-muted/40" },
            { label: "New / Pending", value: stats?.newReports ?? 0, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/60 dark:bg-amber-950/20" },
            { label: "Under Review", value: stats?.underReview ?? 0, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/60 dark:bg-blue-950/20" },
            { label: "High Severity", value: stats?.highSeverity ?? 0, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50/60 dark:bg-orange-950/20" },
            { label: "Critical", value: stats?.criticalIncidents ?? 0, color: "text-red-600 dark:text-red-400", bg: "bg-red-50/60 dark:bg-red-950/20" },
            { label: "Violence", value: stats?.violenceReports ?? 0, color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50/60 dark:bg-rose-950/20" },
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

        {/* Queue Switcher & Filter Controls */}
        <div className="card-surface p-5 rounded-2xl border border-border space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-4">
            {/* Queue Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl">
              {[
                { id: "NEW", label: "New Reports" },
                { id: "UNDER_REVIEW", label: "Under Review" },
                { id: "ESCALATED", label: "Escalated" },
                { id: "CRITICAL", label: "Critical" },
                { id: "VIOLENCE", label: "Violence" },
                { id: "RESOLVED", label: "Resolved" },
                { id: "DISMISSED", label: "Dismissed" },
                { id: "ALL", label: "All Queue" },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQueue(q.id as any)}
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

            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Building2 className="size-3.5 text-primary" />
              <span>Department: <strong className="text-foreground">{userDept}</strong></span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search student, roll, report ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-10 rounded-xl"
              />
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
                  <SelectItem value="Unauthorized Campus Movement">Unauthorized Campus Movement</SelectItem>
                  <SelectItem value="Suspected Violence">Suspected Violence / Physical Altercation</SelectItem>
                  <SelectItem value="Verbal Altercation">Verbal Altercation</SelectItem>
                  <SelectItem value="Disruptive Behaviour">Disruptive Behaviour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs rounded-xl border-border hover:bg-accent"
              onClick={() => {
                setSelectedQueue("NEW");
                setSeverityFilter("ALL");
                setViolationTypeFilter("ALL");
                setSearchQuery("");
                loadData();
              }}
            >
              <RotateCcw className="size-3.5 mr-1.5" /> Reset Filters
            </Button>
          </div>
        </div>

        {/* Violation Reports Table */}
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-divider flex items-center justify-between bg-muted/20">
            <div>
              <h2 className="text-sm font-bold text-foreground">Discipline & Violation Cases Queue</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredReports.length} report(s) strictly scoped to {userDept} Department.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading department violation cases...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
              <h3 className="mt-3 font-bold text-foreground">No reports found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                There are no violation reports matching the current queue and filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-divider bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3.5 px-4">Case / Student</th>
                    <th className="py-3.5 px-4">Violation Category</th>
                    <th className="py-3.5 px-4">Severity</th>
                    <th className="py-3.5 px-4">Recorded Class & Location</th>
                    <th className="py-3.5 px-4">Reporter</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filteredReports.map((report) => {
                    const isCritical =
                      report.severity === "Critical" ||
                      report.violation_type.toLowerCase().includes("violence");

                    return (
                      <tr
                        key={report.id}
                        className={cn(
                          "transition-colors hover:bg-accent/40",
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
                              report.status === "escalated" && "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
                            )}
                          >
                            {report.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold rounded-xl"
                            onClick={() => handleOpenDrawer(report)}
                          >
                            <Eye className="size-3.5 mr-1" /> Investigate
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Investigation Sheet / Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto space-y-6">
            {selectedReport && (
              <>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      CASE INVESTIGATION #{selectedReport.id}
                    </span>
                    <span
                      className={cn(
                        "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase",
                        selectedReport.status === "resolved" && "bg-emerald-100 text-emerald-800",
                        selectedReport.status === "dismissed" && "bg-zinc-200 text-zinc-800",
                        selectedReport.status === "under_review" && "bg-blue-100 text-blue-800",
                        selectedReport.status === "reported" && "bg-amber-100 text-amber-800",
                        selectedReport.status === "escalated" && "bg-purple-100 text-purple-800",
                      )}
                    >
                      {selectedReport.status.replace("_", " ")}
                    </span>
                  </div>
                  <SheetTitle className="text-lg font-bold text-foreground">
                    {selectedReport.violation_type}
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    Reported by {selectedReport.reported_by} on{" "}
                    {new Date(selectedReport.created_at).toLocaleString("en-IN")}
                  </SheetDescription>
                </SheetHeader>

                {/* Section A: Student Information */}
                <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2 border-b border-divider pb-2">
                    <User className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      STUDENT INFORMATION
                    </span>
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

                {/* Section B: Academic Timetable Snapshot (Historical Immutability) */}
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

                {/* Section C: Incident Observation Details */}
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
                      <span className="text-muted-foreground block text-[10px]">Observation Description</span>
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

                {/* Section D: HOD Decision / Status Banner if resolved */}
                {selectedReport.decision && (
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        HOD DECISION RECORDED ({selectedReport.decision_by})
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium">{selectedReport.decision}</p>
                    <span className="text-[10px] text-muted-foreground block">
                      Decided at: {new Date(selectedReport.decision_at || selectedReport.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* Section E: Action Workflow */}
                <div className="pt-3 border-t border-divider space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    HOD ACTIONS
                  </span>

                  {selectedReport.status === "reported" && (
                    <Button
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                      onClick={handleStartReview}
                      loading={submittingAction}
                    >
                      <Search className="size-4 mr-2" /> Start Case Investigation
                    </Button>
                  )}

                  {selectedReport.status === "under_review" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                        onClick={() => setResolveOpen(true)}
                        disabled={submittingAction}
                      >
                        <CheckCircle2 className="size-4 mr-2" /> Resolve Case
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 border-border text-foreground hover:bg-accent font-bold rounded-xl"
                        onClick={() => setDismissOpen(true)}
                        disabled={submittingAction}
                      >
                        <XCircle className="size-4 mr-2" /> Dismiss Report
                      </Button>
                    </div>
                  )}

                  {selectedReport.status !== "resolved" && selectedReport.status !== "dismissed" && (
                    <Button
                      variant="destructive"
                      className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs"
                      onClick={() => setEscalateOpen(true)}
                      disabled={submittingAction}
                    >
                      <AlertTriangle className="size-3.5 mr-2" /> Escalate to Institutional Admin
                    </Button>
                  )}
                </div>

                {/* Section F: Chronological Audit Trail */}
                <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2 border-b border-divider pb-2">
                    <History className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      CASE AUDIT HISTORY
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
                              By {item.actor} ({item.actorRole}) • {new Date(item.timestamp).toLocaleString("en-IN")}
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

        {/* Resolve Modal */}
        <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-5" /> Resolve Violation Case
              </DialogTitle>
              <DialogDescription>
                Provide official HOD resolution remarks. This will resolve the case and notify both the faculty reporter and the student.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="res-remarks" className="text-xs font-medium">
                HOD Resolution Remarks *
              </Label>
              <Textarea
                id="res-remarks"
                rows={4}
                value={resolveRemarks}
                onChange={(e) => setResolveRemarks(e.target.value)}
                placeholder="e.g. Student counselled in presence of mentor. Warning issued and attendance recorded."
                className="text-xs rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                onClick={handleResolveSubmit}
                loading={submittingAction}
                disabled={!resolveRemarks.trim()}
              >
                Confirm Resolution
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dismiss Modal */}
        <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <XCircle className="size-5" /> Dismiss Violation Report
              </DialogTitle>
              <DialogDescription>
                A mandatory dismissal reason is required. The faculty reporter will be notified with this reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="dis-reason" className="text-xs font-medium">
                Mandatory Dismissal Reason *
              </Label>
              <Textarea
                id="dis-reason"
                rows={4}
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="e.g. Verified valid academic laboratory permission with Lab In-Charge."
                className="text-xs rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDismissOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDismissSubmit}
                loading={submittingAction}
                disabled={!dismissReason.trim()}
              >
                Dismiss Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Escalate Modal */}
        <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="size-5" /> Escalate to Institutional Admin
              </DialogTitle>
              <DialogDescription>
                Escalate critical disciplinary, violence, or high-severity cases directly to the Institutional Administration dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="esc-reason" className="text-xs font-medium">
                Reason for Admin Escalation *
              </Label>
              <Textarea
                id="esc-reason"
                rows={4}
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="e.g. Suspected physical violence requires campus security review and institutional disciplinary committee action."
                className="text-xs rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEscalateOpen(false)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 font-bold"
                onClick={handleEscalateSubmit}
                loading={submittingAction}
                disabled={!escalateReason.trim()}
              >
                Confirm Escalation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

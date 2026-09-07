import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  History,
  Lock,
  FileCheck,
  Paperclip,
  Check,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { downloadEvidenceImage } from "@/lib/download-evidence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hod/violations")({
  head: () => ({ meta: [{ title: "Incident & Violation Management — HOD Portal" }] }),
  component: HODViolationsPage,
});

function HODViolationsPage() {
  const { profile } = useAuth();
  const userDept = profile?.department || "CSE";

  const [reports, setReports] = useState<DBViolationReport[]>([]);
  const [stats, setStats] = useState<HODDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedQueue, setSelectedQueue] = useState<"ALL" | "NEW" | "UNDER_REVIEW" | "CRITICAL" | "VIOLENCE" | "RESOLVED" | "DISMISSED">("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [violationTypeFilter, setViolationTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Investigation State
  const [selectedReport, setSelectedReport] = useState<DBViolationReport | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [investigationNotes, setInvestigationNotes] = useState("");

  // Action Modals
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveRemarks, setResolveRemarks] = useState("");
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
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

  const navigate = useNavigate();

  async function handleOpenDrawer(report: DBViolationReport) {
    navigate({ to: "/reports/$reportId", params: { reportId: report.id } });
  }

  async function handleStartReview() {
    if (!selectedReport) return;
    setSubmittingAction(true);
    try {
      const res = await startViolationReviewApi({ data: { reportId: selectedReport.id } });
      if (res.success && res.report) {
        toast.success("Investigation Started", {
          description: `Case #${selectedReport.id} is now under HOD review. Faculty & Student notified.`,
        });
        setSelectedReport(res.report);
        loadData(true);
        // Refresh audit history
        const histRes = await getViolationAuditHistoryApi({ data: { reportId: selectedReport.id } });
        if (histRes.success) setAuditHistory(histRes.history);
      } else {
        toast.error(res.error || "Failed to start investigation.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start investigation.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleResolveSubmit() {
    if (!selectedReport || !resolveRemarks.trim()) return;
    setSubmittingAction(true);
    try {
      const finalRemarks = investigationNotes.trim()
        ? `[HOD Notes: ${investigationNotes.trim()}] Resolution: ${resolveRemarks.trim()}`
        : resolveRemarks.trim();

      const res = await resolveViolationReportApi({
        data: {
          reportId: selectedReport.id,
          remarks: finalRemarks,
        },
      });

      if (res.success && res.report) {
        toast.success("Case Resolved", {
          description: `Violation #${selectedReport.id} resolved. Student and Faculty notified.`,
        });
        setSelectedReport(res.report);
        setResolveOpen(false);
        setResolveRemarks("");
        loadData(true);
        // Refresh audit history
        const histRes = await getViolationAuditHistoryApi({ data: { reportId: selectedReport.id } });
        if (histRes.success) setAuditHistory(histRes.history);
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
      const finalReason = investigationNotes.trim()
        ? `[HOD Notes: ${investigationNotes.trim()}] Dismissal Reason: ${dismissReason.trim()}`
        : dismissReason.trim();

      const res = await dismissViolationReportApi({
        data: {
          reportId: selectedReport.id,
          dismissalReason: finalReason,
        },
      });

      if (res.success && res.report) {
        toast.success("Case Dismissed", {
          description: `Violation #${selectedReport.id} dismissed. Faculty reporter notified.`,
        });
        setSelectedReport(res.report);
        setDismissOpen(false);
        setDismissReason("");
        loadData(true);
        // Refresh audit history
        const histRes = await getViolationAuditHistoryApi({ data: { reportId: selectedReport.id } });
        if (histRes.success) setAuditHistory(histRes.history);
      } else {
        toast.error(res.error || "Failed to dismiss report.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dismiss report.");
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
          description={`Department Disciplinary Authority & Investigation Console (${userDept} Department)`}
          breadcrumb={[
            { label: "HOD Portal", to: "/hod/dashboard" },
            { label: "Violations & Cases" },
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
                loading={loading}
                disabled={loading}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5"
              >
                {!loading && <RotateCcw className="size-3.5" />}
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          }
        />

        {/* Critical Incidents Warning Banner */}
        {hasCriticalIncidents && (
          <div className="rounded-2xl border-2 border-red-500/80 bg-red-50/90 dark:bg-red-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs animate-pulse">
            <div className="flex items-center gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-xs">
                <ShieldAlert className="size-6" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-300 uppercase tracking-wide">
                  🚨 CRITICAL INCIDENTS REQUIRE IMMEDIATE HOD ATTENTION
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  There are <strong>{stats?.criticalIncidents}</strong> critical or suspected violence report(s) awaiting your final review in the {userDept} department queue.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shrink-0 w-full sm:w-auto"
              onClick={() => {
                setSeverityFilter("Critical");
                setSelectedQueue("ALL");
              }}
            >
              View Critical Cases
            </Button>
          </div>
        )}

        {/* KPI Ribbon (7 Metrics) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Total Reports", value: stats?.totalReports ?? 0, color: "text-foreground", bg: "bg-muted/40", span: "col-span-2 sm:col-span-1" },
            { label: "New Reports", value: stats?.newReports ?? 0, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/60 dark:bg-amber-950/20" },
            { label: "Under Review", value: stats?.underReview ?? 0, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/60 dark:bg-blue-950/20" },
            { label: "High Severity", value: stats?.highSeverity ?? 0, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50/60 dark:bg-orange-950/20" },
            { label: "Critical", value: stats?.criticalIncidents ?? 0, color: "text-red-600 dark:text-red-400", bg: "bg-red-50/60 dark:bg-red-950/20" },
            { label: "Resolved", value: stats?.resolved ?? 0, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/60 dark:bg-emerald-950/20" },
            { label: "Dismissed", value: stats?.dismissed ?? 0, color: "text-muted-foreground", bg: "bg-muted/30" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={cn("p-3 sm:p-4 rounded-2xl border border-border flex flex-col justify-between shadow-2xs", kpi.bg, kpi.span)}
            >
              <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">{kpi.label}</span>
              <span className={cn("text-xl sm:text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Queue Switcher & Filter Controls */}
        <div className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider pb-4">
            {/* Queue Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl overflow-x-auto no-scrollbar scroll-smooth max-w-full">
              {[
                { id: "ALL", label: "All Cases" },
                { id: "NEW", label: "New Reports" },
                { id: "UNDER_REVIEW", label: "Under Review" },
                { id: "CRITICAL", label: "Critical" },
                { id: "VIOLENCE", label: "Violence" },
                { id: "RESOLVED", label: "Resolved" },
                { id: "DISMISSED", label: "Dismissed" },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQueue(q.id as any)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
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
              <span>Department Isolation: <strong className="text-foreground">{userDept}</strong> (Server Enforced)</span>
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

            <div className="flex items-center justify-end text-xs text-muted-foreground font-medium">
              Showing <strong className="text-foreground mx-1">{filteredReports.length}</strong> case(s)
            </div>
          </div>
        </div>

        {/* Violations Table Queue */}
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          {loading && reports.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <ShieldCheck className="size-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-foreground">No Violation Reports Found</p>
              <p className="text-xs text-muted-foreground">
                No reports match the selected filters for {userDept} department.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Case / Student</th>
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
                                #{report.id} • {report.student_code} • {report.year_section}
                              </span>
                            </div>
                          </div>
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
                          {(() => {
                            const isCounselorResolved =
                              report.status === "resolved" &&
                              (report.decision === "RESOLVED_BY_COUNSELOR" ||
                                (report as any).resolution_note ||
                                (report as any).counselor_remarks ||
                                !(report.decision === "exonerated" || report.decision === "warned" || report.decision === "escalated"));

                            const isHodResolved =
                              report.status === "resolved" &&
                              (report.decision === "exonerated" || report.decision === "warned" || report.decision === "escalated");

                            const isEscalatedToHod =
                              report.status === "escalated" ||
                              report.status === "escalated_to_hod" ||
                              Boolean((report as any).escalation_reason);

                            if (isCounselorResolved) {
                              return (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                  SOLVED BY COUNSELOR
                                </span>
                              );
                            }

                            if (isHodResolved) {
                              return (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                  RESOLVED BY HOD
                                </span>
                              );
                            }

                            if (isEscalatedToHod) {
                              return (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300">
                                  ESCALATED TO HOD
                                </span>
                              );
                            }

                            if (report.status === "explanation_submitted") {
                              return (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                                  EXPLANATION SUBMITTED
                                </span>
                              );
                            }

                            return (
                              <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                {report.status === "reported" ? "REPORTED" : report.status.replace("_", " ")}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold rounded-xl"
                          >
                            <Link to="/reports/$reportId" params={{ reportId: report.id }}>
                              <Eye className="size-3.5 mr-1" /> Open Case
                            </Link>
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

        {/* REDESIGNED ENTERPRISE HOD CASE INVESTIGATION DRAWER */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col justify-between">
            {selectedReport && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* STICKY HEADER */}
                <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-xs px-4 sm:px-6 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                      CASE INVESTIGATION #{selectedReport.id}
                    </span>
                    <span
                      className={cn(
                        "px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-2xs",
                        selectedReport.status === "resolved" && "bg-emerald-500 text-white",
                        selectedReport.status === "dismissed" && "bg-zinc-600 text-white",
                        selectedReport.status === "under_review" && "bg-blue-600 text-white",
                        selectedReport.status === "reported" && "bg-amber-500 text-white",
                      )}
                    >
                      {selectedReport.status === "reported" ? "REPORTED" : selectedReport.status.replace("_", " ")}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-foreground">
                    {selectedReport.violation_type}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Reported by <strong className="text-foreground">{selectedReport.reported_by}</strong> &bull;{" "}
                    {new Date(selectedReport.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* DRAWER BODY CONTENT */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
                  {/* SECTION 1 — STUDENT INFORMATION */}
                  <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-divider pb-2.5">
                      <User className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        SECTION 1 — STUDENT INFORMATION
                      </span>
                    </div>
                    <div className="flex items-start gap-4 pt-1">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-sm font-black text-primary border border-primary/20">
                        {selectedReport.student_name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs flex-1">
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Student Name
                          </span>
                          <span className="font-bold text-foreground text-sm">{selectedReport.student_name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Roll Number
                          </span>
                          <span className="font-bold font-mono text-primary">{selectedReport.student_code}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Department
                          </span>
                          <span className="font-bold text-foreground">{selectedReport.department}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Year / Section
                          </span>
                          <span className="font-bold text-foreground">{selectedReport.year_section}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2 — HISTORICAL TIMETABLE SNAPSHOT */}
                  <div className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                          SECTION 2 — HISTORICAL TIMETABLE SNAPSHOT
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300">
                        <Lock className="size-3" /> Immutable Record
                      </span>
                    </div>
                    {selectedReport.class_name === "No Class Scheduled" || selectedReport.scheduled_time === "No Class Scheduled" ? (
                      <div className="py-2 text-xs font-semibold text-muted-foreground italic">
                        No class was scheduled at the time of the reported incident.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Scheduled Subject
                          </span>
                          <span className="font-bold text-foreground">{selectedReport.class_name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Scheduled Room
                          </span>
                          <span className="font-bold text-foreground">{selectedReport.room}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Class Window
                          </span>
                          <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">{selectedReport.scheduled_time}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Assigned Faculty
                          </span>
                          <span className="font-bold text-foreground">{selectedReport.scheduled_faculty || "—"}</span>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-blue-200/50">
                      🔒 Verified snapshot captured automatically at the time of reporting. Retains exact historical timetable identity.
                    </p>
                  </div>

                  {/* SECTION 3 — FACULTY OBSERVATION */}
                  <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-divider pb-2.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          SECTION 3 — FACULTY OBSERVATION
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Reported by: <strong className="text-foreground">{selectedReport.reported_by}</strong>
                      </span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                          Observed Location
                        </span>
                        <span className="font-bold text-foreground">{selectedReport.location}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                          Observation Remarks
                        </span>
                        <div className="p-3 rounded-xl bg-muted/40 border border-border mt-1 font-medium text-foreground text-xs leading-relaxed">
                          {selectedReport.remarks}
                        </div>
                      </div>
                      {selectedReport.witness_notes && (
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            Witness / Additional Notes
                          </span>
                          <p className="font-medium text-foreground italic mt-0.5 text-xs">
                            {selectedReport.witness_notes}
                          </p>
                        </div>
                      )}
                      {selectedReport.evidence && (
                        <div className="space-y-2 pt-2 border-t border-divider">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                              <ImageIcon className="size-3 text-primary" /> Evidence Photo / File Attachment
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                              onClick={() => downloadEvidenceImage(selectedReport.evidence!, selectedReport.id)}
                            >
                              <Download className="size-3" /> Download Evidence Photo
                            </Button>
                          </div>

                          {selectedReport.evidence.startsWith("data:") ? (
                            <div className="p-2.5 rounded-xl bg-background border border-border flex flex-col items-center gap-2">
                              <img
                                src={selectedReport.evidence}
                                alt="Incident Evidence"
                                className="max-h-64 w-auto rounded-lg object-contain border border-border shadow-2xs"
                              />
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>📷 Captured Evidence Photo</span>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={() => downloadEvidenceImage(selectedReport.evidence!, selectedReport.id)}
                                  className="text-primary font-bold hover:underline cursor-pointer"
                                >
                                  Click to Download Original Image (.png)
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                              <span className="text-xs font-semibold text-foreground truncate">
                                📎 Attached: {selectedReport.evidence}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs font-bold rounded-lg"
                                onClick={() => downloadEvidenceImage(selectedReport.evidence!, selectedReport.id)}
                              >
                                <Download className="size-3 mr-1" /> Download
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 4 — STUDENT EXPLANATION */}
                  <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-divider pb-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          SECTION 4 — STUDENT EXPLANATION
                        </span>
                      </div>
                      {selectedReport.explanation ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <Check className="size-3" /> SUBMITTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          Awaiting Response
                        </span>
                      )}
                    </div>

                    {selectedReport.explanation ? (
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                          <span>Submitted on: {selectedReport.explanation_submitted_at ? new Date(selectedReport.explanation_submitted_at).toLocaleString("en-IN") : "Recorded"}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 text-foreground font-medium leading-relaxed">
                          "{selectedReport.explanation}"
                        </div>
                        {selectedReport.evidence && (
                          <div className="pt-1 space-y-2">
                            <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                              Student Supporting Evidence
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-bold rounded-xl border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 gap-1.5"
                              onClick={() => downloadEvidenceImage(selectedReport.evidence!, selectedReport.id)}
                            >
                              <Download className="size-3.5" /> Download Student Evidence File
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-muted/30 border border-border text-center space-y-1">
                        <Info className="size-5 text-muted-foreground/60 mx-auto" />
                        <p className="text-xs font-bold text-muted-foreground">No explanation submitted yet.</p>
                        <p className="text-[11px] text-subtle-foreground">
                          The student has not yet submitted an official statement for this case. HOD may proceed with investigation.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* SECTION 5 — HOD INVESTIGATION (EDITABLE BY HOD) */}
                  <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-primary/20 pb-2.5">
                      <FileCheck className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        SECTION 5 — HOD INVESTIGATION & NOTES
                      </span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <Label htmlFor="hod-notes" className="text-xs font-bold text-foreground block mb-1">
                          HOD Investigation Notes
                        </Label>
                        <Textarea
                          id="hod-notes"
                          rows={3}
                          value={investigationNotes}
                          onChange={(e) => setInvestigationNotes(e.target.value)}
                          placeholder="Record HOD internal investigation observations, mentor discussions, or witness verification notes..."
                          disabled={selectedReport.status === "resolved" || selectedReport.status === "dismissed"}
                          className="text-xs rounded-xl bg-background border-border"
                        />
                      </div>
                      {selectedReport.decision && (
                        <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                            Final Recorded Decision ({selectedReport.decision_by})
                          </span>
                          <p className="text-xs font-semibold text-foreground">{selectedReport.decision}</p>
                          <span className="text-[10px] text-muted-foreground block">
                            Decided at: {new Date(selectedReport.decision_at || selectedReport.created_at).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 7 — CHRONOLOGICAL CASE AUDIT HISTORY */}
                  <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-divider pb-2.5">
                      <History className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        SECTION 7 — CASE AUDIT HISTORY
                      </span>
                    </div>

                    {historyLoading ? (
                      <span className="text-xs text-muted-foreground">Loading audit trail...</span>
                    ) : auditHistory.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Initial report filed.</span>
                    ) : (
                      <div className="space-y-3 text-xs pt-1">
                        {auditHistory.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 border-l-2 border-primary/50 pl-3">
                            <div className="space-y-0.5">
                              <span className="font-bold text-foreground block">
                                ● {item.action.replace(/_/g, " ").toUpperCase()}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                By {item.actor} ({item.actorRole}) &bull; {new Date(item.timestamp).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* STICKY BOTTOM SECTION 6 — FINAL DECISION AREA */}
                <div className="sticky bottom-0 z-20 border-t border-border bg-card p-4 space-y-2 shadow-lg">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    SECTION 6 — CASE DECISION & ACTIONS
                  </span>

                  {selectedReport.status === "reported" && (
                    <Button
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
                      onClick={handleStartReview}
                      loading={submittingAction}
                    >
                      <Search className="size-4 mr-2" /> [ Start Investigation ]
                    </Button>
                  )}

                  {selectedReport.status === "under_review" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                        onClick={() => setResolveOpen(true)}
                        disabled={submittingAction}
                      >
                        <CheckCircle2 className="size-4 mr-2" /> [ Resolve Case ]
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 border-zinc-300 dark:border-zinc-700 text-foreground hover:bg-accent font-bold rounded-xl text-xs"
                        onClick={() => setDismissOpen(true)}
                        disabled={submittingAction}
                      >
                        <XCircle className="size-4 mr-2" /> [ Dismiss Case ]
                      </Button>
                    </div>
                  )}

                  {(selectedReport.status === "resolved" || selectedReport.status === "dismissed") && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-center flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedReport.status === "resolved" ? (
                          <CheckCircle2 className="size-4 text-emerald-600" />
                        ) : (
                          <XCircle className="size-4 text-zinc-500" />
                        )}
                        <span className="text-xs font-bold uppercase">
                          Case Closed ({selectedReport.status})
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Final Authority: HOD {userDept}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Resolve Confirmation Modal */}
        <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="size-5" /> Resolve Violation Case
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provide official HOD resolution decision reason. This will resolve the case and notify both the faculty reporter and the student.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="res-remarks" className="text-xs font-bold text-foreground">
                Mandatory Decision Reason *
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
                className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
                onClick={handleResolveSubmit}
                loading={submittingAction}
                disabled={!resolveRemarks.trim() || submittingAction}
              >
                {submittingAction ? "Resolving Case..." : "Confirm Resolution"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dismiss Confirmation Modal */}
        <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-bold">
                <XCircle className="size-5" /> Dismiss Violation Report
              </DialogTitle>
              <DialogDescription className="text-xs">
                A mandatory dismissal reason is required. The faculty reporter will be notified with this reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="dis-reason" className="text-xs font-bold text-foreground">
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
                disabled={!dismissReason.trim() || submittingAction}
              >
                {submittingAction ? "Dismissing Case..." : "Confirm Dismissal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

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
  getMyViolationReportsApi,
  getMyViolationStatsApi,
  getMyViolationTimelineApi,
  submitViolationExplanationApi,
} from "@/lib/api/student.server";
import type { DBViolationReport } from "@/lib/db/violations.server";
import type {
  StudentViolationStats,
  StudentTimelineEvent,
} from "@/lib/db/student.server";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  Building2,
  Calendar,
  MapPin,
  XCircle,
  Eye,
  Send,
  History,
  Lock,
  MessageSquare,
  FileText,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/violations")({
  head: () => ({ meta: [{ title: "My Incidents & Discipline — Student Portal" }] }),
  component: StudentViolationsPage,
});

function StudentViolationsPage() {
  const { profile } = useAuth();
  const studentCode = profile?.student_code || profile?.email || "";

  const [reports, setReports] = useState<DBViolationReport[]>([]);
  const [stats, setStats] = useState<StudentViolationStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Queues & Filters
  const [selectedQueue, setSelectedQueue] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [violationTypeFilter, setViolationTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Details State
  const [selectedReport, setSelectedReport] = useState<DBViolationReport | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeline, setTimeline] = useState<StudentTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Explanation Submission Form State
  const [explanationText, setExplanationText] = useState("");
  const [supportingNote, setSupportingNote] = useState("");
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const filterPayload: {
        status?: string;
        severity?: string;
        violationType?: string;
        search?: string;
      } = {};

      if (severityFilter !== "ALL") filterPayload.severity = severityFilter;
      if (violationTypeFilter !== "ALL") filterPayload.violationType = violationTypeFilter;
      if (searchQuery.trim()) filterPayload.search = searchQuery.trim();

      if (selectedQueue !== "ALL") {
        if (selectedQueue === "AWAITING_RESPONSE") filterPayload.status = "awaiting_response";
        else if (selectedQueue === "OPEN") filterPayload.status = "open";
        else if (selectedQueue === "UNDER_REVIEW") filterPayload.status = "under_review";
        else if (selectedQueue === "ESCALATED") filterPayload.status = "escalated";
        else if (selectedQueue === "RESOLVED") filterPayload.status = "resolved";
        else if (selectedQueue === "DISMISSED") filterPayload.status = "dismissed";
      }

      const [reportsRes, statsRes] = await Promise.all([
        getMyViolationReportsApi({ data: filterPayload }),
        getMyViolationStatsApi(),
      ]);

      if (reportsRes.success) {
        setReports(reportsRes.reports);
      }
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error("Failed to load student incidents:", err);
      toast.error("Failed to load your incident reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedQueue, severityFilter, violationTypeFilter]);

  async function handleOpenDetails(report: DBViolationReport) {
    setSelectedReport(report);
    setDrawerOpen(true);
    setTimelineLoading(true);
    setExplanationText("");
    setSupportingNote("");
    try {
      const res = await getMyViolationTimelineApi({ data: { reportId: report.id } });
      if (res.success) {
        setTimeline(res.timeline);
      }
    } catch (err) {
      console.error("Error loading incident timeline:", err);
    } finally {
      setTimelineLoading(false);
    }
  }

  async function handleSubmitExplanation() {
    if (!selectedReport || explanationText.trim().length < 10) {
      toast.error("Please provide an explanation of at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitViolationExplanationApi({
        data: {
          reportId: selectedReport.id,
          explanation: explanationText.trim(),
          evidence: supportingNote.trim() || undefined,
        },
      });
      if (res.success && res.report) {
        toast.success("Explanation Submitted", {
          description: `Your explanation for Incident #${selectedReport.id} has been submitted to your Counselor for review.`,
        });
        setConfirmSubmitOpen(false);
        setSelectedReport(res.report);
        loadData();
      } else {
        toast.error(res.error || "Failed to submit explanation.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit explanation.");
    } finally {
      setSubmitting(false);
    }
  }

  // Client search filtering
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.violation_type.toLowerCase().includes(q) ||
        r.class_name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.reported_by.toLowerCase().includes(q),
    );
  }, [reports, searchQuery]);

  const awaitingResponseCount = stats?.awaitingMyResponse ?? 0;

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Incidents & Disciplinary Records"
          description="View reported attendance/movement observations, submit official explanations, and track case resolution"
          breadcrumb={[
            { label: "Student Portal", to: "/student/dashboard" },
            { label: "My Incidents" },
          ]}
        />

        {/* Action Required Alert Banner */}
        {awaitingResponseCount > 0 && (
          <div className="rounded-2xl border-2 border-amber-500/80 bg-amber-50/90 dark:bg-amber-950/40 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Clock className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                  ⚠️ EXPLANATION STATEMENT REQUIRED
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  You have <strong>{awaitingResponseCount}</strong> incident report(s) awaiting your official response statement. Please submit your explanation before the deadline.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shrink-0 text-xs"
              onClick={() => setSelectedQueue("AWAITING_RESPONSE")}
            >
              Respond Now
            </Button>
          </div>
        )}

        {/* 7-Metric KPI Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Total Incidents", value: stats?.totalIncidents ?? 0, color: "text-foreground", bg: "bg-muted/40" },
            { label: "Open Cases", value: stats?.openCases ?? 0, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/60 dark:bg-blue-950/20" },
            { label: "Awaiting Response", value: stats?.awaitingMyResponse ?? 0, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/60 dark:bg-amber-950/20" },
            { label: "Under Counselor Review", value: stats?.underHodReview ?? 0, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50/60 dark:bg-indigo-950/20" },
            { label: "Escalated to HOD", value: stats?.escalated ?? 0, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50/60 dark:bg-purple-950/20" },
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

        {/* Filter Controls & Queue Tabs */}
        <div className="card-surface p-5 rounded-2xl border border-border space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-divider">
            {[
              { id: "ALL", label: "All Incidents" },
              { id: "AWAITING_RESPONSE", label: `Awaiting My Response (${awaitingResponseCount})` },
              { id: "OPEN", label: "Open Cases" },
              { id: "UNDER_REVIEW", label: "Under Counselor Review" },
              { id: "ESCALATED", label: "Escalated to HOD" },
              { id: "RESOLVED", label: "Resolved" },
              { id: "DISMISSED", label: "Dismissed" },
            ].map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQueue(q.id)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  selectedQueue === q.id
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="relative col-span-2">
              <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search report ID, category, subject, location..."
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

            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs rounded-xl border-border hover:bg-accent"
              onClick={() => {
                setSelectedQueue("ALL");
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

        {/* Incidents Table */}
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-divider flex items-center justify-between bg-muted/20">
            <div>
              <h2 className="text-sm font-bold text-foreground">My Incident Records</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official disciplinary and class attendance observations recorded on your student profile ({studentCode}).
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading your incident records...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
              <h3 className="mt-3 font-bold text-foreground">Clean Record</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You have no disciplinary or attendance violation reports matching the selected filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-divider bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3.5 px-4">Case ID / Date</th>
                    <th className="py-3.5 px-4">Severity</th>
                    <th className="py-3.5 px-4">Scheduled Class & Location</th>
                    <th className="py-3.5 px-4">Reported By</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">My Response</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filteredReports.map((report) => {
                    const hasSubmittedResponse = !!(report.explanation && report.explanation.trim().length > 0);
                    const isAwaitingResponse =
                      !hasSubmittedResponse &&
                      (report.status === "reported" || report.status === "awaiting_explanation");

                    return (
                      <tr
                        key={report.id}
                        className={cn(
                          "transition-colors hover:bg-accent/40",
                          isAwaitingResponse && "bg-amber-50/20 dark:bg-amber-950/10 font-medium",
                        )}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-foreground block">
                            #{report.id}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
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

                        <td className="py-3.5 px-4">
                          {hasSubmittedResponse ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <CheckCircle2 className="size-3" /> Submitted
                            </span>
                          ) : isAwaitingResponse ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                              <Clock className="size-3" /> Required
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant={isAwaitingResponse ? "default" : "outline"}
                            className={cn(
                              "h-8 text-xs font-semibold rounded-xl",
                              isAwaitingResponse && "bg-amber-600 hover:bg-amber-700 text-white font-bold",
                            )}
                            onClick={() => handleOpenDetails(report)}
                          >
                            <Eye className="size-3.5 mr-1" />
                            {isAwaitingResponse ? "Submit Response" : "View Details"}
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

        {/* Detailed Incident Sheet / Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto space-y-6">
            {selectedReport && (
              <>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      INCIDENT CASE #{selectedReport.id}
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
                    Reported on {new Date(selectedReport.created_at).toLocaleString("en-IN")}
                  </SheetDescription>
                </SheetHeader>

                {/* Section A: Student Information */}
                <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2 border-b border-divider pb-2">
                    <User className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      STUDENT RECORD
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

                {/* Section B: Academic Timetable Snapshot */}
                <div className="p-4 rounded-2xl border border-blue-200/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        SCHEDULED CLASS CONTEXT
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      Timetable Snapshot
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Scheduled Subject</span>
                      <span className="font-bold text-foreground">{selectedReport.class_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Room</span>
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

                {/* Section C: Faculty Observation (Read-Only) */}
                <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-divider pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        FACULTY OBSERVATION
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Lock className="size-3" /> Read Only
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Reported By</span>
                      <span className="font-bold text-foreground">{selectedReport.reported_by}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Observed Location</span>
                      <span className="font-semibold text-foreground">{selectedReport.location}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Observation Description</span>
                      <p className="font-medium text-foreground bg-background p-2.5 rounded-xl border border-border mt-1 leading-relaxed">
                        {selectedReport.remarks}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section D: Student Explanation Statement (Submission / Display) */}
                {selectedReport.explanation ? (
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                          MY SUBMITTED EXPLANATION
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Lock className="size-3" /> Locked
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium bg-background p-2.5 rounded-xl border border-emerald-200 mt-1 leading-relaxed">
                      {selectedReport.explanation}
                    </p>
                    {selectedReport.evidence && (
                      <p className="text-[11px] text-muted-foreground italic mt-1">
                        Note / Evidence: {selectedReport.evidence}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground block pt-1">
                      Submitted on: {new Date(selectedReport.explanation_submitted_at || selectedReport.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : selectedReport.status === "resolved" || selectedReport.status === "dismissed" ? (
                  <div className="p-4 rounded-2xl border border-border bg-muted/20 text-xs text-muted-foreground">
                    This incident has been finalized and closed by the Department HOD.
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-amber-600" />
                        <span className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">
                          SUBMIT YOUR OFFICIAL EXPLANATION
                        </span>
                      </div>
                      {selectedReport.explanation_deadline && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          Due: {new Date(selectedReport.explanation_deadline).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="std-exp" className="text-xs font-medium">
                        Explanation Statement * (min 10 characters)
                      </Label>
                      <Textarea
                        id="std-exp"
                        rows={4}
                        value={explanationText}
                        onChange={(e) => setExplanationText(e.target.value)}
                        placeholder="Provide an accurate, honest statement explaining your presence outside class during this scheduled period..."
                        className="text-xs rounded-xl"
                      />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Min 10 characters required</span>
                        <span>{explanationText.length} / 2000 chars</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="std-note" className="text-xs font-medium">
                        Optional Supporting Note / Permission Reference
                      </Label>
                      <Input
                        id="std-note"
                        value={supportingNote}
                        onChange={(e) => setSupportingNote(e.target.value)}
                        placeholder="e.g. Lab permission slip signed by Prof. Sharma"
                        className="text-xs h-9 rounded-xl"
                      />
                    </div>
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-10 mt-2"
                      onClick={() => setConfirmSubmitOpen(true)}
                      disabled={explanationText.trim().length < 10}
                    >
                      <Send className="size-3.5 mr-1.5" /> Submit Explanation to Counselor
                    </Button>
                  </div>
                )}

                {/* Section E: Case Outcome / Decision Display */}
                {selectedReport.decision && (
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                        CASE OUTCOME ({selectedReport.decision_by})
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium leading-relaxed">{selectedReport.decision}</p>
                    <span className="text-[10px] text-muted-foreground block">
                      Decided on: {new Date(selectedReport.decision_at || selectedReport.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* Section F: Chronological Timeline */}
                <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2 border-b border-divider pb-2">
                    <History className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      INCIDENT CHRONOLOGICAL TIMELINE
                    </span>
                  </div>

                  {timelineLoading ? (
                    <span className="text-xs text-muted-foreground">Loading timeline...</span>
                  ) : timeline.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Incident report filed.</span>
                  ) : (
                    <div className="space-y-3 text-xs">
                      {timeline.map((item) => (
                        <div key={item.id} className="flex items-start gap-2.5 border-l-2 border-primary/40 pl-3">
                          <div>
                            <span className="font-bold text-foreground block">
                              {item.description}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.actor} • {new Date(item.timestamp).toLocaleString("en-IN")}
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

        {/* Confirmation Modal */}
        <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <FileCheck className="size-5" /> Confirm Explanation Submission
              </DialogTitle>
              <DialogDescription>
                Once submitted, your explanation statement cannot be edited or overwritten. It will be sent directly to your assigned Counselor for review.
              </DialogDescription>
            </DialogHeader>
            <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-foreground font-medium">
              &ldquo;{explanationText}&rdquo;
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)}>Cancel</Button>
              <Button
                className="bg-primary font-bold"
                onClick={handleSubmitExplanation}
                loading={submitting}
              >
                Confirm & Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
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
  Dialog,
  DialogContent,
  DialogDescription,
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
  History,
  GraduationCap,
  Paperclip,
  Check,
  Info,
  Lock,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { downloadEvidenceImage } from "@/lib/download-evidence";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  queue: z.string().optional(),
});

export const Route = createFileRoute("/admin/violations")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Institutional Compliance & Oversight — Admin Portal" }] }),
  component: AdminViolationsPage,
});

function AdminViolationsPage() {
  const { profile } = useAuth();
  const search = Route.useSearch();

  const [reports, setReports] = useState<DBViolationReport[]>([]);
  const [stats, setStats] = useState<AdminViolationStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Queues & Filters
  const [selectedQueue, setSelectedQueue] = useState<string>(search.queue?.toUpperCase() || "ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [violationTypeFilter, setViolationTypeFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleInspectCritical = () => {
    setSelectedQueue("CRITICAL");
    setDepartmentFilter("ALL");
    setSeverityFilter("ALL");
    setViolationTypeFilter("ALL");
    setYearFilter("ALL");
    setSearchQuery("");
    toast.info("Filtered to Critical & Suspected Violence incidents queue");
    setTimeout(() => {
      document.getElementById("violations-table-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // Drawer / Investigation State
  const [selectedReport, setSelectedReport] = useState<DBViolationReport | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Student Profile History Modal
  const [studentHistoryModalOpen, setStudentHistoryModalOpen] = useState(false);
  const [studentHistoryData, setStudentHistoryData] = useState<AdminStudentViolationHistory | null>(null);
  const [studentHistoryLoading, setStudentHistoryLoading] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Timer for 'Updated X seconds ago'
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

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

      if (reportsRes.success) setReports(reportsRes.reports);
      if (statsRes.success && statsRes.stats) setStats(statsRes.stats);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (err) {
      console.error("Failed to load admin violations:", err);
      toast.error("Failed to load institutional violation data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 15000);
    return () => clearInterval(interval);
  }, [selectedQueue, departmentFilter, severityFilter, violationTypeFilter, yearFilter]);

  async function handleOpenDrawer(report: DBViolationReport) {
    setSelectedReport(report);
    setDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const res = await getAdminViolationAuditHistoryApi({ data: { reportId: report.id } });
      if (res.success) setAuditHistory(res.auditLogs);
    } catch (err) {
      console.error("Error loading admin audit history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleOpenStudentHistory(studentCode: string) {
    setStudentHistoryModalOpen(true);
    setStudentHistoryLoading(true);
    try {
      const res = await getAdminStudentViolationHistoryApi({ data: { studentCode } });
      if (res.success && res.history) setStudentHistoryData(res.history);
    } catch (err) {
      console.error("Error loading student history:", err);
      toast.error("Failed to load student disciplinary profile.");
    } finally {
      setStudentHistoryLoading(false);
    }
  }

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
        r.department.toLowerCase().includes(q) ||
        r.reported_by.toLowerCase().includes(q),
    );
  }, [reports, searchQuery]);

  // Reset page when any filter or queue changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedQueue, departmentFilter, severityFilter, violationTypeFilter, yearFilter, searchQuery]);

  const totalFilteredCount = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedReports = useMemo(() => {
    const startIdx = (validCurrentPage - 1) * pageSize;
    return filteredReports.slice(startIdx, startIdx + pageSize);
  }, [filteredReports, validCurrentPage, pageSize]);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Institutional Compliance & Oversight"
          description="Institution-Wide Disciplinary Oversight & Historical Audit Records (Read-Only Portal)"
          breadcrumb={[
            { label: "Admin Portal", to: "/admin/dashboard" },
            { label: "Compliance & Oversight" },
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

        {/* 8-Metric KPI Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Total Incidents", queueId: "ALL", value: stats?.totalIncidents ?? 0, color: "text-foreground", bg: "bg-muted/40" },
            { label: "New Reports", queueId: "NEW", value: stats?.newReports ?? 0, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/60 dark:bg-amber-950/20" },
            { label: "Under HOD Review", queueId: "UNDER_REVIEW", value: stats?.underReview ?? 0, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/60 dark:bg-blue-950/20" },
            { label: "High Severity", queueId: "HIGH_SEVERITY", value: stats?.highSeverity ?? 0, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50/60 dark:bg-orange-950/20" },
            { label: "Critical", queueId: "CRITICAL", value: stats?.critical ?? 0, color: "text-red-600 dark:text-red-400", bg: "bg-red-50/60 dark:bg-red-950/20" },
            { label: "Violence Reports", queueId: "VIOLENCE", value: stats?.violenceReports ?? 0, color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50/60 dark:bg-rose-950/20" },
            { label: "Resolved", queueId: "RESOLVED", value: stats?.resolved ?? 0, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/60 dark:bg-emerald-950/20" },
            { label: "Dismissed", queueId: "DISMISSED", value: stats?.dismissed ?? 0, color: "text-muted-foreground", bg: "bg-muted/30" },
          ].map((kpi) => (
            <button
              key={kpi.label}
              type="button"
              onClick={() => {
                if (kpi.queueId === "CRITICAL") {
                  handleInspectCritical();
                } else {
                  setSelectedQueue(kpi.queueId);
                  document.getElementById("violations-table-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className={cn(
                "p-3 sm:p-4 rounded-2xl border border-border flex flex-col justify-between shadow-2xs text-left transition-all hover:ring-2 hover:ring-primary/40 cursor-pointer active:scale-[0.98]",
                selectedQueue === kpi.queueId ? "ring-2 ring-primary border-primary bg-primary/5" : kpi.bg
              )}
            >
              <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">{kpi.label}</span>
              <span className={cn("text-xl sm:text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</span>
            </button>
          ))}
        </div>

        {/* Filter Bar & Queue Switcher */}
        <div id="violations-table-section" className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border space-y-4 shadow-xs scroll-mt-6">
          {/* Queue Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-divider overflow-x-auto no-scrollbar scroll-smooth">
            {[
              { id: "ALL", label: "All Incidents" },
              { id: "NEW", label: "New Reports" },
              { id: "UNDER_REVIEW", label: "Under HOD Review" },
              { id: "CRITICAL", label: "Critical" },
              { id: "VIOLENCE", label: "Violence / Suspected" },
              { id: "HIGH_SEVERITY", label: "High Severity" },
              { id: "RESOLVED", label: "Resolved" },
              { id: "DISMISSED", label: "Dismissed" },
            ].map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQueue(q.id)}
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

          {/* Filter Bar Controls */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search student, roll, department, report ID..."
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
                  <SelectItem value="EEE">EEE</SelectItem>
                  <SelectItem value="MECH">MECH</SelectItem>
                  <SelectItem value="CIVIL">CIVIL</SelectItem>
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
                  <SelectItem value="Unauthorized Campus Movement">Unauthorized Campus Movement</SelectItem>
                  <SelectItem value="Suspected Violence">Suspected Violence</SelectItem>
                  <SelectItem value="Verbal Altercation">Verbal Altercation</SelectItem>
                  <SelectItem value="Disruptive Behaviour">Disruptive Behaviour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Global Violations Compliance Table */}
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          {loading && reports.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <ShieldCheck className="size-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-foreground">No Disciplinary Records Found</p>
              <p className="text-xs text-muted-foreground">
                No violation reports match the active institutional filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Case ID & Student</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Severity</th>
                    <th className="py-3.5 px-4">Recorded Class / Location</th>
                    <th className="py-3.5 px-4">Faculty Reporter</th>
                    <th className="py-3.5 px-4">HOD Status</th>
                    <th className="py-3.5 px-4 text-right">Oversight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {paginatedReports.map((report) => {
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
                          <span className="font-bold text-foreground px-2 py-0.5 rounded-md bg-accent text-[11px]">
                            {report.department}
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
                              "inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                              report.status === "resolved" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                              report.status === "dismissed" && "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
                              report.status === "under_review" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                              report.status === "reported" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                            )}
                          >
                            {report.status === "reported" ? "REPORTED" : report.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold rounded-xl"
                            onClick={() => handleOpenDrawer(report)}
                          >
                            <Eye className="size-3.5 mr-1" /> Inspect Record
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredReports.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 sm:px-6 py-3 bg-muted/20">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Showing <strong className="text-foreground font-bold">{Math.min((validCurrentPage - 1) * pageSize + 1, totalFilteredCount)}</strong>–<strong className="text-foreground font-bold">{Math.min(validCurrentPage * pageSize, totalFilteredCount)}</strong> of{" "}
                  <strong className="text-foreground font-bold">{totalFilteredCount}</strong> records
                </span>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 px-2 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted"
                  disabled={validCurrentPage <= 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    document.getElementById("violations-table-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>

                {/* Page Numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                    .reduce((acc: (number | string)[], p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push("...");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground">...</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setCurrentPage(Number(p));
                            document.getElementById("violations-table-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={cn(
                            "size-8 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            validCurrentPage === p
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                          )}
                        >
                          {p}
                        </button>
                      )
                    )}
                </div>

                <span className="sm:hidden text-xs font-semibold text-muted-foreground px-2">
                  {validCurrentPage} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted"
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    document.getElementById("violations-table-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Read-Only Institutional Case Oversight Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col justify-between">
            {selectedReport && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-xs px-4 sm:px-6 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                      INSTITUTIONAL AUDIT RECORD #{selectedReport.id}
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
                    Department of <strong className="text-foreground">{selectedReport.department}</strong> &bull; Reported by{" "}
                    <strong className="text-foreground">{selectedReport.reported_by}</strong> on{" "}
                    {new Date(selectedReport.created_at).toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
                  {/* Student Info */}
                  <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-divider pb-2.5">
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
                        <GraduationCap className="size-3 mr-1" /> View Full Student Profile
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Name</span>
                        <span className="font-bold text-foreground text-sm">{selectedReport.student_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Roll Number</span>
                        <span className="font-bold font-mono text-primary">{selectedReport.student_code}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Department</span>
                        <span className="font-bold text-foreground">{selectedReport.department}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Year / Section</span>
                        <span className="font-bold text-foreground">{selectedReport.year_section}</span>
                      </div>
                    </div>
                  </div>

                  {/* Historical Timetable Snapshot */}
                  <div className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                          HISTORICAL TIMETABLE SNAPSHOT
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300">
                        <Lock className="size-3" /> Immutable Record
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Scheduled Subject</span>
                        <span className="font-bold text-foreground">{selectedReport.class_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Scheduled Room</span>
                        <span className="font-bold text-foreground">{selectedReport.room}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Class Window</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">{selectedReport.scheduled_time}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Assigned Faculty</span>
                        <span className="font-bold text-foreground">{selectedReport.scheduled_faculty || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Faculty Observation */}
                  <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-divider pb-2.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          FACULTY OBSERVATION
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Reported by: <strong className="text-foreground">{selectedReport.reported_by}</strong>
                      </span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Observed Location</span>
                        <span className="font-bold text-foreground">{selectedReport.location}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Observation Remarks</span>
                        <div className="p-3 rounded-xl bg-muted/40 border border-border mt-1 font-medium text-foreground leading-relaxed">
                          {selectedReport.remarks}
                        </div>
                      </div>
                      {selectedReport.witness_notes && (
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Witness / Additional Notes</span>
                          <p className="font-medium text-foreground italic mt-0.5">{selectedReport.witness_notes}</p>
                        </div>
                      )}
                      {selectedReport.evidence && (
                        <div className="space-y-2 pt-2 border-t border-divider">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                              <ImageIcon className="size-3 text-primary" /> Evidence Photo / Attachment
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

                  {/* Student Explanation */}
                  <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-divider pb-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          STUDENT EXPLANATION
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
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-muted/30 border border-border text-center space-y-1">
                        <Info className="size-4 text-muted-foreground/60 mx-auto" />
                        <p className="text-xs font-bold text-muted-foreground">No explanation submitted yet.</p>
                      </div>
                    )}
                  </div>

                  {/* HOD Decision Record */}
                  {selectedReport.decision && (
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          FINAL HOD DECISION RECORDED ({selectedReport.decision_by})
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-medium">{selectedReport.decision}</p>
                      <span className="text-[10px] text-muted-foreground block">
                        Decided at: {new Date(selectedReport.decision_at || selectedReport.created_at).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  {/* Audit History */}
                  <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-divider pb-2.5">
                      <History className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        CHRONOLOGICAL AUDIT TIMELINE
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

                {/* Footer read-only notice */}
                <div className="sticky bottom-0 z-20 border-t border-border bg-card p-4 text-center text-xs font-semibold text-muted-foreground shadow-lg">
                  🛡️ Institutional Compliance Oversight Portal &bull; Read-Only Audit Record
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Student Incident History Modal */}
        <Dialog open={studentHistoryModalOpen} onOpenChange={setStudentHistoryModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
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
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{studentHistoryData.student.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {studentHistoryData.student.studentCode} &bull; {studentHistoryData.student.department} &bull; {studentHistoryData.student.year} Year Sec {studentHistoryData.student.section}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {studentHistoryData.metrics?.totalReports ?? 0} Total Case(s)
                  </span>
                </div>

                {/* Incident History Timeline */}
                <div className="space-y-2">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">Incident Log History</span>
                  <div className="divide-y divide-border border rounded-xl overflow-hidden">
                    {studentHistoryData.timeline.map((h: DBViolationReport) => (
                      <div key={h.id} className="p-3 bg-card flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground block">{h.violation_type}</span>
                          <span className="text-[11px] text-muted-foreground">#{h.id} &bull; {h.location} &bull; Reported by {h.reported_by}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-foreground">
                          {h.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No disciplinary history recorded.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

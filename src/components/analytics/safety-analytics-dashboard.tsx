import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  GraduationCap,
  Layers,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  CompleteSafetyAnalyticsResponse,
  SafetyAnalyticsFilters,
} from "@/lib/db/safety-analytics.server";
import type { DBViolationReport } from "@/lib/db/violations.server";

export interface SafetyDashboardProps {
  role: "admin" | "hod";
  departmentName?: string;
  analytics: CompleteSafetyAnalyticsResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onFilterChange: (filters: SafetyAnalyticsFilters) => void;
  onDrilldown: (drillType: string, drillKey: string) => Promise<{ reports: DBViolationReport[]; total: number }>;
}

export function SafetyAnalyticsDashboard({
  role,
  departmentName,
  analytics,
  loading,
  onRefresh,
  onFilterChange,
  onDrilldown,
}: SafetyDashboardProps) {
  // Preset Date Selection
  const [datePreset, setDatePreset] = useState<"7d" | "30d" | "90d" | "semester" | "custom">("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filters
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterYear, setFilterYear] = useState("ALL");
  const [filterRoom, setFilterRoom] = useState("");

  // Trend Granularity
  const [trendGranularity, setTrendGranularity] = useState<"day" | "week" | "month">("day");

  // Drilldown State
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillReports, setDrillReports] = useState<DBViolationReport[]>([]);
  const [drillTotal, setDrillTotal] = useState(0);

  // Apply Preset Dates
  const handlePresetChange = (preset: "7d" | "30d" | "90d" | "semester" | "custom") => {
    setDatePreset(preset);
    const now = new Date();
    let start: Date | null = null;

    if (preset === "7d") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === "30d") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === "90d") {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (preset === "semester") {
      start = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
    }

    if (start) {
      const sStr = start.toISOString().split("T")[0] || "";
      const eStr = now.toISOString().split("T")[0] || "";
      setStartDate(sStr);
      setEndDate(eStr);
      onFilterChange({
        startDate: sStr,
        endDate: eStr,
        department: role === "admin" ? (filterDept !== "ALL" ? filterDept : undefined) : undefined,
        severity: filterSeverity !== "ALL" ? filterSeverity : undefined,
        violationType: filterCategory !== "ALL" ? filterCategory : undefined,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
        year: filterYear !== "ALL" ? filterYear : undefined,
        room: filterRoom.trim() || undefined,
      });
    }
  };

  const handleApplyFilters = () => {
    onFilterChange({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      department: role === "admin" ? (filterDept !== "ALL" ? filterDept : undefined) : undefined,
      severity: filterSeverity !== "ALL" ? filterSeverity : undefined,
      violationType: filterCategory !== "ALL" ? filterCategory : undefined,
      status: filterStatus !== "ALL" ? filterStatus : undefined,
      year: filterYear !== "ALL" ? filterYear : undefined,
      room: filterRoom.trim() || undefined,
    });
    toast.success("Analytics filters applied.");
  };

  const handleClearFilters = () => {
    setDatePreset("30d");
    setStartDate("");
    setEndDate("");
    setFilterDept("ALL");
    setFilterSeverity("ALL");
    setFilterCategory("ALL");
    setFilterStatus("ALL");
    setFilterYear("ALL");
    setFilterRoom("");
    onFilterChange({});
    toast.info("Filters reset to default.");
  };

  const handleTriggerDrilldown = async (type: string, key: string, label: string) => {
    setDrillTitle(`Incidents: ${label}`);
    setDrillOpen(true);
    setDrillLoading(true);
    try {
      const res = await onDrilldown(type, key);
      setDrillReports(res.reports);
      setDrillTotal(res.total);
    } catch (err) {
      toast.error("Failed to load drill-down incidents.");
    } finally {
      setDrillLoading(false);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    if (!analytics) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Incidents", analytics.kpis.totalIncidents],
      ["Open Cases", analytics.kpis.openIncidents],
      ["Under HOD Review", analytics.kpis.underHodReview],
      ["Escalated Incidents", analytics.kpis.escalatedIncidents],
      ["Resolved Incidents", analytics.kpis.resolvedIncidents],
      ["Dismissed Incidents", analytics.kpis.dismissedIncidents],
      ["High Severity", analytics.kpis.highSeverityIncidents],
      ["Critical Incidents", analytics.kpis.criticalIncidents],
      ["Violence / Physical Altercation", analytics.kpis.violenceReports],
      ["Emergency Incidents", analytics.kpis.emergencyIncidents],
      ["Avg Response Time (sec)", analytics.emergency.avgResponseSeconds],
      ["Avg Dispatch Time (sec)", analytics.emergency.avgDispatchSeconds],
      ["Avg Control Time (sec)", analytics.emergency.avgControlSeconds],
      ["Avg Resolution Time (sec)", analytics.emergency.avgResolutionSeconds],
      ["Resolution Rate (%)", analytics.resolution.resolutionRate],
      ["Escalation Rate (%)", analytics.resolution.escalationRate],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CMADMS_Safety_Analytics_${role}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Safety Analytics CSV export downloaded.");
  };

  const handlePrint = () => {
    window.print();
  };

  const kpis = analytics?.kpis || {
    totalIncidents: 0,
    openIncidents: 0,
    underHodReview: 0,
    escalatedIncidents: 0,
    resolvedIncidents: 0,
    dismissedIncidents: 0,
    highSeverityIncidents: 0,
    criticalIncidents: 0,
    violenceReports: 0,
    emergencyIncidents: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl flex items-center gap-2.5">
            <ShieldAlert className="size-6 text-primary" />
            {role === "admin" ? "Institutional Safety Analytics" : `${departmentName || "Department"} Safety Analytics`}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {role === "admin"
              ? "Comprehensive campus-wide incident analytics, emergency response benchmarks, and academic disciplinary metrics."
              : `Real-time disciplinary insights, student movement safety, and emergency response performance for ${departmentName || "Department"}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl text-xs h-9 gap-1.5 shadow-2xs"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="rounded-xl text-xs h-9 gap-1.5 shadow-2xs"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="rounded-xl text-xs h-9 gap-1.5 shadow-2xs hidden md:flex"
          >
            <Printer className="size-3.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card-surface p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-3">
          {/* Preset Date Buttons */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto max-w-full">
            {(
              [
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "90d", label: "Last 90 Days" },
                { id: "semester", label: "Current Semester" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-colors shrink-0 whitespace-nowrap",
                  datePreset === p.id
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs rounded-lg w-36"
              />
              <span className="text-xs text-muted-foreground font-semibold">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs rounded-lg w-36"
              />
            </div>
          )}
        </div>

        {/* Multi-Factor Dropdown Filters */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {role === "admin" && (
            <div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="text-xs h-8 rounded-xl">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Departments</SelectItem>
                  <SelectItem value="CSE" className="text-xs">CSE Department</SelectItem>
                  <SelectItem value="ECE" className="text-xs">ECE Department</SelectItem>
                  <SelectItem value="EEE" className="text-xs">EEE Department</SelectItem>
                  <SelectItem value="MECH" className="text-xs">MECH Department</SelectItem>
                  <SelectItem value="CIVIL" className="text-xs">CIVIL Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="text-xs h-8 rounded-xl">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Severities</SelectItem>
                <SelectItem value="Low" className="text-xs">Low Severity</SelectItem>
                <SelectItem value="Medium" className="text-xs">Medium Severity</SelectItem>
                <SelectItem value="High" className="text-xs">High Severity</SelectItem>
                <SelectItem value="Critical" className="text-xs">Critical Severity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="text-xs h-8 rounded-xl">
                <SelectValue placeholder="Violation Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Violation Types</SelectItem>
                <SelectItem value="Unauthorized Class Movement" className="text-xs">Unauthorized Class Movement</SelectItem>
                <SelectItem value="Corridor Presence During Class" className="text-xs">Corridor Presence During Class</SelectItem>
                <SelectItem value="Unauthorized Campus Movement" className="text-xs">Unauthorized Campus Movement</SelectItem>
                <SelectItem value="Suspected Violence / Physical Altercation" className="text-xs">Suspected Violence</SelectItem>
                <SelectItem value="Verbal Altercation / Misconduct" className="text-xs">Verbal Altercation</SelectItem>
                <SelectItem value="Disruptive Behaviour" className="text-xs">Disruptive Behaviour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="text-xs h-8 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Case Statuses</SelectItem>
                <SelectItem value="reported" className="text-xs">Reported</SelectItem>
                <SelectItem value="under_review" className="text-xs">Under Review</SelectItem>
                <SelectItem value="explanation_submitted" className="text-xs">Explanation Submitted</SelectItem>
                <SelectItem value="escalated" className="text-xs">Escalated</SelectItem>
                <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
                <SelectItem value="dismissed" className="text-xs">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              placeholder="Filter Room / Hall..."
              className="text-xs h-8 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={handleApplyFilters}
              className="rounded-xl text-xs h-8 font-bold flex-1 bg-primary text-primary-foreground"
            >
              Apply
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClearFilters}
              title="Reset Filters"
              className="h-8 w-8 shrink-0 rounded-xl"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 1. 10 DYNAMIC KPI CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {[
          {
            label: "Total Incidents",
            value: kpis.totalIncidents,
            icon: Shield,
            color: "bg-primary/10 text-primary",
            drillType: "department",
            drillKey: "ALL",
          },
          {
            label: "Open Cases",
            value: kpis.openIncidents,
            icon: Clock,
            color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
            drillType: "status",
            drillKey: "reported",
          },
          {
            label: "Under HOD Review",
            value: kpis.underHodReview,
            icon: FileText,
            color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
            drillType: "status",
            drillKey: "under_review",
          },
          {
            label: "Escalated to Admin",
            value: kpis.escalatedIncidents,
            icon: ArrowUpRight,
            color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
            drillType: "status",
            drillKey: "escalated",
          },
          {
            label: "Resolved Cases",
            value: kpis.resolvedIncidents,
            icon: CheckCircle2,
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
            drillType: "status",
            drillKey: "resolved",
          },
          {
            label: "Dismissed / Exonerated",
            value: kpis.dismissedIncidents,
            icon: ArrowDownRight,
            color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
            drillType: "status",
            drillKey: "dismissed",
          },
          {
            label: "High Severity",
            value: kpis.highSeverityIncidents,
            icon: AlertTriangle,
            color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
            drillType: "severity",
            drillKey: "High",
          },
          {
            label: "Critical Severity",
            value: kpis.criticalIncidents,
            icon: AlertOctagon,
            color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 ring-1 ring-red-400/30",
            drillType: "severity",
            drillKey: "Critical",
          },
          {
            label: "Violence / Misconduct",
            value: kpis.violenceReports,
            icon: Flame,
            color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 ring-1 ring-rose-400/40",
            drillType: "category",
            drillKey: "Suspected Violence / Physical Altercation",
          },
          {
            label: "Emergency Responses",
            value: kpis.emergencyIncidents,
            icon: ShieldAlert,
            color: "bg-red-600 text-white font-extrabold shadow-xs",
            drillType: "emergency",
            drillKey: "ALL",
          },
        ].map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => handleTriggerDrilldown(kpi.drillType, kpi.drillKey, kpi.label)}
            className="card-surface p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all text-left flex items-center justify-between group cursor-pointer"
          >
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-foreground group-hover:text-primary transition-colors">
                {kpi.value}
              </p>
            </div>
            <span className={`grid size-9 place-items-center rounded-xl shrink-0 ${kpi.color}`}>
              <kpi.icon className="size-4.5" />
            </span>
          </button>
        ))}
      </div>

      {/* ─── 2. EMERGENCY RESPONSE METRICS ─────────────────────────────────── */}
      <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-divider pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              <ShieldAlert className="size-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Campus Emergency Response Benchmarks
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Actual time-stamped quick-response security milestones (measured from PostgreSQL lifecycle timestamps).
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-2.5 py-1 rounded-full w-fit">
            {analytics?.emergency.total || 0} Total Emergencies
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            {
              title: "Avg Triage Response",
              subtitle: "Reported → Acknowledged",
              seconds: analytics?.emergency.avgResponseSeconds || 0,
              icon: Clock,
              color: "text-blue-600 dark:text-blue-400",
            },
            {
              title: "Avg Patrol Dispatch",
              subtitle: "Acknowledged → Responder Assigned",
              seconds: analytics?.emergency.avgDispatchSeconds || 0,
              icon: UserCheck,
              color: "text-amber-600 dark:text-amber-400",
            },
            {
              title: "Avg Scene Control",
              subtitle: "Responding → Situation Controlled",
              seconds: analytics?.emergency.avgControlSeconds || 0,
              icon: ShieldCheck,
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              title: "Avg Total Incident Closure",
              subtitle: "Reported → Fully Resolved",
              seconds: analytics?.emergency.avgResolutionSeconds || 0,
              icon: CheckCircle2,
              color: "text-purple-600 dark:text-purple-400",
            },
          ].map((m) => {
            const mins = Math.floor(m.seconds / 60);
            const secs = m.seconds % 60;
            const display = m.seconds > 0 ? (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`) : "— (No Data)";

            return (
              <div key={m.title} className="p-3.5 rounded-xl bg-muted/40 border border-divider">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>{m.title}</span>
                  <m.icon className={cn("size-3.5", m.color)} />
                </div>
                <p className={`mt-1.5 text-xl font-extrabold ${m.color}`}>{display}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.subtitle}</p>
              </div>
            );
          })}
        </div>

        {/* Emergency Status Breakdown */}
        {analytics?.emergency.byStatus && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-divider text-center">
            {[
              { label: "Reported", count: analytics.emergency.byStatus.reported, color: "text-blue-600" },
              { label: "Acknowledged", count: analytics.emergency.byStatus.acknowledged, color: "text-amber-600" },
              { label: "Dispatched", count: analytics.emergency.byStatus.responder_assigned, color: "text-purple-600" },
              { label: "Responding", count: analytics.emergency.byStatus.responding, color: "text-orange-600" },
              { label: "Controlled", count: analytics.emergency.byStatus.controlled, color: "text-teal-600" },
              { label: "Resolved", count: analytics.emergency.byStatus.resolved, color: "text-emerald-600" },
            ].map((st) => (
              <div key={st.label} className="p-2 rounded-lg bg-background border border-divider">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{st.label}</p>
                <p className={`text-sm font-extrabold ${st.color}`}>{st.count}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 3. CATEGORY & SEVERITY ANALYTICS ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Violation Category Distribution */}
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="size-4.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Violation Category Distribution
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold">
              Click item to drill-down
            </span>
          </div>

          <div className="space-y-3">
            {(!analytics?.categories || analytics.categories.length === 0) ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No violation categories recorded in this filter window.
              </p>
            ) : (
              analytics.categories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => handleTriggerDrilldown("category", cat.category, cat.category)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-accent/60 transition-colors border border-transparent hover:border-divider space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground truncate max-w-[280px]">{cat.category}</span>
                    <span className="font-bold text-foreground">
                      {cat.count} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        cat.category.toLowerCase().includes("violence")
                          ? "bg-rose-500"
                          : "bg-primary",
                      )}
                      style={{ width: `${Math.max(cat.percentage, 4)}%` }}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4.5 text-amber-500" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Incident Severity Distribution
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(analytics?.severities || []).map((sev) => (
              <button
                key={sev.severity}
                onClick={() => handleTriggerDrilldown("severity", sev.severity, `${sev.severity} Severity`)}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all hover:scale-[1.01]",
                  sev.severity === "Critical" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300",
                  sev.severity === "High" && "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300",
                  sev.severity === "Medium" && "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
                  sev.severity === "Low" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                )}
              >
                <p className="text-xs font-extrabold uppercase">{sev.severity} Severity</p>
                <p className="mt-1 text-2xl font-black">{sev.count}</p>
                <p className="text-[11px] font-bold opacity-80 mt-0.5">{sev.percentage}% of total</p>
              </button>
            ))}
          </div>

          {/* Critical Warning Notice */}
          {(kpis.criticalIncidents > 0 || kpis.violenceReports > 0) && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
              <AlertOctagon className="size-5 text-destructive shrink-0" />
              <p className="text-xs font-bold text-destructive">
                {kpis.criticalIncidents} Critical and {kpis.violenceReports} Violence reports require immediate disciplinary committee review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. DEPARTMENT BENCHMARKS (ADMIN ONLY) ─────────────────────────── */}
      {role === "admin" && (
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-divider flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-muted/20">
            <div className="flex items-center gap-2">
              <Building2 className="size-4.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Department Campus Safety Rankings & Performance
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold">
              Isolated & aggregate department comparison
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-divider bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Total Incidents</th>
                  <th className="py-3 px-4">Critical / High</th>
                  <th className="py-3 px-4">Violence</th>
                  <th className="py-3 px-4">Open Cases</th>
                  <th className="py-3 px-4">Resolved</th>
                  <th className="py-3 px-4">Avg Resolution</th>
                  <th className="py-3 px-4 text-right">Drill-down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {(!analytics?.departments || analytics.departments.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                      No department data available.
                    </td>
                  </tr>
                ) : (
                  analytics.departments.map((dept) => (
                    <tr key={dept.department} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                          {dept.department.slice(0, 3)}
                        </span>
                        {dept.department} Department
                      </td>
                      <td className="py-3 px-4 font-extrabold text-foreground">{dept.totalIncidents}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {dept.criticalIncidents}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {dept.violenceIncidents > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            {dept.violenceIncidents}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-amber-600">{dept.openCases}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">{dept.resolvedCases}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {dept.avgResolutionHours > 0 ? `${dept.avgResolutionHours} hrs` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleTriggerDrilldown("department", dept.department, `${dept.department} Department`)
                          }
                          className="h-7 text-xs text-primary font-bold"
                        >
                          View Cases &rarr;
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

      {/* ─── 5. TIMETABLE-BASED SAFETY & ROOM ANALYTICS ───────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* In-Class vs Free Period */}
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-divider pb-3">
            <BookOpen className="size-4.5 text-primary" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Timetable Conflict State
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                During Active Class
              </p>
              <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-300">
                {analytics?.timetable.inClassIncidents || 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Absent / Left Room</p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">
                Free / Corridor Period
              </p>
              <p className="mt-1 text-2xl font-black text-purple-700 dark:text-purple-300">
                {analytics?.timetable.freePeriodIncidents || 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Hallway / Common Area</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Historical incidents preserve the immutable class snapshot at the exact time of faculty verification.
          </p>
        </div>

        {/* Top Reporting Rooms */}
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="size-4.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Top Reported Rooms
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            {(!analytics?.timetable.topRooms || analytics.timetable.topRooms.length === 0) ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No room data recorded.</p>
            ) : (
              analytics.timetable.topRooms.map((r) => (
                <button
                  key={r.room}
                  onClick={() => handleTriggerDrilldown("room", r.room, `Room ${r.room}`)}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent/60 transition-colors text-xs"
                >
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    {r.room}
                  </span>
                  <span className="font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {r.count} reports
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Top Subjects */}
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Top Scheduled Subjects
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            {(!analytics?.timetable.topSubjects || analytics.timetable.topSubjects.length === 0) ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No subject data recorded.</p>
            ) : (
              analytics.timetable.topSubjects.map((s) => (
                <button
                  key={s.subject}
                  onClick={() => handleTriggerDrilldown("subject", s.subject, s.subject)}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent/60 transition-colors text-xs"
                >
                  <div className="text-left min-w-0 pr-2">
                    <p className="font-semibold text-foreground truncate">{s.subject}</p>
                    <p className="text-[10px] text-muted-foreground">{s.code}</p>
                  </div>
                  <span className="font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                    {s.count}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── 6. DISCIPLINARY RESOLUTION BENCHMARKS ─────────────────────────── */}
      <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-divider pb-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4.5 text-primary" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Disciplinary Hearing & Resolution Benchmarks
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-divider">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Avg Time to HOD Review</p>
            <p className="mt-1 text-2xl font-black text-foreground">
              {analytics?.resolution.avgReviewHours || 0} hrs
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Faculty Submission &rarr; Explanation / Hearing</p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-divider">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Avg Resolution Time</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">
              {analytics?.resolution.avgResolutionHours || 0} hrs
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Report &rarr; Official Case Closure</p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-divider">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Resolution Rate</p>
            <p className="mt-1 text-2xl font-black text-foreground">
              {analytics?.resolution.resolutionRate || 0}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Cases successfully concluded</p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-divider">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Escalation Rate</p>
            <p className="mt-1 text-2xl font-black text-purple-600">
              {analytics?.resolution.escalationRate || 0}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Referred to Disciplinary Committee</p>
          </div>
        </div>
      </div>

      {/* ─── 7. DRILL-DOWN MODAL ───────────────────────────────────────────── */}
      <Dialog open={drillOpen} onOpenChange={setDrillOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full rounded-2xl p-4 sm:p-6 max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b border-divider pb-3 shrink-0">
            <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <span>{drillTitle}</span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {drillTotal} Incidents Found
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Underlying read-only incident records with full academic snapshots.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-2">
            {drillLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                Loading drill-down incident reports...
              </div>
            ) : drillReports.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                No individual incidents found for this selection.
              </p>
            ) : (
              <div className="divide-y divide-divider border border-divider rounded-xl overflow-hidden">
                {drillReports.map((r) => (
                  <div key={r.id} className="p-3.5 text-xs space-y-2 hover:bg-accent/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <span className="font-mono text-primary">{r.id}</span>
                        <span>•</span>
                        <span>{r.student_name}</span>
                        <span className="text-muted-foreground font-normal">({r.student_code})</span>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          r.severity === "Critical" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
                          r.severity === "High" && "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
                          r.severity === "Medium" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                          r.severity === "Low" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                        )}
                      >
                        {r.severity}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg">
                      <div>
                        <span className="font-semibold text-foreground">Dept / Sec:</span> {r.department} • {r.year_section}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Class:</span> {r.class_name || "Corridor"}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Room:</span> {r.room || "—"}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Reported By:</span> {r.reported_by}
                      </div>
                    </div>

                    <p className="text-[11px] text-foreground font-medium">
                      <span className="font-bold text-muted-foreground">Violation:</span> {r.violation_type} — {r.remarks}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-divider/60">
                      <span>Status: <strong className="text-foreground uppercase">{r.status}</strong></span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

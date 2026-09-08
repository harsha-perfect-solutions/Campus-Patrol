import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  GraduationCap,
  History,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Printer,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getExecutiveSafetyDashboardApi,
  generateExecutiveSafetyReportApi,
  getSavedSafetyReportsApi,
  logReportExportApi,
  type ExecutiveDashboardData,
} from "@/lib/api/safety-reporting.server";
import type { SafetyAnalyticsFilters } from "@/lib/db/safety-analytics.server";
import type { SavedSafetyReportSnapshot } from "@/lib/db/safety-reporting.server";

export const Route = createFileRoute("/admin/safety-reports")({
  head: () => ({
    meta: [
      { title: "Safety Intelligence & Executive Reports — Admin Console" },
      {
        name: "description",
        content: "Institutional safety intelligence, historical hotspot detection, emergency benchmarks and immutable executive safety reporting.",
      },
    ],
  }),
  component: AdminSafetyReportsPage,
});

function AdminSafetyReportsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminSafetyReportsContent />
    </RoleGuard>
  );
}

function AdminSafetyReportsContent() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<"7d" | "30d" | "90d" | "semester" | "academic_year" | "custom">("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Report Generation Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [customReportTitle, setCustomReportTitle] = useState("");
  const [generating, setGenerating] = useState(false);

  // Saved Snapshots Drawer / Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedSafetyReportSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SavedSafetyReportSnapshot | null>(null);
  const [viewSnapshotModalOpen, setViewSnapshotModalOpen] = useState(false);

  // Active Metric Tab in Trend Chart
  const [trendMetric, setTrendMetric] = useState<"count" | "critical" | "resolved">("count");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const filters: SafetyAnalyticsFilters = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        department: deptFilter !== "ALL" ? deptFilter : undefined,
      };
      const res = await getExecutiveSafetyDashboardApi({ data: filters });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res.error || "Failed to load safety intelligence data.");
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      toast.error("Failed to connect to safety intelligence server.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, deptFilter]);

  const loadSavedReports = async () => {
    try {
      const res = await getSavedSafetyReportsApi();
      if (res.success) {
        setSavedReports(res.reports);
      }
    } catch (err) {
      console.error("Failed to load saved reports:", err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    loadSavedReports();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Preset Date Selection
  const handlePresetChange = (preset: "7d" | "30d" | "90d" | "semester" | "academic_year" | "custom") => {
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
    } else if (preset === "academic_year") {
      start = new Date(now.getFullYear(), 0, 1);
    }

    if (start) {
      const sStr = start.toISOString().split("T")[0] || "";
      const eStr = now.toISOString().split("T")[0] || "";
      setStartDate(sStr);
      setEndDate(eStr);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await generateExecutiveSafetyReportApi({
        data: {
          filters: {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            department: deptFilter !== "ALL" ? deptFilter : undefined,
          },
          customTitle: customReportTitle.trim() || undefined,
        },
      });

      if (res.success && res.report) {
        toast.success(`Executive Safety Report #${res.report.id} generated and saved.`);
        setGenerateModalOpen(false);
        setCustomReportTitle("");
        loadSavedReports();
        setSelectedSnapshot(res.report);
        setViewSnapshotModalOpen(true);
      } else {
        toast.error(res.error || "Failed to generate report snapshot.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate executive report.");
    } finally {
      setGenerating(false);
    }
  };

  // Export handlers
  const handleExportCSV = async () => {
    if (!data) return;
    const kpis = data.kpis;
    const emg = data.emergencyBenchmarks;
    const res = data.disciplinaryMetrics;

    const rows = [
      ["CAMPUS SAFETY EXECUTIVE INTELLIGENCE BRIEF"],
      ["Generated At", new Date().toISOString()],
      ["Scope", deptFilter === "ALL" ? "Institution-Wide" : `${deptFilter} Department`],
      ["Date Window", startDate && endDate ? `${startDate} to ${endDate}` : "All Available History"],
      [],
      ["EXECUTIVE METRICS", "VALUE"],
      ["Total Verified Incidents", kpis.totalIncidents],
      ["Open Cases", kpis.openIncidents],
      ["Under HOD Review", kpis.underHodReview],
      ["Escalated Incidents", kpis.escalatedIncidents],
      ["Resolved Incidents", kpis.resolvedIncidents],
      ["Dismissed Incidents", kpis.dismissedIncidents],
      ["High Severity", kpis.highSeverityIncidents],
      ["Critical Severity", kpis.criticalIncidents],
      ["Violence / Physical Altercation", kpis.violenceReports],
      ["Emergency Dispatches", emg.totalEmergencies],
      ["Unresolved Emergencies", emg.unresolvedCount],
      ["Average Emergency Triage Time (sec)", emg.avgResponseSeconds],
      ["Fastest Emergency Triage (sec)", emg.fastestResponseSeconds],
      ["Median Emergency Triage (sec)", emg.medianResponseSeconds],
      ["Average Resolution Time (hrs)", res.avgResolutionHours],
      ["Resolution Rate (%)", res.resolutionRate],
      ["Escalation Rate (%)", res.escalationRate],
      [],
      ["HISTORICAL SAFETY HOTSPOTS"],
      ["Hotspot ID", "Location", "Building", "Room", "Incidents", "Critical", "Violence", "Risk Score", "Level"],
      ...data.hotspots.map((h) => [
        h.id,
        h.locationName,
        h.buildingBlock,
        h.room,
        h.totalIncidents,
        h.criticalIncidents,
        h.violenceIncidents,
        h.riskScore,
        h.frequencyLevel,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CMADMS_Safety_Intelligence_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await logReportExportApi({
      data: {
        exportFormat: "CSV",
        scope: deptFilter,
      },
    });

    toast.success("Executive Safety CSV export downloaded.");
  };

  const handlePrint = async () => {
    if (!data) { toast.error("No data loaded yet. Please wait and try again."); return; }

    await logReportExportApi({ data: { exportFormat: "PRINT", scope: deptFilter } });

    const kpisD = data.kpis;
    const emgD  = data.emergencyBenchmarks;
    const resD  = data.disciplinaryMetrics;
    const dateLabel = startDate && endDate ? `${startDate} to ${endDate}` : "All Available History";
    const scopeLabel = deptFilter === "ALL" ? "Institution-Wide" : `${deptFilter} Department`;
    const generatedAt = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

    const hotspotRows = (data.hotspots || []).map((h, i) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"}">
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${h.locationName || "—"}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0">${h.buildingBlock || "—"} ${h.room || ""}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${h.totalIncidents ?? 0}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${h.criticalIncidents ?? 0}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">${h.violenceIncidents ?? 0}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:700">${h.riskScore ?? 0}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">
          <span style="background:${h.frequencyLevel === "CRITICAL_HOTSPOT" ? "#fee2e2" : h.frequencyLevel === "ELEVATED_WATCH" ? "#fef3c7" : "#f0fdf4"};color:${h.frequencyLevel === "CRITICAL_HOTSPOT" ? "#dc2626" : h.frequencyLevel === "ELEVATED_WATCH" ? "#d97706" : "#16a34a"};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">${(h.frequencyLevel || "").replace(/_/g," ")}</span>
        </td>
      </tr>`).join("");

    const kpiCard = (label: string, value: string | number, sub?: string) => `
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;background:#f8fafc;min-width:140px">
        <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:4px">${label}</div>
        <div style="font-size:26px;font-weight:900;color:#0f172a;line-height:1">${value}</div>
        ${sub ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px">${sub}</div>` : ""}
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CMADMS — Safety Intelligence Report</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #0f172a; background: #fff; }
    h2 { font-size: 18px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
    h3 { font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1e3a5f; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .badge { display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700 }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:2px solid #1e3a5f;margin-bottom:18px">
    <div>
      <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">CMADMS · Campus Guard Pro</div>
      <h2>Safety Intelligence &amp; Executive Report</h2>
      <div style="font-size:12px;color:#475569;margin-top:3px">Scope: <strong>${scopeLabel}</strong> &nbsp;|&nbsp; Period: <strong>${dateLabel}</strong></div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#94a3b8">GENERATED</div>
      <div style="font-size:12px;font-weight:700;color:#0f172a">${generatedAt}</div>
      <div style="margin-top:6px;background:#1e3a5f;color:#fff;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700">CONFIDENTIAL</div>
    </div>
  </div>

  <!-- KPI SUMMARY -->
  <div class="section">
    <h3>Executive KPI Summary</h3>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
      ${kpiCard("Total Reports", kpisD.totalIncidents, "Cumulative")}
      ${kpiCard("Open Cases", kpisD.openIncidents, "Pending resolution")}
      ${kpiCard("Under HOD Review", kpisD.underHodReview, "Dept. hearings")}
      ${kpiCard("Escalated", kpisD.escalatedIncidents, "Admin committee")}
      ${kpiCard("Resolved", kpisD.resolvedIncidents, `${resD.resolutionRate?.toFixed(1) ?? 0}% resolution`)}
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:10px">
      ${kpiCard("Dismissed", kpisD.dismissedIncidents, "Verified passes")}
      ${kpiCard("High Severity", kpisD.highSeverityIncidents, "Escalation risk")}
      ${kpiCard("Critical", kpisD.criticalIncidents, "Institutional alerts")}
      ${kpiCard("Violence / Fight", kpisD.violenceReports, "Physical misconduct")}
      ${kpiCard("Emergency Calls", emgD.totalEmergencies, `${emgD.unresolvedCount} unresolved`)}
    </div>
  </div>

  <!-- EMERGENCY RESPONSE -->
  <div class="section">
    <h3>Emergency Response Benchmarks</h3>
    <table>
      <thead><tr>
        <th>Avg Triage Time</th><th>Fastest</th><th>Slowest</th><th>Median</th><th>Avg Dispatch</th><th>Avg Resolution</th>
      </tr></thead>
      <tbody><tr style="background:#f8fafc">
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:700">${emgD.avgResponseSeconds ?? 0}s</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#16a34a;font-weight:700">${emgD.fastestResponseSeconds ?? 0}s</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#dc2626;font-weight:700">${emgD.slowestResponseSeconds ?? 0}s</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0">${emgD.medianResponseSeconds ?? 0}s</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0">${emgD.avgDispatchSeconds ?? 0}s</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0">${emgD.avgResolutionSeconds ?? 0}s</td>
      </tr></tbody>
    </table>
  </div>

  <!-- DISCIPLINARY METRICS -->
  <div class="section">
    <h3>Disciplinary Performance Metrics</h3>
    <table>
      <thead><tr>
        <th>Avg Resolution Time</th><th>Resolution Rate</th><th>Escalation Rate</th>
      </tr></thead>
      <tbody><tr style="background:#f8fafc">
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:700">${resD.avgResolutionHours?.toFixed(1) ?? 0} hrs</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:700;color:#16a34a">${resD.resolutionRate?.toFixed(1) ?? 0}%</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:700;color:#dc2626">${resD.escalationRate?.toFixed(1) ?? 0}%</td>
      </tr></tbody>
    </table>
  </div>

  <!-- HOTSPOTS -->
  ${(data.hotspots || []).length > 0 ? `
  <div class="section">
    <h3>Historical Safety Hotspot Detection (${data.hotspots.length} zones flagged)</h3>
    <table>
      <thead><tr>
        <th>Location</th><th>Building / Room</th><th>Total Incidents</th><th>Critical</th><th>Violence</th><th>Risk Score</th><th>Level</th>
      </tr></thead>
      <tbody>${hotspotRows}</tbody>
    </table>
  </div>` : ""}

  <!-- FOOTER -->
  <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8">
    <span>CMADMS · Campus Movement &amp; Administration Digital Management System</span>
    <span>Report generated ${generatedAt} · ${scopeLabel}</span>
  </div>

  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`;

    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) { toast.error("Popup was blocked. Please allow popups and try again."); return; }
    printWin.document.write(html);
    printWin.document.close();
  };


  const kpis = data?.kpis || {
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

  const emg = data?.emergencyBenchmarks || {
    totalEmergencies: 0,
    unresolvedCount: 0,
    avgResponseSeconds: 0,
    fastestResponseSeconds: 0,
    slowestResponseSeconds: 0,
    medianResponseSeconds: 0,
    avgDispatchSeconds: 0,
    avgControlSeconds: 0,
    avgResolutionSeconds: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safety Intelligence & Executive Reports"
        description="Institutional safety command intelligence, historical hotspot detection, emergency response benchmarks, and immutable executive reporting."
        breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Safety Intelligence" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryModalOpen(true)}
              className="rounded-xl text-xs h-9 gap-1.5 shadow-2xs font-semibold flex-1 sm:flex-initial"
            >
              <History className="size-3.5 text-primary" />
              Saved Reports ({savedReports.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl text-xs h-9 gap-1.5 shadow-2xs flex-1 sm:flex-initial"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="rounded-xl text-xs h-9 gap-1.5 shadow-2xs hidden sm:flex"
            >
              <Printer className="size-3.5" />
              Print
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setCustomReportTitle(`Executive Safety Brief — ${new Date().toLocaleDateString()}`);
                setGenerateModalOpen(true);
              }}
              className="rounded-xl text-xs font-bold h-9 gap-1.5 bg-primary text-primary-foreground shadow-xs w-full sm:w-auto"
            >
              <FileCheck className="size-3.5" />
              Generate Safety Report
            </Button>
          </div>
        }
      />

      {/* Filter & Date Presets Bar */}
      <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider pb-3">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto shrink-0">
            {(
              [
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "90d", label: "Last 90 Days" },
                { id: "semester", label: "Semester" },
                { id: "academic_year", label: "Academic Year" },
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

          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select value={deptFilter} onValueChange={setDeptFilter}>
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

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={fetchDashboard}
              disabled={loading}
              title="Refresh Safety Data"
              className="h-8 w-8 rounded-xl"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {datePreset === "custom" && (
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold">Start Date:</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs rounded-lg w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold">End Date:</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs rounded-lg w-36"
              />
            </div>
            <Button size="sm" onClick={fetchDashboard} className="h-8 text-xs rounded-xl font-bold">
              Apply Date
            </Button>
          </div>
        )}
      </div>

      {/* ─── 1. 10 DYNAMIC EXECUTIVE KPI CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {[
          {
            label: "Total Safety Reports",
            value: kpis.totalIncidents,
            sub: "Cumulative observations",
            icon: Shield,
            color: "bg-primary/10 text-primary",
          },
          {
            label: "Open Investigations",
            value: kpis.openIncidents,
            sub: "Pending formal resolution",
            icon: Clock,
            color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
          },
          {
            label: "Under HOD Review",
            value: kpis.underHodReview,
            sub: "Department hearings",
            icon: FileText,
            color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
          },
          {
            label: "Escalated to Admin",
            value: kpis.escalatedIncidents,
            sub: "Disciplinary committee",
            icon: ArrowUpRight,
            color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
          },
          {
            label: "Resolved Cases",
            value: kpis.resolvedIncidents,
            sub: `${data?.disciplinaryMetrics.resolutionRate || 0}% resolution rate`,
            icon: CheckCircle2,
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
          },
          {
            label: "Dismissed / Exonerated",
            value: kpis.dismissedIncidents,
            sub: "Verified authorized passes",
            icon: ArrowDownRight,
            color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
          },
          {
            label: "High Severity",
            value: kpis.highSeverityIncidents,
            sub: "Escalation candidates",
            icon: AlertTriangle,
            color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
          },
          {
            label: "Critical Severity",
            value: kpis.criticalIncidents,
            sub: "Institutional safety alerts",
            icon: AlertOctagon,
            color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 ring-1 ring-red-400/40",
          },
          {
            label: "Violence / Altercation",
            value: kpis.violenceReports,
            sub: "Physical misconduct cases",
            icon: Flame,
            color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 ring-1 ring-rose-400/50",
          },
          {
            label: "Emergency Dispatches",
            value: emg.totalEmergencies,
            sub: `${emg.unresolvedCount} active / unresolved`,
            icon: ShieldAlert,
            color: "bg-red-600 text-white font-bold",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="card-surface p-3 sm:p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{kpi.sub}</p>
            </div>
            <span className={`grid size-8 sm:size-9 place-items-center rounded-xl shrink-0 ${kpi.color}`}>
              <kpi.icon className="size-4 sm:size-4.5" />
            </span>
          </div>
        ))}
      </div>

      {/* ─── 2. HISTORICAL SAFETY HOTSPOT RADAR ─────────────────────────────── */}
      <div className="card-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-divider pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              <MapPin className="size-4.5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  Historical Safety Hotspot Detection
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-2 py-0.5 rounded-md">
                  Rule-Based Analysis
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Locations with elevated incident frequency, severity weightage, or recurring unauthorized student movement.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-muted-foreground">
            {data?.hotspots.length || 0} Watch Zones Flagged
          </span>
        </div>

        {(!data?.hotspots || data.hotspots.length === 0) ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No safety hotspots detected in this evaluation window.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.hotspots.map((h) => (
              <div
                key={h.id}
                className={cn(
                  "p-4 rounded-xl border space-y-2.5 transition-all",
                  h.frequencyLevel === "CRITICAL_HOTSPOT" && "bg-red-500/10 border-red-500/30 text-foreground",
                  h.frequencyLevel === "ELEVATED_WATCH" && "bg-amber-500/10 border-amber-500/30 text-foreground",
                  h.frequencyLevel === "MODERATE_ACTIVITY" && "bg-muted/40 border-divider text-foreground",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">{h.id}</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase",
                      h.frequencyLevel === "CRITICAL_HOTSPOT" && "bg-red-500 text-white",
                      h.frequencyLevel === "ELEVATED_WATCH" && "bg-amber-500 text-amber-950",
                      h.frequencyLevel === "MODERATE_ACTIVITY" && "bg-muted text-foreground",
                    )}
                  >
                    {h.frequencyLevel.replace("_", " ")}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-foreground truncate">{h.locationName}</h3>
                  <p className="text-[10px] text-muted-foreground">{h.buildingBlock}</p>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-background/60 p-2 rounded-lg text-center text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Total</span>
                    <p className="font-extrabold text-foreground">{h.totalIncidents}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Critical</span>
                    <p className="font-extrabold text-red-600">{h.criticalIncidents}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Violence</span>
                    <p className="font-extrabold text-rose-600">{h.violenceIncidents}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-divider/60">
                  <span>Score: <strong className="text-foreground">{h.riskScore}</strong></span>
                  <span className="font-bold text-orange-600">{h.trendIndicator}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 3. DISCIPLINARY PERFORMANCE ──────────────── */}
      <div>

        {/* Disciplinary Performance */}
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <Activity className="size-4.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Disciplinary Performance & Resolution Rates
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-divider">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Avg Time to HOD Hearing</p>
              <p className="mt-1 text-xl font-black text-foreground">
                {data?.disciplinaryMetrics.avgReviewHours || 0} hrs
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Faculty Submission &rarr; Explanation</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-divider">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Avg Case Resolution Time</p>
              <p className="mt-1 text-xl font-black text-emerald-600">
                {data?.disciplinaryMetrics.avgResolutionHours || 0} hrs
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Report &rarr; Official Closure</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-divider">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Resolution Rate</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                {data?.disciplinaryMetrics.resolutionRate || 0}%
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">Escalation Rate</p>
              <p className="text-lg font-black text-purple-700 dark:text-purple-300">
                {data?.disciplinaryMetrics.escalationRate || 0}%
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Pending Cases</p>
              <p className="text-lg font-black text-amber-700 dark:text-amber-300">
                {data?.disciplinaryMetrics.pendingRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. DEPARTMENT & LOCATION MATRICES ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Matrix */}
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-divider flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Building2 className="size-4.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Department Comparative Safety Matrix
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-divider bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3.5">Department</th>
                  <th className="py-2.5 px-3.5">Total</th>
                  <th className="py-2.5 px-3.5">Critical</th>
                  <th className="py-2.5 px-3.5">Violence</th>
                  <th className="py-2.5 px-3.5">Resolved</th>
                  <th className="py-2.5 px-3.5">Avg Res</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {(!data?.departmentBreakdown || data.departmentBreakdown.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                      No department data available.
                    </td>
                  </tr>
                ) : (
                  data.departmentBreakdown.map((d) => (
                    <tr key={d.department} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-foreground">{d.department}</td>
                      <td className="py-2.5 px-3.5 font-extrabold">{d.totalIncidents}</td>
                      <td className="py-2.5 px-3.5 text-amber-600 font-bold">{d.criticalIncidents}</td>
                      <td className="py-2.5 px-3.5 text-rose-600 font-bold">{d.violenceIncidents}</td>
                      <td className="py-2.5 px-3.5 text-emerald-600 font-bold">{d.resolvedCases}</td>
                      <td className="py-2.5 px-3.5 text-muted-foreground">
                        {d.avgResolutionHours > 0 ? `${d.avgResolutionHours}h` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Location Matrix */}
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-divider flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <MapPin className="size-4.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Top Reported Campus Locations & Rooms
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-divider bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3.5">Location / Hall</th>
                  <th className="py-2.5 px-3.5">Room</th>
                  <th className="py-2.5 px-3.5">Total</th>
                  <th className="py-2.5 px-3.5">Critical</th>
                  <th className="py-2.5 px-3.5">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {(!data?.locationBreakdown || data.locationBreakdown.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                      No location data available.
                    </td>
                  </tr>
                ) : (
                  data.locationBreakdown.map((l, i) => (
                    <tr key={i} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-foreground truncate max-w-[180px]">
                        {l.locationName}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-muted-foreground">{l.room}</td>
                      <td className="py-2.5 px-3.5 font-bold">{l.totalIncidents}</td>
                      <td className="py-2.5 px-3.5 text-red-600 font-bold">{l.highOrCritical}</td>
                      <td className="py-2.5 px-3.5 text-emerald-600 font-bold">{l.resolutionRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── 5. DETERMINISTIC OBSERVATIONS & RECOMMENDATIONS ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-divider pb-2.5">
            <Eye className="size-4.5 text-primary" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Key Institutional Observations
            </h2>
          </div>
          <ul className="space-y-2">
            {(data?.observations || []).map((obs, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-foreground">{obs}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-divider pb-2.5">
            <CheckCircle2 className="size-4.5 text-emerald-600" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Recommended Administrative Actions
            </h2>
          </div>
          <ul className="space-y-2">
            {(data?.recommendations || []).map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span className="text-foreground font-medium">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── MODAL 1: GENERATE SAFETY REPORT SNAPSHOT ──────────────────────── */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="size-5 text-primary" />
              Generate Safety Report Snapshot
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Generates an immutable, timestamped executive safety report snapshot in PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-bold">Report Title *</Label>
              <Input
                value={customReportTitle}
                onChange={(e) => setCustomReportTitle(e.target.value)}
                placeholder="e.g. Monthly Campus Safety & Movement Intelligence Brief"
                className="mt-1 text-xs h-9 rounded-xl"
              />
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-divider text-xs space-y-1">
              <p className="font-semibold text-foreground">Snapshot Parameters:</p>
              <p className="text-muted-foreground">
                • Scope: <strong className="text-foreground">{deptFilter === "ALL" ? "All Departments" : `${deptFilter} Department`}</strong>
              </p>
              <p className="text-muted-foreground">
                • Period: <strong className="text-foreground">{startDate && endDate ? `${startDate} to ${endDate}` : "All History"}</strong>
              </p>
              <p className="text-muted-foreground">
                • Incidents to Freeze: <strong className="text-primary font-bold">{kpis.totalIncidents} Reports</strong>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateModalOpen(false)}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateReport}
              disabled={generating}
              className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5"
            >
              <FileCheck className="size-4" />
              {generating ? "Generating Snapshot..." : "Generate & Freeze Snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: SAVED REPORTS LIST ───────────────────────────────────── */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl rounded-2xl p-4 sm:p-6 max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b border-divider pb-3 shrink-0">
            <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Saved Executive Safety Reports ({savedReports.length})
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Historical immutable snapshots generated by campus administrators.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-2">
            {savedReports.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                No executive safety reports have been generated yet. Click 'Generate Safety Report' to freeze a snapshot.
              </p>
            ) : (
              <div className="divide-y divide-divider border border-divider rounded-xl overflow-hidden">
                {savedReports.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <span className="font-mono text-primary">{r.id}</span>
                        <span>•</span>
                        <span className="line-clamp-1">{r.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Scope: <strong>{r.department}</strong> • {r.dateRangeLabel} • By {r.generatedBy} on {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSnapshot(r);
                        setViewSnapshotModalOpen(true);
                      }}
                      className="rounded-xl text-xs h-8 font-bold text-primary shrink-0 w-full sm:w-auto"
                    >
                      View Report &rarr;
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: VIEW SINGLE SAVED SNAPSHOT ───────────────────────────── */}
      <Dialog open={viewSnapshotModalOpen} onOpenChange={setViewSnapshotModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-3xl rounded-2xl p-4 sm:p-6 max-h-[90vh] flex flex-col">
          {selectedSnapshot && (
            <>
              <DialogHeader className="border-b border-divider pb-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {selectedSnapshot.id} • IMMUTABLE SNAPSHOT
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Generated {new Date(selectedSnapshot.createdAt).toLocaleString()}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-foreground mt-2">
                  {selectedSnapshot.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Scope: <strong>{selectedSnapshot.department}</strong> | Period: {selectedSnapshot.dateRangeLabel} | Author: {selectedSnapshot.generatedBy} ({selectedSnapshot.generatedByRole})
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5 text-xs">
                {/* Executive Summary */}
                <div className="p-4 rounded-xl bg-muted/40 border border-divider space-y-2">
                  <h4 className="font-bold text-foreground uppercase tracking-wide text-[11px]">
                    Executive Summary
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedSnapshot.executiveSummary}
                  </p>
                </div>

                {/* Key KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-3 rounded-lg border border-divider bg-background">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Incidents</span>
                    <p className="text-xl font-extrabold text-foreground">{selectedSnapshot.kpis.totalIncidents}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-divider bg-background">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Critical Severity</span>
                    <p className="text-xl font-extrabold text-red-600">{selectedSnapshot.kpis.criticalIncidents}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-divider bg-background">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Violence Cases</span>
                    <p className="text-xl font-extrabold text-rose-600">{selectedSnapshot.kpis.violenceReports}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-divider bg-background">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Resolution Rate</span>
                    <p className="text-xl font-extrabold text-emerald-600">{selectedSnapshot.disciplinaryMetrics.resolutionRate}%</p>
                  </div>
                </div>

                {/* Observations */}
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground uppercase tracking-wide text-[11px]">
                    Key Observations
                  </h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
                    {selectedSnapshot.keyObservations.map((obs, idx) => (
                      <li key={idx}><span className="text-foreground">{obs}</span></li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground uppercase tracking-wide text-[11px]">
                    Recommended Institutional Actions
                  </h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
                    {selectedSnapshot.recommendedActions.map((rec, idx) => (
                      <li key={idx}><span className="text-foreground font-medium">{rec}</span></li>
                    ))}
                  </ul>
                </div>
              </div>

              <DialogFooter className="border-t border-divider pt-3 shrink-0 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewSnapshotModalOpen(false)}
                  className="rounded-xl text-xs h-9"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground gap-1.5"
                >
                  <Printer className="size-3.5" />
                  Print Snapshot
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

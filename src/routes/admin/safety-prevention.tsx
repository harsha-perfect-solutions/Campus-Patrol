import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  Filter,
  Flame,
  HelpCircle,
  History,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
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
  getAdminPreventionDashboardApi,
  acknowledgeSafetyAlertApi,
  escalateSafetyAlertApi,
  createPreventiveActionApi,
  assignPreventiveActionApi,
  startPreventiveActionApi,
  completePreventiveActionApi,
  toggleSafetyAlertRuleApi,
} from "@/lib/api/safety-prevention.server";
import type {
  DBSafetyAlert,
  DBPreventiveAction,
  DBSafetyAlertRule,
  SafetyPreventionKPIs,
  PreventiveActionType,
  PreventiveActionPriority,
} from "@/lib/db/safety-prevention.server";
import type { SafetyHotspot } from "@/lib/db/safety-reporting.server";

export const Route = createFileRoute("/admin/safety-prevention")({
  head: () => ({
    meta: [
      { title: "Safety Prevention & Alert Command — Admin Console" },
      {
        name: "description",
        content: "Institutional safety pattern detection, alert rules management, and preventive action dispatch.",
      },
    ],
  }),
  component: AdminSafetyPreventionPage,
});

function AdminSafetyPreventionPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminSafetyPreventionContent />
    </RoleGuard>
  );
}

function AdminSafetyPreventionContent() {
  const [kpis, setKpis] = useState<SafetyPreventionKPIs | null>(null);
  const [alerts, setAlerts] = useState<DBSafetyAlert[]>([]);
  const [actions, setActions] = useState<DBPreventiveAction[]>([]);
  const [rules, setRules] = useState<DBSafetyAlertRule[]>([]);
  const [hotspots, setHotspots] = useState<SafetyHotspot[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"alerts" | "actions" | "hotspots" | "rules">("alerts");

  // Filters
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Alert for Details Drawer
  const [selectedAlert, setSelectedAlert] = useState<DBSafetyAlert | null>(null);

  // Action Creation Modal
  const [createActionModalOpen, setCreateActionModalOpen] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDesc, setActionDesc] = useState("");
  const [actionType, setActionType] = useState<PreventiveActionType>("PATROL_FREQUENCY_INCREASE");
  const [actionPriority, setActionPriority] = useState<PreventiveActionPriority>("MEDIUM");
  const [actionDept, setActionDept] = useState("CSE");
  const [actionLocation, setActionLocation] = useState("");
  const [actionRoom, setActionRoom] = useState("");
  const [actionAssignedRole, setActionAssignedRole] = useState("security");
  const [actionDueDays, setActionDueDays] = useState(3);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Action Completion Modal
  const [completeActionModalOpen, setCompleteActionModalOpen] = useState(false);
  const [actionToComplete, setActionToComplete] = useState<DBPreventiveAction | null>(null);
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPreventionDashboardApi({
        data: {
          department: deptFilter !== "ALL" ? deptFilter : undefined,
          severity: severityFilter !== "ALL" ? severityFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          search: searchQuery || undefined,
        },
      });

      if (res.success) {
        setKpis(res.kpis);
        setAlerts(res.alerts);
        setActions(res.actions);
        setRules(res.rules);
        setHotspots(res.hotspots);
      } else {
        toast.error(res.error || "Failed to load prevention data.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to connect to safety prevention server.");
    } finally {
      setLoading(false);
    }
  }, [deptFilter, severityFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 45000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Alert Handlers
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await acknowledgeSafetyAlertApi({ data: { alertId } });
      if (res.success) {
        toast.success(`Alert #${alertId} acknowledged.`);
        fetchDashboard();
        if (selectedAlert?.id === alertId) setSelectedAlert(null);
      } else {
        toast.error(res.error || "Failed to acknowledge alert.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to acknowledge alert.");
    }
  };

  const handleEscalateAlert = async (alertId: string) => {
    try {
      const res = await escalateSafetyAlertApi({
        data: { alertId, reason: "Escalated for immediate institutional administrative review" },
      });
      if (res.success) {
        toast.success(`Alert #${alertId} escalated to Critical.`);
        fetchDashboard();
        if (selectedAlert?.id === alertId) setSelectedAlert(null);
      } else {
        toast.error(res.error || "Failed to escalate alert.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to escalate alert.");
    }
  };

  // Convert Alert to Preventive Action
  const handleConvertAlertToAction = (alert: DBSafetyAlert) => {
    setActionTitle(`Preventive Response: ${alert.title}`);
    setActionDesc(`Generated from Alert #${alert.id}. ${alert.description}`);
    setActionDept(alert.department !== "ALL" ? alert.department : "CSE");
    setActionLocation(alert.location);
    setActionRoom(alert.room);
    setActionPriority(alert.severity === "Critical" ? "CRITICAL" : alert.severity === "High" ? "HIGH" : "MEDIUM");
    setCreateActionModalOpen(true);
    setSelectedAlert(null);
  };

  const handleCreateAction = async () => {
    if (!actionTitle.trim() || !actionDesc.trim() || !actionLocation.trim()) {
      toast.error("Please fill in title, description, and location.");
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await createPreventiveActionApi({
        data: {
          title: actionTitle,
          description: actionDesc,
          actionType,
          priority: actionPriority,
          department: actionDept,
          location: actionLocation,
          room: actionRoom || undefined,
          assignedRole: actionAssignedRole,
          dueDays: actionDueDays,
        },
      });

      if (res.success && res.action) {
        toast.success(`Preventive Action #${res.action.id} dispatched.`);
        setCreateActionModalOpen(false);
        fetchDashboard();
      } else {
        toast.error(res.error || "Failed to create preventive action.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create action.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleStartAction = async (actionId: string) => {
    try {
      const res = await startPreventiveActionApi({ data: { actionId } });
      if (res.success) {
        toast.success(`Action #${actionId} started.`);
        fetchDashboard();
      } else {
        toast.error(res.error || "Failed to start action.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start action.");
    }
  };

  const handleCompleteAction = async () => {
    if (!actionToComplete || !completionRemarks.trim() || completionRemarks.trim().length < 5) {
      toast.error("Mandatory remarks (minimum 5 characters) required.");
      return;
    }
    setSubmittingCompletion(true);
    try {
      const res = await completePreventiveActionApi({
        data: {
          actionId: actionToComplete.id,
          completionRemarks,
        },
      });

      if (res.success) {
        toast.success(`Action #${actionToComplete.id} marked completed.`);
        setCompleteActionModalOpen(false);
        setActionToComplete(null);
        setCompletionRemarks("");
        fetchDashboard();
      } else {
        toast.error(res.error || "Failed to complete action.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to complete action.");
    } finally {
      setSubmittingCompletion(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await toggleSafetyAlertRuleApi({ data: { ruleId, enabled: !currentEnabled } });
      if (res.success) {
        toast.success(`Rule #${ruleId} ${!currentEnabled ? "enabled" : "disabled"}.`);
        fetchDashboard();
      } else {
        toast.error(res.error || "Failed to toggle rule.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle rule.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safety Prevention & Alert Command"
        description="Rule-based pattern detection, active safety alerts, preventive task dispatch, and institutional security monitoring."
        breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Safety Prevention" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboard}
              disabled={loading}
              className="rounded-xl text-xs h-9 gap-1.5 shadow-2xs font-semibold"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Scan Patterns
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setActionTitle("");
                setActionDesc("");
                setActionLocation("");
                setActionRoom("");
                setCreateActionModalOpen(true);
              }}
              className="rounded-xl text-xs font-bold h-9 gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="size-3.5" />
              Dispatch Preventive Action
            </Button>
          </div>
        }
      />
      {/* ─── 1. KPI CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {[
          {
            label: "Active Alerts",
            value: kpis?.totalActiveAlerts || 0,
            sub: "Requires acknowledgement",
            icon: Bell,
            color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
          },
          {
            label: "Critical Alerts",
            value: kpis?.criticalAlerts || 0,
            sub: "Immediate review",
            icon: AlertOctagon,
            color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 ring-1 ring-red-400/40",
          },
          {
            label: "High Priority",
            value: kpis?.highPriorityAlerts || 0,
            sub: "Elevated cluster watch",
            icon: AlertTriangle,
            color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
          },
          {
            label: "Open Actions",
            value: kpis?.openPreventiveActions || 0,
            sub: "In progress / assigned",
            icon: Shield,
            color: "bg-primary/10 text-primary",
          },
          {
            label: "Overdue Tasks",
            value: kpis?.overdueActions || 0,
            sub: "Exceeded due date",
            icon: Clock,
            color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
          },
          {
            label: "Completed Actions",
            value: kpis?.completedActions || 0,
            sub: "Historical remediations",
            icon: CheckCircle2,
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
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
              <p className="mt-1 text-xl sm:text-2xl font-black text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{kpi.sub}</p>
            </div>
            <span className={`grid size-8 sm:size-9 place-items-center rounded-xl shrink-0 ${kpi.color}`}>
              <kpi.icon className="size-4 sm:size-4.5" />
            </span>
          </div>
        ))}
      </div>

      {/* ─── 2. TAB CONTROLS & FILTER TOOLBAR ────────────────────────────────── */}
      <div className="card-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider pb-3">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth w-full sm:w-auto shrink-0">
            {[
              { id: "alerts", label: `Active Alerts (${alerts.length})` },
              { id: "actions", label: `Preventive Actions (${actions.length})` },
              { id: "hotspots", label: `Watch Hotspots (${hotspots.length})` },
              { id: "rules", label: `Alert Rules (${rules.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-36">
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="text-xs h-8 rounded-xl">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Departments</SelectItem>
                  <SelectItem value="CSE" className="text-xs">CSE</SelectItem>
                  <SelectItem value="ECE" className="text-xs">ECE</SelectItem>
                  <SelectItem value="EEE" className="text-xs">EEE</SelectItem>
                  <SelectItem value="MECH" className="text-xs">MECH</SelectItem>
                  <SelectItem value="CIVIL" className="text-xs">CIVIL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 sm:w-32">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="text-xs h-8 rounded-xl">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Severities</SelectItem>
                  <SelectItem value="Critical" className="text-xs">Critical</SelectItem>
                  <SelectItem value="High" className="text-xs">High</SelectItem>
                  <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="Low" className="text-xs">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, location, room, or evidence..."
              className="text-xs pl-8 h-8 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. TAB CONTENT: ACTIVE ALERTS ─────────────────────────────────── */}
      {activeTab === "alerts" && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="card-surface p-12 text-center rounded-2xl border border-border">
              <CheckCircle2 className="size-10 text-emerald-600 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-foreground">Zero Active Safety Alerts</p>
              <p className="text-xs text-muted-foreground mt-1">
                No recurrence clusters or latency thresholds breached at this time.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "card-surface p-4 rounded-2xl border transition-all space-y-3",
                    a.severity === "Critical" && "border-red-500/40 bg-red-500/5",
                    a.severity === "High" && "border-amber-500/40 bg-amber-500/5",
                    a.severity === "Medium" && "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">{a.id}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase",
                        a.severity === "Critical" && "bg-red-500 text-white",
                        a.severity === "High" && "bg-amber-500 text-amber-950",
                        a.severity === "Medium" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                        a.severity === "Low" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {a.severity}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-foreground line-clamp-1">{a.title}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{a.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-background/60 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-semibold text-foreground truncate">{a.location}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Department:</span>
                      <p className="font-semibold text-foreground">{a.department}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-divider text-xs gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAlert(a)}
                      className="rounded-xl text-[11px] h-7 px-2.5 font-bold flex-1"
                    >
                      <Eye className="size-3 mr-1" />
                      Evidence
                    </Button>

                    {a.status === "ACTIVE" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledgeAlert(a.id)}
                          className="rounded-xl text-[11px] h-7 px-2 font-semibold text-primary"
                        >
                          Ack
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleConvertAlertToAction(a)}
                          className="rounded-xl text-[11px] h-7 px-2 font-bold bg-primary text-primary-foreground"
                        >
                          Dispatch &rarr;
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 4. TAB CONTENT: PREVENTIVE ACTIONS ──────────────────────────────── */}
      {activeTab === "actions" && (
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-divider bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Action ID & Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {actions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      No preventive actions found.
                    </td>
                  </tr>
                ) : (
                  actions.map((act) => (
                    <tr key={act.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="font-mono text-primary">{act.id}</span>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{act.title}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{act.description}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-muted-foreground">
                        {act.action_type.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase",
                            act.priority === "CRITICAL" && "bg-red-500 text-white",
                            act.priority === "HIGH" && "bg-amber-500 text-amber-950",
                            act.priority === "MEDIUM" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                            act.priority === "LOW" && "bg-muted text-muted-foreground",
                          )}
                        >
                          {act.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {act.location} ({act.department})
                      </td>
                      <td className="py-3 px-4 font-semibold text-muted-foreground uppercase">
                        {act.assigned_role || "Unassigned"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase",
                            act.status === "COMPLETED" && "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
                            act.status === "IN_PROGRESS" && "bg-blue-500/10 text-blue-600 border border-blue-500/20",
                            act.status === "ASSIGNED" && "bg-purple-500/10 text-purple-600 border border-purple-500/20",
                            act.status === "OPEN" && "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                          )}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {act.status === "OPEN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartAction(act.id)}
                              className="rounded-xl text-[10px] h-7 px-2 font-bold"
                            >
                              Start
                            </Button>
                          )}
                          {act.status === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setActionToComplete(act);
                                setCompleteActionModalOpen(true);
                              }}
                              className="rounded-xl text-[10px] h-7 px-2 font-bold bg-emerald-600 text-white"
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 5. TAB CONTENT: WATCH HOTSPOTS ─────────────────────────────────── */}
      {activeTab === "hotspots" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hotspots.map((h) => (
            <div key={h.id} className="card-surface p-4 rounded-2xl border border-border shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-muted-foreground">{h.id}</span>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 uppercase">
                  {h.frequencyLevel.replace("_", " ")}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-foreground truncate">{h.locationName}</h3>
                <p className="text-[10px] text-muted-foreground">{h.buildingBlock}</p>
              </div>

              <div className="grid grid-cols-3 gap-1 bg-background/60 p-2 rounded-xl text-center text-[10px]">
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

              <Button
                size="sm"
                onClick={() => {
                  setActionTitle(`Targeted Patrol: ${h.locationName}`);
                  setActionDesc(`Historical Hotspot ${h.id} flagged with ${h.totalIncidents} incidents. Increase active officer presence.`);
                  setActionLocation(h.locationName);
                  setActionRoom(h.room);
                  setActionDept(h.department);
                  setActionType("PATROL_FREQUENCY_INCREASE");
                  setActionPriority("HIGH");
                  setCreateActionModalOpen(true);
                }}
                className="w-full rounded-xl text-xs h-8 font-bold bg-primary text-primary-foreground gap-1.5"
              >
                <Shield className="size-3.5" />
                Dispatch Patrol Task
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ─── 6. TAB CONTENT: ALERT RULES ────────────────────────────────────── */}
      {activeTab === "rules" && (
        <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-divider flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Sliders className="size-4.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Configured Institutional Safety Alert Rules
              </h2>
            </div>
          </div>

          <div className="divide-y divide-divider">
            {rules.map((r) => (
              <div key={r.id} className="p-4 text-xs flex items-center justify-between hover:bg-accent/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <span className="font-mono text-primary">{r.id}</span>
                    <span>•</span>
                    <span>{r.name}</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Threshold: {r.threshold} | Window: {r.time_window_days} days | Scope: {r.department_scope}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant={r.enabled ? "default" : "outline"}
                  onClick={() => handleToggleRule(r.id, r.enabled)}
                  className={cn(
                    "rounded-xl text-xs h-8 font-bold shrink-0",
                    r.enabled ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground",
                  )}
                >
                  {r.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: ALERT EVIDENCE & DETAILS DRAWER ───────────────────────── */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="w-[95vw] sm:w-full max-w-xl rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          {selectedAlert && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedAlert.id}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500 text-white">
                    {selectedAlert.severity} Severity
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-foreground mt-2">
                  {selectedAlert.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Triggered by Rule: <strong>{selectedAlert.rule_name}</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-divider space-y-1.5">
                  <h4 className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                    Explainable Rule-Based Evidence
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedAlert.evidence.explanation || selectedAlert.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg border border-divider bg-background">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Incidents</span>
                    <p className="text-lg font-black text-foreground">{selectedAlert.evidence.incidentCount}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-divider bg-background">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Critical</span>
                    <p className="text-lg font-black text-red-600">{selectedAlert.evidence.criticalCount}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-divider bg-background">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Violence</span>
                    <p className="text-lg font-black text-rose-600">{selectedAlert.evidence.violenceCount}</p>
                  </div>
                </div>

                {selectedAlert.evidence.relatedReportIds && selectedAlert.evidence.relatedReportIds.length > 0 && (
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Related Violation Reports:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAlert.evidence.relatedReportIds.map((rid) => (
                        <span key={rid} className="px-2 py-0.5 rounded bg-muted font-mono text-[10px] text-foreground">
                          {rid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEscalateAlert(selectedAlert.id)}
                  className="rounded-xl text-xs h-9 text-red-600 w-full sm:w-auto"
                >
                  Escalate
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleConvertAlertToAction(selectedAlert)}
                  className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5 w-full sm:w-auto"
                >
                  Convert to Action &rarr;
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: DISPATCH PREVENTIVE ACTION ────────────────────────────── */}
      <Dialog open={createActionModalOpen} onOpenChange={setCreateActionModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-lg rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Dispatch Preventive Safety Action
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign an operational remediation task to Campus Security, Department HOD, or Faculty.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            <div>
              <Label className="text-xs font-bold">Action Title *</Label>
              <Input
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="e.g. Increase Security Patrol Cadence during Period 4"
                className="mt-1 text-xs h-8 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Remediation Description *</Label>
              <Input
                value={actionDesc}
                onChange={(e) => setActionDesc(e.target.value)}
                placeholder="Specify exact operational directives..."
                className="mt-1 text-xs h-8 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Action Type</Label>
                <Select value={actionType} onValueChange={(v) => setActionType(v as any)}>
                  <SelectTrigger className="text-xs h-8 rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PATROL_FREQUENCY_INCREASE">Patrol Cadence Increase</SelectItem>
                    <SelectItem value="SECURITY_STATIONING">Station Officer On-Scene</SelectItem>
                    <SelectItem value="FACULTY_SUPERVISION_REVIEW">Faculty Class Supervision</SelectItem>
                    <SelectItem value="TIMETABLE_ALLOCATION_AUDIT">Timetable Transition Audit</SelectItem>
                    <SelectItem value="SAFETY_INSPECTION">Facility Safety Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Priority</Label>
                <Select value={actionPriority} onValueChange={(v) => setActionPriority(v as any)}>
                  <SelectTrigger className="text-xs h-8 rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold">Department</Label>
                <Input
                  value={actionDept}
                  onChange={(e) => setActionDept(e.target.value)}
                  className="mt-1 text-xs h-8 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Location Zone *</Label>
                <Input
                  value={actionLocation}
                  onChange={(e) => setActionLocation(e.target.value)}
                  placeholder="e.g. Block C Lab Complex"
                  className="mt-1 text-xs h-8 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Assigned Role</Label>
                <Select value={actionAssignedRole} onValueChange={setActionAssignedRole}>
                  <SelectTrigger className="text-xs h-8 rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security">Campus Security Unit</SelectItem>
                    <SelectItem value="hod">Department HOD</SelectItem>
                    <SelectItem value="admin">Chief Administrator</SelectItem>
                    <SelectItem value="faculty">Faculty Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Due Within (Days)</Label>
                <Input
                  type="number"
                  value={actionDueDays}
                  onChange={(e) => setActionDueDays(Number(e.target.value))}
                  min={1}
                  max={30}
                  className="mt-1 text-xs h-8 rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateActionModalOpen(false)}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateAction}
              disabled={submittingAction}
              className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground"
            >
              {submittingAction ? "Dispatching..." : "Dispatch Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: COMPLETE PREVENTIVE ACTION ────────────────────────────── */}
      <Dialog open={completeActionModalOpen} onOpenChange={setCompleteActionModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Complete Preventive Safety Action
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide formal completion remarks detailing the remediation steps executed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div>
              <Label className="text-xs font-bold">Completion Remarks (Mandatory) *</Label>
              <Input
                value={completionRemarks}
                onChange={(e) => setCompletionRemarks(e.target.value)}
                placeholder="e.g. Conducted 4 patrol sweeps. Dispersed unauthorized loitering."
                className="mt-1 text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompleteActionModalOpen(false)}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCompleteAction}
              disabled={submittingCompletion}
              className="rounded-xl text-xs font-bold h-9 bg-emerald-600 text-white"
            >
              {submittingCompletion ? "Submitting..." : "Confirm Completion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

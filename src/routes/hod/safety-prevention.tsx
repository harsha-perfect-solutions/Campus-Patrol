import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getHodPreventionDashboardApi,
  startPreventiveActionApi,
  completePreventiveActionApi,
} from "@/lib/api/safety-prevention.server";
import type {
  DBSafetyAlert,
  DBPreventiveAction,
  SafetyPreventionKPIs,
} from "@/lib/db/safety-prevention.server";
import type { SafetyHotspot } from "@/lib/db/safety-reporting.server";

export const Route = createFileRoute("/hod/safety-prevention")({
  head: () => ({
    meta: [
      { title: "Department Safety Prevention — HOD Console" },
      {
        name: "description",
        content: "Departmental safety pattern monitoring, active alerts, and preventive action assignments.",
      },
    ],
  }),
  component: HodSafetyPreventionPage,
});

function HodSafetyPreventionPage() {
  return (
    <RoleGuard allowedRoles={["hod"]}>
      <HodSafetyPreventionContent />
    </RoleGuard>
  );
}

function HodSafetyPreventionContent() {
  const [department, setDepartment] = useState("");
  const [kpis, setKpis] = useState<SafetyPreventionKPIs | null>(null);
  const [alerts, setAlerts] = useState<DBSafetyAlert[]>([]);
  const [actions, setActions] = useState<DBPreventiveAction[]>([]);
  const [hotspots, setHotspots] = useState<SafetyHotspot[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Alert for Details Drawer
  const [selectedAlert, setSelectedAlert] = useState<DBSafetyAlert | null>(null);

  // Action Completion Modal
  const [completeActionModalOpen, setCompleteActionModalOpen] = useState(false);
  const [actionToComplete, setActionToComplete] = useState<DBPreventiveAction | null>(null);
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHodPreventionDashboardApi({ data: {} });
      if (res.success) {
        setDepartment(res.department);
        setKpis(res.kpis);
        setAlerts(res.alerts);
        setActions(res.actions);
        setHotspots(res.hotspots);
      } else {
        toast.error(res.error || "Failed to load departmental prevention data.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to connect to safety server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 45000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

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
        toast.success(`Action #${actionToComplete.id} completed.`);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${department || "Department"} Safety Prevention & Alerts`}
        description="Departmental safety pattern monitoring, localized cluster alerts, and faculty supervision assignments."
        breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Safety Prevention" }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            disabled={loading}
            className="rounded-xl text-xs h-9 gap-1.5 shadow-2xs font-semibold"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* ─── 1. DEPARTMENT KPIS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {[
          {
            label: "Department Active Alerts",
            value: kpis?.totalActiveAlerts || 0,
            sub: `${department} watch alerts`,
            icon: Bell,
            color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
          },
          {
            label: "Critical Alerts",
            value: kpis?.criticalAlerts || 0,
            sub: "Requires direct intervention",
            icon: AlertOctagon,
            color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
          },
          {
            label: "Open Preventive Actions",
            value: kpis?.openPreventiveActions || 0,
            sub: "In progress / assigned",
            icon: Shield,
            color: "bg-primary/10 text-primary",
          },
          {
            label: "Completed Actions",
            value: kpis?.completedActions || 0,
            sub: "Successfully remediated",
            icon: CheckCircle2,
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-black text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
            <span className={`grid size-9 place-items-center rounded-xl shrink-0 ${kpi.color}`}>
              <kpi.icon className="size-4.5" />
            </span>
          </div>
        ))}
      </div>

      {/* ─── 2. DEPARTMENT ACTIVE ALERTS ────────────────────────────────────── */}
      <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-divider pb-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4.5 text-primary" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              {department} Active Safety Alerts ({alerts.length})
            </h2>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No active safety alerts for {department} department.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "p-4 rounded-xl border space-y-2.5 bg-background",
                  a.severity === "Critical" ? "border-red-500/30 bg-red-500/5" : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">{a.id}</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500 text-white">
                    {a.severity}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-foreground line-clamp-1">{a.title}</h3>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{a.description}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedAlert(a)}
                  className="w-full rounded-xl text-xs h-7 font-bold mt-2"
                >
                  <Eye className="size-3 mr-1" />
                  View Evidence
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 3. DEPARTMENT PREVENTIVE ACTIONS ─────────────────────────────────── */}
      <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-divider flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Shield className="size-4.5 text-primary" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Department Assigned Preventive Actions ({actions.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-divider bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Action ID & Title</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                    No preventive actions currently assigned to {department}.
                  </td>
                </tr>
              ) : (
                actions.map((act) => (
                  <tr key={act.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <span className="font-mono text-primary">{act.id}</span>
                        <span>•</span>
                        <span>{act.title}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{act.description}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{act.location}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-muted uppercase">
                        {act.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase",
                          act.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600",
                        )}
                      >
                        {act.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL 1: ALERT EVIDENCE DRAWER ─────────────────────────────────── */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          {selectedAlert && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedAlert.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Triggered Alert #{selectedAlert.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-divider">
                  <p className="text-muted-foreground">{selectedAlert.evidence.explanation || selectedAlert.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-background border border-divider">
                    <span className="text-[10px] text-muted-foreground uppercase">Incidents</span>
                    <p className="font-bold text-foreground">{selectedAlert.evidence.incidentCount}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-divider">
                    <span className="text-[10px] text-muted-foreground uppercase">Critical</span>
                    <p className="font-bold text-red-600">{selectedAlert.evidence.criticalCount}</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  size="sm"
                  onClick={() => setSelectedAlert(null)}
                  className="rounded-xl text-xs h-8"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: COMPLETE ACTION MODAL ─────────────────────────────────── */}
      <Dialog open={completeActionModalOpen} onOpenChange={setCompleteActionModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Complete Preventive Action
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter formal completion remarks for department records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div>
              <Label className="text-xs font-bold">Completion Remarks *</Label>
              <Input
                value={completionRemarks}
                onChange={(e) => setCompletionRemarks(e.target.value)}
                placeholder="e.g. Conducted faculty check in Room C-204."
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
              {submittingCompletion ? "Saving..." : "Confirm Completion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

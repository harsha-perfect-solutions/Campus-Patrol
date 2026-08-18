import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Flame,
  Shield,
  ShieldAlert,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  Radio,
  Send,
  FileText,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getEmergencyIncidentsApi,
  getEmergencyStatsApi,
  markEmergencyControlledApi,
  resolveEmergencyIncidentApi,
  addEmergencyResponseNoteApi,
  getEmergencyIncidentTimelineApi,
} from "@/lib/api/emergency.server";
import type { DBEmergencyIncident, EmergencyStats } from "@/lib/db/emergency.server";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/emergency")({
  head: () => ({ meta: [{ title: "Emergency Command Center — CMADMS" }] }),
  component: AdminEmergencyPage,
});

function AdminEmergencyPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <EmergencyCommandContent />
    </RoleGuard>
  );
}

/**
 * Single, backend-persisted Time Elapsed calculator.
 * While active (reported): Current Time - Created At
 * When Controlled / Resolved: Permanently frozen at (controlled_at || resolved_at) - Created At
 */
function formatElapsed(createdStr: string, controlledStr?: string | null, resolvedStr?: string | null) {
  try {
    const start = new Date(createdStr).getTime();
    const frozenEndStr = controlledStr || resolvedStr;
    const end = frozenEndStr ? new Date(frozenEndStr).getTime() : Date.now();
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(diffSec / 60);
    const hours = Math.floor(mins / 60);

    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    if (mins > 0) {
      return `${mins} min`;
    }
    return `${diffSec} sec`;
  } catch {
    return "--";
  }
}

function EmergencyCommandContent() {
  const [incidents, setIncidents] = useState<DBEmergencyIncident[]>([]);
  const [stats, setStats] = useState<EmergencyStats>({
    activeEmergencies: 0,
    controlledIncidents: 0,
    criticalIncidents: 0,
    violenceIncidents: 0,
    resolvedIncidents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected incident for Detail Dialog
  const [selectedIncident, setSelectedIncident] = useState<DBEmergencyIncident | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [timeline, setTimeline] = useState<
    Array<{ id: string; actor: string; actorRole: string; action: string; timestamp: string; description: string }>
  >([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Action Modals
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [controlNotes, setControlNotes] = useState("");
  const [targetForControl, setTargetForControl] = useState<DBEmergencyIncident | null>(null);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveRemarks, setResolveRemarks] = useState("");
  const [targetForResolve, setTargetForResolve] = useState<DBEmergencyIncident | null>(null);

  const [noteInput, setNoteInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Live timer tick every 2 seconds for active timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [incRes, statsRes] = await Promise.all([
        getEmergencyIncidentsApi({
          data: {
            status: statusFilter,
            department: deptFilter,
            search: searchQuery,
          },
        }),
        getEmergencyStatsApi(),
      ]);

      if (incRes.success) setIncidents(incRes.incidents);
      if (statsRes.success) setStats(statsRes.stats);
    } catch (err: any) {
      console.error("Failed to load emergency data:", err);
      toast.error(err.message || "Failed to fetch emergency console data.");
    } finally {
      setLoading(false);
    }
  }

  // Polling every 12 seconds for real-time reactivity
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, [statusFilter, deptFilter, searchQuery]);

  async function openIncidentDialog(inc: DBEmergencyIncident) {
    setSelectedIncident(inc);
    setDialogOpen(true);
    try {
      setLoadingTimeline(true);
      const res = await getEmergencyIncidentTimelineApi({ data: { incidentId: inc.id } });
      if (res.success) setTimeline(res.timeline);
    } catch (err) {
      console.error("Error loading timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }

  function handlePromptControl(inc: DBEmergencyIncident) {
    setTargetForControl(inc);
    setControlNotes("");
    setControlModalOpen(true);
  }

  async function handleConfirmControlled() {
    const target = targetForControl || selectedIncident;
    if (!target) return;
    try {
      setSubmittingAction(true);
      const res = await markEmergencyControlledApi({
        data: {
          incidentId: target.id,
          controlNotes: controlNotes.trim() || undefined,
        },
      });
      if (res.success) {
        toast.success(`Situation marked CONTROLLED for Emergency #${target.id}. Time elapsed frozen.`);
        setControlModalOpen(false);
        setControlNotes("");
        setTargetForControl(null);
        await loadData();
        if (selectedIncident?.id === target.id) setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to mark situation controlled.");
    } finally {
      setSubmittingAction(false);
    }
  }

  function handlePromptResolve(inc: DBEmergencyIncident) {
    setTargetForResolve(inc);
    setResolveRemarks("");
    setResolveModalOpen(true);
  }

  async function handleConfirmResolve() {
    const target = targetForResolve || selectedIncident;
    if (!target) return;
    if (!resolveRemarks.trim() || resolveRemarks.trim().length < 5) {
      toast.error("Please enter resolution remarks (minimum 5 characters).");
      return;
    }
    try {
      setSubmittingAction(true);
      const res = await resolveEmergencyIncidentApi({
        data: {
          incidentId: target.id,
          resolutionRemarks: resolveRemarks.trim(),
        },
      });
      if (res.success) {
        toast.success(`Emergency #${target.id} resolved and finalized.`);
        setResolveModalOpen(false);
        setResolveRemarks("");
        setTargetForResolve(null);
        await loadData();
        if (selectedIncident?.id === target.id) setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve emergency incident.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleAddNote() {
    if (!selectedIncident || !noteInput.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await addEmergencyResponseNoteApi({
        data: {
          incidentId: selectedIncident.id,
          note: noteInput.trim(),
        },
      });
      if (res.success) {
        toast.success("Operational note logged.");
        setNoteInput("");
        await loadData();
        setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to log response note.");
    } finally {
      setSubmittingAction(false);
    }
  }

  const getStatusBadge = (st: string) => {
    switch (st.toLowerCase()) {
      case "reported":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse";
      case "controlled":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold";
      case "resolved":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
      case "dismissed":
        return "bg-zinc-600/10 text-zinc-500 border-zinc-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="🚨 Campus Emergency Incident Response & Oversight"
        description="Institutional oversight console for active student safety emergencies, physical altercations, and security response tracking."
        breadcrumb={[
          { label: "Admin", to: "/admin/dashboard" },
          { label: "Emergency Oversight" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl font-semibold text-xs"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
            >
              <Link to="/admin/violations">View Disciplinary Console &rarr;</Link>
            </Button>
          </div>
        }
      />

      {/* Simplified KPI Cards (5 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Active Emergencies",
            val: stats.activeEmergencies,
            icon: Flame,
            color: "bg-red-500/10 text-red-600 border-red-500/20",
          },
          {
            label: "Controlled Incidents",
            val: stats.controlledIncidents,
            icon: CheckCircle2,
            color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          },
          {
            label: "Critical Incidents",
            val: stats.criticalIncidents,
            icon: AlertTriangle,
            color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
          },
          {
            label: "Violence Cases",
            val: stats.violenceIncidents,
            icon: ShieldAlert,
            color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
          },
          {
            label: "Resolved Incidents",
            val: stats.resolvedIncidents,
            icon: Shield,
            color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
          },
        ].map((k) => (
          <div key={k.label} className={`card-surface p-4 rounded-2xl border ${k.color} shadow-2xs`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {k.label}
              </span>
              <k.icon className="size-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">{k.val}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="card-surface p-4 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "active", label: "Active (Reported)" },
            { id: "controlled", label: "Controlled" },
            { id: "resolved", label: "Resolved" },
            { id: "ALL", label: "All Incidents" },
          ].map((st) => (
            <Button
              key={st.id}
              size="sm"
              variant={statusFilter === st.id ? "default" : "outline"}
              onClick={() => setStatusFilter(st.id)}
              className="rounded-xl text-xs h-8 font-semibold"
            >
              {st.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, room, location..."
              className="pl-9 h-8 text-xs rounded-xl"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="h-8 text-xs rounded-xl border border-input bg-background px-3 font-semibold text-foreground focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
            <option value="IT">IT</option>
          </select>
        </div>
      </div>

      {/* Emergency Incidents List */}
      <div className="card-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-red-600 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              CAMPUS EMERGENCY INCIDENT RECORDS ({incidents.length})
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            Live updates active
          </span>
        </div>

        {loading && incidents.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
            Loading Campus Emergency Records...
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">No Active Emergency Incidents</p>
            <p className="text-xs text-muted-foreground mt-1">
              No emergency incidents matching the selected criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {incidents.map((inc) => {
              const isControlledOrResolved = inc.status === "controlled" || inc.status === "resolved";
              return (
                <div
                  key={inc.id}
                  className="p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                        #{inc.id}
                      </span>
                      <span
                        className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                          inc.status,
                        )}`}
                      >
                        {inc.status.replace("_", " ")}
                      </span>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        🚨 {inc.incident_category}
                      </span>
                      <span className="text-xs text-muted-foreground">• {inc.department}</span>
                    </div>

                    <div className="text-sm font-black text-foreground flex items-center gap-2">
                      <span>
                        {inc.student_name} ({inc.student_code})
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        • {inc.year_section}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        📍 <strong>Location:</strong> {inc.location} ({inc.room})
                      </span>
                      <span>
                        📚 <strong>Class:</strong> {inc.subject}
                      </span>
                      <span>
                        👤 <strong>Reported By:</strong> {inc.faculty_reporter}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3">
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-muted-foreground block">
                        {isControlledOrResolved ? "Time Elapsed (Frozen)" : "Time Elapsed"}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-foreground flex items-center gap-1">
                        <Clock className="size-3.5 text-primary shrink-0" />
                        {formatElapsed(inc.created_at, inc.controlled_at, inc.resolved_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {inc.status === "reported" && (
                        <Button
                          size="sm"
                          onClick={() => handlePromptControl(inc)}
                          disabled={submittingAction}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 shadow-2xs"
                        >
                          <Shield className="size-3.5 mr-1" /> Mark Controlled
                        </Button>
                      )}

                      {inc.status === "controlled" && (
                        <Button
                          size="sm"
                          onClick={() => handlePromptResolve(inc)}
                          disabled={submittingAction}
                          className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl h-8 shadow-2xs"
                        >
                          <CheckCircle2 className="size-3.5 mr-1" /> Resolve
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openIncidentDialog(inc)}
                        className="text-xs font-bold rounded-xl h-8"
                      >
                        View Details &rarr;
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incident Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIncident && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted">
                    #{selectedIncident.id}
                  </span>
                  <span
                    className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full border ${getStatusBadge(
                      selectedIncident.status,
                    )}`}
                  >
                    {selectedIncident.status.replace("_", " ")}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-red-600 dark:text-red-400 mt-2">
                  🚨 {selectedIncident.incident_category}
                </DialogTitle>
                <DialogDescription>
                  Reported at {selectedIncident.location} ({selectedIncident.room}) by{" "}
                  {selectedIncident.faculty_reporter}
                </DialogDescription>
              </DialogHeader>

              {/* Status Action Banner */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Persisted Time Elapsed
                  </span>
                  <span className="font-mono text-base font-extrabold text-foreground">
                    ⏱️ {formatElapsed(selectedIncident.created_at, selectedIncident.controlled_at, selectedIncident.resolved_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedIncident.status === "reported" && (
                    <Button
                      size="sm"
                      onClick={() => handlePromptControl(selectedIncident)}
                      disabled={submittingAction}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                    >
                      <Shield className="size-3.5 mr-1" /> Mark Controlled
                    </Button>
                  )}

                  {selectedIncident.status === "controlled" && (
                    <Button
                      size="sm"
                      onClick={() => handlePromptResolve(selectedIncident)}
                      disabled={submittingAction}
                      className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl"
                    >
                      <CheckCircle2 className="size-3.5 mr-1" /> Resolve Incident
                    </Button>
                  )}
                </div>
              </div>

              {/* Student & Location Details */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Student Details
                  </span>
                  <p className="text-sm font-black text-foreground">{selectedIncident.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Roll No: {selectedIncident.student_code} • {selectedIncident.department} (
                    {selectedIncident.year_section})
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Location & Class Context
                  </span>
                  <p className="text-sm font-black text-foreground">{selectedIncident.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Room: {selectedIncident.room} • Location: {selectedIncident.location}
                  </p>
                </div>
              </div>

              {/* Response Notes */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Operational Response Notes ({selectedIncident.response_notes?.length || 0})
                </h4>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedIncident.response_notes?.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No response notes logged.</p>
                  ) : (
                    selectedIncident.response_notes?.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {n.addedBy} ({n.addedByRole})
                          </span>
                          <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-foreground">{n.note}</p>
                      </div>
                    ))
                  )}
                </div>

                {selectedIncident.status !== "resolved" && (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Add operational response note..."
                      className="text-xs rounded-xl h-9"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!noteInput.trim() || submittingAction}
                      className="rounded-xl text-xs h-9 font-bold"
                    >
                      <Send className="size-3.5 mr-1" /> Log Note
                    </Button>
                  </div>
                )}
              </div>

              {/* Chronological Incident Timeline */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Audit History Timeline
                </h4>
                {loadingTimeline ? (
                  <p className="text-xs text-muted-foreground">Loading audit log...</p>
                ) : (
                  <div className="space-y-2">
                    {timeline.map((evt, i) => (
                      <div key={evt.id || i} className="flex items-start gap-3 text-xs">
                        <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">{evt.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {evt.actor} ({evt.actorRole}) •{" "}
                            {new Date(evt.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark Controlled Modal */}
      <Dialog open={controlModalOpen} onOpenChange={setControlModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Situation Controlled</DialogTitle>
            <DialogDescription>
              Record that physical conflict has ceased and the area is secured. Time Elapsed will freeze permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Control Notes (Optional)</Label>
            <Textarea
              value={controlNotes}
              onChange={(e) => setControlNotes(e.target.value)}
              placeholder="e.g. Conflict resolved, security on scene, students separated."
              className="text-xs rounded-xl min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setControlModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmControlled}
              disabled={submittingAction}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
            >
              Confirm Controlled
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Incident Modal */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalize Emergency Incident</DialogTitle>
            <DialogDescription>
              Record mandatory resolution remarks before closing active emergency status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Resolution Remarks *</Label>
            <Textarea
              value={resolveRemarks}
              onChange={(e) => setResolveRemarks(e.target.value)}
              placeholder="Mandatory summary of security actions, disciplinary referrals, and final safety status..."
              className="text-xs rounded-xl min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmResolve}
              disabled={!resolveRemarks.trim() || submittingAction}
              className="bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs"
            >
              Resolve & Close Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

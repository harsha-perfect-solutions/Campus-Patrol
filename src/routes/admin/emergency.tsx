import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Flame,
  Shield,
  ShieldAlert,
  Clock,
  UserCheck,
  Building2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Activity,
  PhoneCall,
  User,
  Radio,
  FileText,
  Send,
  XCircle,
  AlertOctagon,
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
  acknowledgeEmergencyIncidentApi,
  assignEmergencyResponderApi,
  startEmergencyResponseApi,
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

function formatElapsed(createdStr: string) {
  try {
    const start = new Date(createdStr).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - start) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}h ${mins % 60}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  } catch {
    return "--";
  }
}

function EmergencyCommandContent() {
  const [incidents, setIncidents] = useState<DBEmergencyIncident[]>([]);
  const [stats, setStats] = useState<EmergencyStats>({
    activeEmergencies: 0,
    awaitingAcknowledgement: 0,
    responding: 0,
    controlled: 0,
    criticalToday: 0,
    violenceToday: 0,
    avgResponseTimeMinutes: 2.5,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected incident for Drawer
  const [selectedIncident, setSelectedIncident] = useState<DBEmergencyIncident | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeline, setTimeline] = useState<Array<{ id: string; actor: string; actorRole: string; action: string; timestamp: string; description: string }>>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [responderName, setResponderName] = useState("Head of Security - Main Gate");
  const [responderRole, setResponderRole] = useState("security");
  const [responderId, setResponderId] = useState("sec-lead-01");

  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [controlNotes, setControlNotes] = useState("");

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveRemarks, setResolveRemarks] = useState("");

  const [noteInput, setNoteInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Live timer tick every 2 seconds
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

  async function openIncidentDrawer(inc: DBEmergencyIncident) {
    setSelectedIncident(inc);
    setDrawerOpen(true);
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

  async function handleAcknowledge(incidentId: string) {
    try {
      setSubmittingAction(true);
      const res = await acknowledgeEmergencyIncidentApi({ data: { incidentId } });
      if (res.success) {
        toast.success(`Emergency #${incidentId} acknowledged.`);
        await loadData();
        if (selectedIncident?.id === incidentId) setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to acknowledge incident.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleAssignResponder() {
    if (!selectedIncident) return;
    try {
      setSubmittingAction(true);
      const res = await assignEmergencyResponderApi({
        data: {
          incidentId: selectedIncident.id,
          responderId,
          responderName,
          responderRole,
        },
      });
      if (res.success) {
        toast.success(`Responder assigned to #${selectedIncident.id}.`);
        setAssignModalOpen(false);
        await loadData();
        setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to assign responder.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleStartResponse(incidentId: string) {
    try {
      setSubmittingAction(true);
      const res = await startEmergencyResponseApi({ data: { incidentId } });
      if (res.success) {
        toast.success(`Response in progress for #${incidentId}.`);
        await loadData();
        if (selectedIncident?.id === incidentId) setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start response.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleMarkControlled() {
    if (!selectedIncident) return;
    try {
      setSubmittingAction(true);
      const res = await markEmergencyControlledApi({
        data: {
          incidentId: selectedIncident.id,
          controlNotes,
        },
      });
      if (res.success) {
        toast.success(`Situation brought under control for #${selectedIncident.id}.`);
        setControlModalOpen(false);
        setControlNotes("");
        await loadData();
        setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to mark controlled.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleResolve() {
    if (!selectedIncident) return;
    if (!resolveRemarks.trim() || resolveRemarks.trim().length < 5) {
      toast.error("Please provide resolution remarks (min 5 characters).");
      return;
    }
    try {
      setSubmittingAction(true);
      const res = await resolveEmergencyIncidentApi({
        data: {
          incidentId: selectedIncident.id,
          resolutionRemarks: resolveRemarks.trim(),
        },
      });
      if (res.success) {
        toast.success(`Emergency incident #${selectedIncident.id} resolved.`);
        setResolveModalOpen(false);
        setResolveRemarks("");
        await loadData();
        setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve incident.");
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
        toast.success("Response note logged.");
        setNoteInput("");
        await loadData();
        setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to log note.");
    } finally {
      setSubmittingAction(false);
    }
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "reported":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse";
      case "acknowledged":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "responder_assigned":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "responding":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "controlled":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "resolved":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="🚨 Campus Emergency Incident Response & Coordination"
        description="Institutional command center for active student safety emergencies, physical altercations, and immediate responder dispatch."
        breadcrumb={[
          { label: "Admin", to: "/admin/dashboard" },
          { label: "Emergency Command Center" },
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {[
          {
            label: "Active Emergencies",
            val: stats.activeEmergencies,
            icon: Flame,
            color: "bg-red-500/10 text-red-600 border-red-500/20",
          },
          {
            label: "Awaiting Ack",
            val: stats.awaitingAcknowledgement,
            icon: AlertOctagon,
            color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
          },
          {
            label: "Responding",
            val: stats.responding,
            icon: Radio,
            color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
          },
          {
            label: "Controlled",
            val: stats.controlled,
            icon: ShieldCheckIcon,
            color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          },
          {
            label: "Critical Today",
            val: stats.criticalToday,
            icon: AlertTriangle,
            color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
          },
          {
            label: "Violence Cases",
            val: stats.violenceToday,
            icon: ShieldAlert,
            color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
          },
          {
            label: "Avg Response",
            val: `${stats.avgResponseTimeMinutes}m`,
            icon: Clock,
            color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
          },
        ].map((k) => (
          <div
            key={k.label}
            className={`card-surface p-4 rounded-2xl border ${k.color} shadow-2xs`}
          >
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
          {["active", "reported", "responding", "controlled", "resolved", "ALL"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              onClick={() => setStatusFilter(st)}
              className="rounded-xl text-xs capitalize h-8 font-semibold"
            >
              {st === "ALL" ? "All History" : st.replace("_", " ")}
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

      {/* Active Incidents Queue */}
      <div className="card-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-red-600 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              LIVE EMERGENCY RESPONSE QUEUE ({incidents.length})
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            Auto-refreshing every 12 seconds
          </span>
        </div>

        {loading && incidents.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
            Connecting to Campus Emergency Dispatch...
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">All Clear</p>
            <p className="text-xs text-muted-foreground mt-1">
              No active emergency incidents matching current filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {incidents.map((inc) => (
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
                      👤 <strong>Reporter:</strong> {inc.faculty_reporter}
                    </span>
                  </div>

                  {inc.responder_name && (
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 pt-1">
                      <UserCheck className="size-3.5" /> Assigned Responder: {inc.responder_name} (
                      {inc.responder_role})
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Time Elapsed
                    </span>
                    <span className="font-mono text-sm font-extrabold text-foreground">
                      ⏱️ {formatElapsed(inc.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {inc.status === "reported" && (
                      <Button
                        size="sm"
                        onClick={() => handleAcknowledge(inc.id)}
                        disabled={submittingAction}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl h-8"
                      >
                        Acknowledge
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openIncidentDrawer(inc)}
                      className="text-xs font-bold rounded-xl h-8"
                    >
                      Emergency Console &rarr;
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incident Detail & Action Drawer */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedIncident && (
            <div className="space-y-6">
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

              {/* Action Buttons Toolbar */}
              <div className="p-4 rounded-2xl bg-muted/50 border border-border flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">
                  Response Controls:
                </span>

                {selectedIncident.status === "reported" && (
                  <Button
                    size="sm"
                    onClick={() => handleAcknowledge(selectedIncident.id)}
                    disabled={submittingAction}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
                  >
                    Acknowledge Incident
                  </Button>
                )}

                {(selectedIncident.status === "reported" ||
                  selectedIncident.status === "acknowledged" ||
                  selectedIncident.status === "responder_assigned") && (
                  <Button
                    size="sm"
                    onClick={() => setAssignModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                  >
                    <UserCheck className="size-3.5 mr-1" />
                    {selectedIncident.responder_name ? "Reassign Responder" : "Assign Responder"}
                  </Button>
                )}

                {(selectedIncident.status === "responder_assigned" ||
                  selectedIncident.status === "acknowledged" ||
                  selectedIncident.status === "reported") && (
                  <Button
                    size="sm"
                    onClick={() => handleStartResponse(selectedIncident.id)}
                    disabled={submittingAction}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Radio className="size-3.5 mr-1" /> Start Response
                  </Button>
                )}

                {(selectedIncident.status === "responding" ||
                  selectedIncident.status === "responder_assigned") && (
                  <Button
                    size="sm"
                    onClick={() => setControlModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Shield className="size-3.5 mr-1" /> Mark Controlled
                  </Button>
                )}

                {selectedIncident.status === "controlled" && (
                  <Button
                    size="sm"
                    onClick={() => setResolveModalOpen(true)}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl"
                  >
                    <CheckCircle2 className="size-3.5 mr-1" /> Resolve & Finalize
                  </Button>
                )}
              </div>

              {/* Student & Academic Context Snapshot */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Student Details
                  </h4>
                  <p className="text-base font-black text-foreground">
                    {selectedIncident.student_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Roll No: <strong>{selectedIncident.student_code}</strong> •{" "}
                    {selectedIncident.department} ({selectedIncident.year_section})
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Timetable Snapshot (Immutable)
                  </h4>
                  <p className="text-base font-black text-foreground">
                    {selectedIncident.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Room: <strong>{selectedIncident.room}</strong> • Location:{" "}
                    <strong>{selectedIncident.location}</strong>
                  </p>
                </div>
              </div>

              {/* Response Log & Notes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Emergency Response Notes ({selectedIncident.response_notes?.length || 0})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedIncident.response_notes?.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No notes logged yet.</p>
                  ) : (
                    selectedIncident.response_notes?.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
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
                      placeholder="Add timestamped operational response note..."
                      className="text-xs rounded-xl h-9"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!noteInput.trim() || submittingAction}
                      className="rounded-xl text-xs h-9 font-bold"
                    >
                      <Send className="size-3.5 mr-1" /> Log
                    </Button>
                  </div>
                )}
              </div>

              {/* Chronological Audit Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Chronological Incident Timeline
                </h4>
                {loadingTimeline ? (
                  <p className="text-xs text-muted-foreground">Loading timeline...</p>
                ) : (
                  <div className="space-y-2">
                    {timeline.map((evt, i) => (
                      <div key={evt.id || i} className="flex items-start gap-3 text-xs">
                        <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">{evt.description}</p>
                          <p className="text-[11px] text-muted-foreground">
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

      {/* Responder Assignment Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Emergency Responder</DialogTitle>
            <DialogDescription>
              Dispatch an authorized security team or faculty member to the location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Responder Name / Team</Label>
              <Input
                value={responderName}
                onChange={(e) => setResponderName(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Responder Role</Label>
              <select
                value={responderRole}
                onChange={(e) => setResponderRole(e.target.value)}
                aria-label="Responder Role"
                className="w-full h-9 text-xs rounded-xl border border-input bg-background px-3 font-semibold text-foreground focus:outline-none"
              >
                <option value="security">Security Officer / Gate Lead</option>
                <option value="faculty">Authorized Faculty / Proctor</option>
                <option value="hod">Department HOD</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignResponder}
              disabled={submittingAction}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
            >
              Confirm Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Controlled Modal */}
      <Dialog open={controlModalOpen} onOpenChange={setControlModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Situation Controlled</DialogTitle>
            <DialogDescription>
              Record that physical conflict has ceased and the area is secured.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Control Notes (Optional)</Label>
            <Textarea
              value={controlNotes}
              onChange={(e) => setControlNotes(e.target.value)}
              placeholder="e.g. Students separated, medical assistance provided, proctor present."
              className="text-xs rounded-xl min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setControlModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkControlled}
              disabled={submittingAction}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
            >
              Mark Controlled
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
              Record formal resolution remarks before closing active emergency status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Resolution Remarks *</Label>
            <Textarea
              value={resolveRemarks}
              onChange={(e) => setResolveRemarks(e.target.value)}
              placeholder="Mandatory summary of actions taken, disciplinary referrals, and final safety status."
              className="text-xs rounded-xl min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
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

function ShieldCheckIcon(props: any) {
  return <CheckCircle2 {...props} />;
}

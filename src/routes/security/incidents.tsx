import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Flame,
  Shield,
  ShieldAlert,
  Clock,
  UserCheck,
  RefreshCw,
  Search,
  Radio,
  CheckCircle2,
  Send,
  Building2,
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
  acknowledgeEmergencyIncidentApi,
  startEmergencyResponseApi,
  markEmergencyControlledApi,
  addEmergencyResponseNoteApi,
} from "@/lib/api/emergency.server";
import type { DBEmergencyIncident } from "@/lib/db/emergency.server";
import { toast } from "sonner";

export const Route = createFileRoute("/security/incidents")({
  head: () => ({ meta: [{ title: "Security Emergency Response — CMADMS" }] }),
  component: SecurityIncidentsPage,
});

function SecurityIncidentsPage() {
  return (
    <RoleGuard allowedRoles={["security", "admin"]}>
      <SecurityIncidentsContent />
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

function SecurityIncidentsContent() {
  const [incidents, setIncidents] = useState<DBEmergencyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedIncident, setSelectedIncident] = useState<DBEmergencyIncident | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [controlNotes, setControlNotes] = useState("");

  const [noteInput, setNoteInput] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  async function loadData(silent = false) {
    try {
      if (!silent) setLoading(true);
      const res = await getEmergencyIncidentsApi({
        data: {
          status: statusFilter,
          search: searchQuery,
        },
      });
      if (res.success) setIncidents(res.incidents);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (err: any) {
      console.error("Failed to load security emergency data:", err);
      if (!silent) toast.error(err.message || "Failed to load emergencies.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 12000);
    return () => clearInterval(interval);
  }, [statusFilter, searchQuery]);

  async function handleAcknowledge(incidentId: string) {
    try {
      setSubmittingAction(true);
      const res = await acknowledgeEmergencyIncidentApi({ data: { incidentId } });
      if (res.success) {
        toast.success(`Emergency #${incidentId} acknowledged by Security.`);
        await loadData();
        if (selectedIncident?.id === incidentId) setSelectedIncident(res.incident);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to acknowledge incident.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleStartResponse(incidentId: string) {
    try {
      setSubmittingAction(true);
      const res = await startEmergencyResponseApi({ data: { incidentId } });
      if (res.success) {
        toast.success(`Security responding to #${incidentId}.`);
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
        toast.success(`Situation marked controlled by Security.`);
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
        toast.success("Security note logged.");
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="🛡️ Security Campus Emergency Response Console"
        description="Immediate response coordination, on-scene tracking, and physical situation control."
        breadcrumb={[
          { label: "Security", to: "/security/dashboard" },
          { label: "Emergency Response" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              Updated {secondsAgo}s ago
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={loading}
              className="rounded-xl font-semibold text-xs h-9"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-primary text-primary-foreground font-bold rounded-xl text-xs h-9"
            >
              <Link to="/security/check">Student QR Scanner &rarr;</Link>
            </Button>
          </div>
        }
      />

      {/* Queue & Controls */}
      <div className="card-surface p-4 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {["active", "reported", "responding", "controlled", "ALL"].map((st) => (
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

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident, location, student..."
            className="pl-9 h-8 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Incidents List */}
      <div className="card-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-red-600 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              DISPATCHED CAMPUS EMERGENCIES ({incidents.length})
            </span>
          </div>
        </div>

        {loading && incidents.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
            Loading security dispatch queue...
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">No Active Emergencies</p>
            <p className="text-xs text-muted-foreground mt-1">Campus perimeter and halls all clear.</p>
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
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                      🚨 {inc.incident_category}
                    </span>
                    <span className="text-xs text-muted-foreground">• {inc.department}</span>
                  </div>

                  <div className="text-sm font-black text-foreground">
                    {inc.student_name} ({inc.student_code}) • {inc.year_section}
                  </div>

                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4">
                    <span>
                      📍 <strong>Location:</strong> {inc.location} ({inc.room})
                    </span>
                    <span>
                      👤 <strong>Reporter:</strong> {inc.faculty_reporter}
                    </span>
                  </div>

                  {inc.responder_name && (
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <UserCheck className="size-3.5" /> Assigned: {inc.responder_name}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Elapsed
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

                    {(inc.status === "reported" ||
                      inc.status === "acknowledged" ||
                      inc.status === "responder_assigned") && (
                      <Button
                        size="sm"
                        onClick={() => handleStartResponse(inc.id)}
                        disabled={submittingAction}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl h-8"
                      >
                        Start Response
                      </Button>
                    )}

                    {inc.status === "responding" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedIncident(inc);
                          setControlModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8"
                      >
                        Mark Controlled
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedIncident(inc);
                        setDrawerOpen(true);
                      }}
                      className="text-xs font-bold rounded-xl h-8"
                    >
                      Details &rarr;
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Incident Details Modal */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-2xl">
          {selectedIncident && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-black text-red-600">
                  🚨 {selectedIncident.incident_category} (#{selectedIncident.id})
                </DialogTitle>
                <DialogDescription>
                  Location: {selectedIncident.location} ({selectedIncident.room})
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-card border border-border text-xs space-y-2">
                <p>
                  <strong>Student:</strong> {selectedIncident.student_name} (
                  {selectedIncident.student_code}) • {selectedIncident.department}
                </p>
                <p>
                  <strong>Scheduled Class:</strong> {selectedIncident.subject}
                </p>
                <p>
                  <strong>Reporting Faculty:</strong> {selectedIncident.faculty_reporter}
                </p>
                <p>
                  <strong>Current Status:</strong>{" "}
                  <span className="uppercase font-bold text-primary">
                    {selectedIncident.status.replace("_", " ")}
                  </span>
                </p>
              </div>

              {/* Response Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Security Logged Notes ({selectedIncident.response_notes?.length || 0})
                </Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedIncident.response_notes?.map((n) => (
                    <div key={n.id} className="p-2 bg-muted/50 rounded-lg text-xs">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                        <span>
                          {n.addedBy} ({n.addedByRole})
                        </span>
                        <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="mt-0.5 text-foreground">{n.note}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Log security note on scene..."
                    className="text-xs rounded-xl h-8"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!noteInput.trim() || submittingAction}
                    className="rounded-xl text-xs h-8 font-bold"
                  >
                    <Send className="size-3 mr-1" /> Log
                  </Button>
                </div>
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
              Confirm that on-scene altercation has been mitigated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Security Observations (Optional)</Label>
            <Textarea
              value={controlNotes}
              onChange={(e) => setControlNotes(e.target.value)}
              placeholder="e.g. Students separated, crowd dispersed, scene secure."
              className="text-xs rounded-xl"
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
              Confirm Controlled
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

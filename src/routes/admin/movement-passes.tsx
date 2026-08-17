import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck,
  Search,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Ban,
  Filter,
  Eye,
  Calendar,
  Building2,
  FileText,
  Activity,
  ChevronRight,
  ShieldAlert,
  Compass,
  ArrowRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getAdminMovementPassesApi,
  getAdminMovementPassStatsApi,
  getAdminCurrentlyOutsideApi,
  revokeMovementPassApi,
  cancelMovementPassApi,
  getMovementPassAuditHistoryApi,
} from "@/lib/api/admin.server";
import type { AdminMovementPass, AdminMovementPassStats, DBAuditLogRecord } from "@/lib/db/admin.server";

export const Route = createFileRoute("/admin/movement-passes")({
  head: () => ({ meta: [{ title: "Admin Movement Passes — Control & Auditing" }] }),
  component: AdminMovementPassesPage,
});

function AdminMovementPassesPage() {
  const [passes, setPasses] = useState<AdminMovementPass[]>([]);
  const [stats, setStats] = useState<AdminMovementPassStats | null>(null);
  const [currentlyOutside, setCurrentlyOutside] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all"); // 'all' or 'today'

  // Selected Pass Details Drawer / Modal
  const [selectedPass, setSelectedPass] = useState<AdminMovementPass | null>(null);
  const [auditLogs, setAuditLogs] = useState<DBAuditLogRecord[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Emergency Action Dialog (Revoke or Cancel)
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "revoke" | "cancel";
    pass: AdminMovementPass | null;
  }>({ open: false, type: "revoke", pass: null });
  const [actionReason, setActionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0]!;

  const loadData = async () => {
    setLoading(true);
    try {
      const [passesRes, statsRes, outsideRes] = await Promise.all([
        getAdminMovementPassesApi({
          data: {
            ...(deptFilter !== "all" ? { department: deptFilter } : {}),
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
            ...(dateFilter === "today" ? { date: todayStr } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        }),
        getAdminMovementPassStatsApi(),
        getAdminCurrentlyOutsideApi(),
      ]);

      if (passesRes.success) setPasses(passesRes.passes);
      if (statsRes.success) setStats(statsRes.stats);
      if (outsideRes.success) setCurrentlyOutside(outsideRes.students);
    } catch (err) {
      console.error("Failed to load admin movement pass data:", err);
      toast.error("Failed to fetch movement passes data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, deptFilter, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenDetails = async (pass: AdminMovementPass) => {
    setSelectedPass(pass);
    setLoadingAudit(true);
    try {
      const res = await getMovementPassAuditHistoryApi({ data: { passId: pass.id } });
      if (res.success) {
        setAuditLogs(res.auditLogs);
      }
    } catch (err) {
      console.error("Failed to load pass audit history:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenActionModal = (type: "revoke" | "cancel", pass: AdminMovementPass) => {
    setActionReason("");
    setActionModal({ open: true, type, pass });
  };

  const handleExecuteEmergencyAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = actionReason.trim();
    if (!cleanReason) {
      toast.error("A mandatory reason is required for administrator intervention.");
      return;
    }
    if (!actionModal.pass) return;

    setActionSubmitting(true);
    try {
      if (actionModal.type === "revoke") {
        const res = await revokeMovementPassApi({
          data: {
            passId: actionModal.pass.id,
            reason: cleanReason,
          },
        });
        if (res.success && res.pass) {
          toast.success(`Movement Pass ${actionModal.pass.id.slice(0, 8)} Revoked`, {
            description: `Pass has been revoked server-side and exit permission terminated.`,
          });
          setActionModal({ open: false, type: "revoke", pass: null });
          loadData();
          if (selectedPass?.id === actionModal.pass.id) {
            setSelectedPass(res.pass);
          }
        } else {
          toast.error(res.error || "Failed to revoke movement pass.");
        }
      } else if (actionModal.type === "cancel") {
        const res = await cancelMovementPassApi({
          data: {
            passId: actionModal.pass.id,
            reason: cleanReason,
          },
        });
        if (res.success && res.pass) {
          toast.success(`Pass Request Cancelled`, {
            description: `Pending request has been cancelled by Administrator.`,
          });
          setActionModal({ open: false, type: "cancel", pass: null });
          loadData();
          if (selectedPass?.id === actionModal.pass.id) {
            setSelectedPass(res.pass);
          }
        } else {
          toast.error(res.error || "Failed to cancel movement pass request.");
        }
      }
    } catch (err) {
      console.error("Emergency action failed:", err);
      toast.error("Error executing emergency action.");
    } finally {
      setActionSubmitting(false);
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (pass: AdminMovementPass) => {
    if (pass.cancelledAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
          <Ban className="size-3" /> Cancelled
        </span>
      );
    }
    if (pass.revokedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
          <XCircle className="size-3" /> Revoked
        </span>
      );
    }
    if (pass.completed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
          <CheckCircle2 className="size-3" /> Completed
        </span>
      );
    }
    if (pass.currentlyOutside) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 animate-pulse">
          <Activity className="size-3" /> Currently Outside
        </span>
      );
    }
    if (pass.status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="size-3" /> Approved
        </span>
      );
    }
    if (pass.status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          <XCircle className="size-3" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
        <Clock className="size-3" /> Pending HOD
      </span>
    );
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Admin Movement Passes Control"
          description="Institutional movement pass monitoring, live off-campus student tracking, audit inspection, and emergency administrator controls."
          breadcrumb={[
            { label: "Admin Console", to: "/admin/dashboard" },
            { label: "Movement Passes" },
          ]}
        />

        {/* 1. KPI CARDS METRICS RIBBON */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="card-surface p-4 rounded-2xl border border-border space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <FileText className="size-3 text-primary" /> Total
            </span>
            <p className="text-2xl font-black text-foreground">{stats?.totalRequests ?? 0}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1">
              <Clock className="size-3" /> Pending HOD
            </span>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{stats?.pending ?? 0}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Approved
            </span>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats?.approved ?? 0}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase flex items-center gap-1">
              <XCircle className="size-3" /> Rejected
            </span>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300">{stats?.rejected ?? 0}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 space-y-1 shadow-xs">
            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 uppercase flex items-center gap-1">
              <Activity className="size-3 animate-spin" /> Outside
            </span>
            <p className="text-2xl font-black text-cyan-700 dark:text-cyan-300">{stats?.currentlyOutside ?? 0}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-1 shadow-xs">
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Completed
            </span>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{stats?.completed ?? 0}</p>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-red-500/40 bg-red-500/10 space-y-1 shadow-xs">
            <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase flex items-center gap-1">
              <ShieldAlert className="size-3" /> Denials
            </span>
            <p className="text-2xl font-black text-red-700 dark:text-red-300">{stats?.unauthorizedAttempts ?? 0}</p>
          </div>
        </div>

        {/* 2. DEDICATED CURRENTLY OUTSIDE SECTION */}
        {currentlyOutside.length > 0 && (
          <div className="card-surface p-5 rounded-2xl border-2 border-cyan-500/40 bg-cyan-500/5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-cyan-500 text-white font-bold shadow-xs">
                  <Activity className="size-4 animate-pulse" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Students Currently Off-Campus ({currentlyOutside.length})
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Real-time monitoring of students who have exited via security gate and not yet verified entry on return.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentlyOutside.map((item) => (
                <div
                  key={item.passId}
                  className="p-3.5 rounded-xl border border-cyan-500/30 bg-card/90 space-y-2 text-xs shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground">{item.studentName}</p>
                      <p className="text-[11px] font-mono text-primary">{item.studentCode} &bull; {item.department}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-600/15 text-cyan-700 dark:text-cyan-300 font-bold text-[10px]">
                      {item.durationOutsideMinutes} mins outside
                    </span>
                  </div>

                  <p className="text-muted-foreground text-[11px] line-clamp-1 italic">
                    &ldquo;{item.reason}&rdquo;
                  </p>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Gate: <strong className="text-foreground">{item.checkpoint}</strong></span>
                    <span>Officer: <strong className="text-foreground">{item.verifiedBy}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. FILTERS & SEARCH BAR */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by Student Name, Roll No, Pass ID, or Reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl text-xs font-semibold"
              />
            </div>

            <Button type="submit" size="sm" className="rounded-xl text-xs font-semibold h-10 px-4">
              <Search className="size-3.5 mr-1.5" /> Search
            </Button>
          </form>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground font-semibold text-[11px] mr-2">
              <Filter className="size-3" /> Filters:
            </div>

            {/* Status filters */}
            {[
              { id: "all", label: "All Status" },
              { id: "pending", label: "Pending" },
              { id: "approved", label: "Approved" },
              { id: "currently_outside", label: "Currently Outside" },
              { id: "completed", label: "Completed" },
              { id: "rejected", label: "Rejected" },
              { id: "revoked", label: "Revoked" },
              { id: "cancelled", label: "Cancelled" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                  statusFilter === st.id
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {st.label}
              </button>
            ))}

            <div className="h-4 w-px bg-border mx-1" />

            {/* Date filter */}
            <button
              type="button"
              onClick={() => setDateFilter(dateFilter === "today" ? "all" : "today")}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                dateFilter === "today"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              📅 Today Only
            </button>

            {/* Department filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="Filter by department"
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-muted/60 border border-border text-foreground outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="IT">IT</option>
            </select>
          </div>
        </div>

        {/* 4. MAIN PASSES TABLE */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Movement Pass Master Registry ({passes.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="rounded-xl text-xs h-8"
            >
              <RotateCcw className="size-3 mr-1" /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <Activity className="size-6 text-primary animate-spin mx-auto" />
              <p>Loading movement passes...</p>
            </div>
          ) : passes.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No movement passes found matching the selected filters.</p>
              <p>Try clearing filters or changing search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold text-left">
                    <th className="p-3.5">Student Details</th>
                    <th className="p-3.5">Reason & Pass ID</th>
                    <th className="p-3.5">Date & Window</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Exit / Entry Info</th>
                    <th className="p-3.5">Authorities</th>
                    <th className="p-3.5 text-right">Emergency Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {passes.map((pass) => {
                    const canRevoke = pass.status === "approved" && !pass.exitAt && !pass.revokedAt;
                    const canCancel = pass.status === "pending" && !pass.cancelledAt;

                    return (
                      <tr key={pass.id} className="hover:bg-accent/40 transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-foreground">{pass.studentName}</p>
                          <p className="text-[11px] font-mono text-primary font-semibold">{pass.studentCode}</p>
                          <p className="text-[10px] text-muted-foreground">{pass.department} &bull; {pass.year}</p>
                        </td>

                        <td className="p-3.5 max-w-[200px]">
                          <p className="font-semibold text-foreground line-clamp-1">{pass.reason}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">ID: {pass.id.slice(0, 8)}...</p>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <p className="font-semibold text-foreground">{pass.date}</p>
                          <p className="text-[11px] text-muted-foreground">{pass.validFrom} – {pass.validUntil}</p>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {renderStatusBadge(pass)}
                        </td>

                        <td className="p-3.5 whitespace-nowrap text-[11px]">
                          {pass.exitAt ? (
                            <div className="space-y-0.5">
                              <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                Exit: {new Date(pass.exitAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              {pass.entryAt ? (
                                <p className="text-purple-700 dark:text-purple-400 font-semibold">
                                  Entry: {new Date(pass.entryAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              ) : (
                                <p className="text-cyan-600 font-semibold">Currently Out</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">Not yet exited</span>
                          )}
                        </td>

                        <td className="p-3.5 text-[11px] text-muted-foreground">
                          <p>HOD: <strong className="text-foreground">{pass.issuedBy || "Pending"}</strong></p>
                          {pass.verifiedBy && (
                            <p>Gate: <strong className="text-foreground">{pass.checkpoint || "Main Gate"}</strong></p>
                          )}
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetails(pass)}
                              className="rounded-xl text-xs h-8 px-2.5"
                              title="View Pass Details & Audit Trail"
                            >
                              <Eye className="size-3.5 mr-1" /> Details
                            </Button>

                            {canRevoke && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenActionModal("revoke", pass)}
                                className="rounded-xl text-xs h-8 px-2.5 border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15"
                                title="Emergency Revocation (Before Exit)"
                              >
                                <Ban className="size-3.5 mr-1" /> Revoke
                              </Button>
                            )}

                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenActionModal("cancel", pass)}
                                className="rounded-xl text-xs h-8 px-2.5 border-slate-500/40 text-slate-700 dark:text-slate-300 hover:bg-slate-500/15"
                                title="Cancel Pending Request"
                              >
                                <XCircle className="size-3.5 mr-1" /> Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 5. PASS DETAILS & AUDIT LOGS MODAL */}
        <Dialog open={!!selectedPass} onOpenChange={(open) => !open && setSelectedPass(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            {selectedPass && (
              <div className="space-y-6 text-xs">
                <DialogHeader className="border-b border-border pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-base font-bold text-foreground">
                        Movement Pass Details & Lifecycle
                      </DialogTitle>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        Pass ID: {selectedPass.id}
                      </p>
                    </div>
                    {renderStatusBadge(selectedPass)}
                  </div>
                </DialogHeader>

                {/* LIFECYCLE PROGRESS STEPPER */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                    Movement Pass Lifecycle
                  </span>

                  <div className="flex items-center justify-between text-center">
                    {/* STEP 1: REQUESTED */}
                    <div className="flex-1 space-y-1">
                      <span className="grid size-7 mx-auto place-items-center rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-xs">
                        <Check className="size-3.5" />
                      </span>
                      <p className="text-[10px] font-bold text-foreground">REQUESTED</p>
                    </div>

                    <div className="h-0.5 flex-1 bg-primary" />

                    {/* STEP 2: HOD DECISION */}
                    {selectedPass.status === "rejected" ? (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-rose-500 text-white font-bold text-xs shadow-xs">
                          <XCircle className="size-3.5" />
                        </span>
                        <p className="text-[10px] font-bold text-rose-600">HOD REJECTED</p>
                      </div>
                    ) : selectedPass.cancelledAt ? (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-slate-600 text-white font-bold text-xs shadow-xs">
                          <Ban className="size-3.5" />
                        </span>
                        <p className="text-[10px] font-bold text-slate-600">ADMIN CANCELLED</p>
                      </div>
                    ) : selectedPass.status === "approved" ? (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-emerald-500 text-white font-bold text-xs shadow-xs">
                          <Check className="size-3.5" />
                        </span>
                        <p className="text-[10px] font-bold text-emerald-600">HOD APPROVED</p>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-muted border border-border text-muted-foreground font-bold text-xs">
                          2
                        </span>
                        <p className="text-[10px] font-semibold text-muted-foreground">HOD REVIEW</p>
                      </div>
                    )}

                    <div className={`h-0.5 flex-1 ${selectedPass.exitAt || selectedPass.revokedAt ? "bg-primary" : "bg-border"}`} />

                    {/* STEP 3: EXIT / REVOKED */}
                    {selectedPass.revokedAt ? (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-rose-600 text-white font-bold text-xs shadow-xs">
                          <XCircle className="size-3.5" />
                        </span>
                        <p className="text-[10px] font-bold text-rose-600">ADMIN REVOKED</p>
                      </div>
                    ) : selectedPass.exitAt ? (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-cyan-600 text-white font-bold text-xs shadow-xs">
                          <Check className="size-3.5" />
                        </span>
                        <p className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300">EXIT AUTHORIZED</p>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-muted border border-border text-muted-foreground font-bold text-xs">
                          3
                        </span>
                        <p className="text-[10px] font-semibold text-muted-foreground">GATE EXIT</p>
                      </div>
                    )}

                    <div className={`h-0.5 flex-1 ${selectedPass.entryAt ? "bg-primary" : "bg-border"}`} />

                    {/* STEP 4: ENTRY / COMPLETED */}
                    {selectedPass.entryAt ? (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-purple-600 text-white font-bold text-xs shadow-xs">
                          <Check className="size-3.5" />
                        </span>
                        <p className="text-[10px] font-bold text-purple-600">COMPLETED</p>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-1">
                        <span className="grid size-7 mx-auto place-items-center rounded-full bg-muted border border-border text-muted-foreground font-bold text-xs">
                          4
                        </span>
                        <p className="text-[10px] font-semibold text-muted-foreground">GATE RETURN</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* REVOCATION / CANCELLATION NOTICE BANNER */}
                {selectedPass.revokedAt && (
                  <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Ban className="size-4" /> Revoked by {selectedPass.revokedBy}
                    </p>
                    <p className="text-xs">Reason: &ldquo;{selectedPass.revocationReason}&rdquo;</p>
                    <p className="text-[10px] text-muted-foreground">
                      Timestamp: {new Date(selectedPass.revokedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedPass.cancelledAt && (
                  <div className="p-3.5 rounded-xl border border-slate-500/40 bg-slate-500/10 text-slate-800 dark:text-slate-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <XCircle className="size-4" /> Cancelled by {selectedPass.cancelledBy}
                    </p>
                    <p className="text-xs">Reason: &ldquo;{selectedPass.cancellationReason}&rdquo;</p>
                    <p className="text-[10px] text-muted-foreground">
                      Timestamp: {new Date(selectedPass.cancelledAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* DETAILS GRID */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Student Name</span>
                    <p className="font-bold text-foreground">{selectedPass.studentName}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Roll Number</span>
                    <p className="font-bold font-mono text-primary">{selectedPass.studentCode}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Department & Year</span>
                    <p className="font-semibold text-foreground">{selectedPass.department} &bull; {selectedPass.year}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Movement Schedule</span>
                    <p className="font-semibold text-foreground">
                      {selectedPass.date} ({selectedPass.validFrom} – {selectedPass.validUntil})
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card space-y-1 col-span-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Reason for Movement</span>
                    <p className="font-semibold text-foreground">{selectedPass.reason}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">HOD Approval</span>
                    <p className="font-semibold text-foreground">{selectedPass.issuedBy || "Pending Review"}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Security Gate Checkpoint</span>
                    <p className="font-semibold text-foreground">{selectedPass.checkpoint || "Not verified yet"}</p>
                  </div>

                  {selectedPass.exitAt && (
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Exit Time</span>
                      <p className="font-bold text-emerald-800 dark:text-emerald-300">
                        {new Date(selectedPass.exitAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedPass.entryAt && (
                    <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400">Return Entry Time</span>
                      <p className="font-bold text-purple-800 dark:text-purple-300">
                        {new Date(selectedPass.entryAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* AUDIT LOG TIMELINE */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <ShieldCheck className="size-3.5 text-primary" /> Chronological Audit Timeline
                  </h3>

                  {loadingAudit ? (
                    <div className="p-6 text-center text-muted-foreground">Loading audit records...</div>
                  ) : auditLogs.length === 0 ? (
                    <p className="text-muted-foreground italic">No audit records recorded for this pass.</p>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3 hover:bg-accent/30 transition-colors space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-primary text-[11px]">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            Actor: <strong className="text-foreground">{log.actor}</strong> ({log.actor_role})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPass(null)}
                    className="rounded-xl text-xs"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 6. EMERGENCY ACTION MODAL (REVOKE / CANCEL) */}
        <Dialog open={actionModal.open} onOpenChange={(open) => !open && setActionModal((p) => ({ ...p, open: false }))}>
          <DialogContent className="max-w-md rounded-2xl">
            <form onSubmit={handleExecuteEmergencyAction} className="space-y-4 text-xs">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="size-5 text-rose-500" />
                  {actionModal.type === "revoke" ? "Emergency Pass Revocation" : "Cancel Pass Request"}
                </DialogTitle>
              </DialogHeader>

              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                <p className="font-bold">
                  Student: {actionModal.pass?.studentName} ({actionModal.pass?.studentCode})
                </p>
                <p className="text-[11px]">
                  {actionModal.type === "revoke"
                    ? "Revoking an approved pass terminates gate exit authorization immediately. This action is permanently audited."
                    : "Cancelling a pending request removes it from HOD authorization. This action is permanently audited."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminActionReason" className="text-xs font-semibold">
                  Mandatory Administrator Reason <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="adminActionReason"
                  rows={3}
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="State the institutional reason for this emergency intervention (e.g. Disciplinary suspension / Event cancellation)..."
                  className="text-xs rounded-xl"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal((p) => ({ ...p, open: false }))}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={actionSubmitting}
                  disabled={!actionReason.trim()}
                  size="sm"
                  className="rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {actionModal.type === "revoke" ? "Confirm Revocation" : "Confirm Cancellation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

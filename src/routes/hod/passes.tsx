import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  Search,
  Check,
  X,
  Building2,
  Calendar,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  getHodMovementPassesApi,
  approveHodMovementPassApi,
} from "@/lib/api/hod.server";
import type { DBHodMovementPass } from "@/lib/db/hod.server";

export const Route = createFileRoute("/hod/passes")({
  head: () => ({ meta: [{ title: "Movement Passes — HOD Portal" }] }),
  component: HodPassesPage,
});

function HodPassesPage() {
  const { profile } = useAuth();
  const department = profile?.department || "CSE";

  const [passes, setPasses] = useState<DBHodMovementPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const res = await getHodMovementPassesApi();
      if (res.success) {
        setPasses(res.passes);
      } else {
        toast.error(res.error || "Failed to load departmental movement passes.");
      }
    } catch (err) {
      console.error("Failed to fetch passes:", err);
      toast.error("Error loading movement passes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const handleDecision = async (
    passId: string,
    status: "approved" | "rejected",
    studentName: string,
  ) => {
    let rejectionReason: string | undefined;
    if (status === "rejected") {
      const input = window.prompt(
        `Please enter a rejection reason for ${studentName}'s pass (optional):`,
        "Academic schedule conflict / unauthorized leave",
      );
      if (input === null) return; // User cancelled prompt
      rejectionReason = input.trim() || undefined;
    }

    setProcessingId(passId);
    try {
      const res = await approveHodMovementPassApi({
        data: {
          passId,
          status,
          ...(rejectionReason ? { rejectionReason } : {}),
        },
      });

      if (res.success && res.pass) {
        toast.success(
          status === "approved"
            ? `Pass approved for ${studentName}`
            : `Pass rejected for ${studentName}`,
        );
        // Update local state
        setPasses((prev) =>
          prev.map((p) => (p.id === passId ? { ...p, ...res.pass! } : p)),
        );
      } else {
        toast.error(res.error || "Failed to update movement pass decision.");
      }
    } catch (err) {
      console.error("Decision failed:", err);
      toast.error("Error processing movement pass decision.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingPasses = passes.filter(
    (p) => p.status.toLowerCase() === "pending" && (p.target_role || "hod").toLowerCase() === "hod",
  );
  const approvedPasses = passes.filter((p) => p.status.toLowerCase() === "approved");
  const rejectedPasses = passes.filter((p) => p.status.toLowerCase() === "rejected");

  const filteredPasses = (
    activeTab === "pending"
      ? pendingPasses
      : activeTab === "approved"
        ? approvedPasses
        : activeTab === "rejected"
          ? rejectedPasses
          : passes
  ).filter(
    (p) =>
      p.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reason.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHeader
          title="Movement Pass Authorization"
          description={`Review and authorize campus corridor and gate movement passes for ${department} Department students.`}
          breadcrumb={[
            { label: "HOD Portal", to: "/hod/dashboard" },
            { label: "Movement Passes" },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPasses}
              loading={loading}
              disabled={loading}
              className="gap-2 rounded-xl text-xs font-semibold"
            >
              {!loading && <RefreshCw className="size-3.5" />}
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveTab("pending")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-amber-500/10 border-amber-500/50 shadow-xs"
                : "bg-card border-border hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Pending Approval
              </span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-500 mt-2">
              {pendingPasses.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting your authorization</p>
          </div>

          <div
            onClick={() => setActiveTab("approved")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === "approved"
                ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs"
                : "bg-card border-border hover:border-emerald-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Approved Passes
              </span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-500 mt-2">
              {approvedPasses.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Authorized for gate exit</p>
          </div>

          <div
            onClick={() => setActiveTab("rejected")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === "rejected"
                ? "bg-destructive/10 border-destructive/50 shadow-xs"
                : "bg-card border-border hover:border-destructive/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Rejected Passes
              </span>
              <XCircle className="size-4 text-destructive" />
            </div>
            <p className="text-2xl font-black text-destructive mt-2">
              {rejectedPasses.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Disapproved requests</p>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="card-surface p-4 rounded-2xl border border-border shadow-xs w-full">
          {/* Mobile Layout (< 640px): Status Dropdown on top, Search box below */}
          <div className="block sm:hidden space-y-3 w-full">
            <div>
              <label htmlFor="hod-status-filter-select" className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">
                Filter Passes
              </label>
              <div className="relative w-full">
                <select
                  id="hod-status-filter-select"
                  aria-label="Filter passes by status"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as any)}
                  className="w-full h-10 px-3.5 pr-9 rounded-xl bg-background border border-border text-xs font-bold text-foreground appearance-none outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
                >
                  <option value="pending">Pending ({pendingPasses.length})</option>
                  <option value="approved">Approved ({approvedPasses.length})</option>
                  <option value="rejected">Rejected ({rejectedPasses.length})</option>
                  <option value="all">All Passes ({passes.length})</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <ChevronDown className="size-4" />
                </div>
              </div>
            </div>

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by student or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl w-full"
              />
            </div>
          </div>

          {/* Desktop Layout (>= 640px): Horizontal status tab row and search input */}
          <div className="hidden sm:flex flex-row items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === "pending"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Pending ({pendingPasses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("approved")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === "approved"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Approved ({approvedPasses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rejected")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === "rejected"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                Rejected ({rejectedPasses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                All Passes ({passes.length})
              </button>
            </div>

            <div className="relative w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by student or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center space-y-2">
            <RefreshCw className="size-6 text-primary animate-spin mx-auto" />
            <p className="text-xs font-semibold text-muted-foreground">
              Loading departmental movement passes...
            </p>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center space-y-2">
            <CheckCircle2 className="size-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-bold text-foreground">No passes found</p>
            <p className="text-xs text-muted-foreground">
              {activeTab === "pending"
                ? "All pending movement pass requests for your department have been reviewed."
                : "No matching movement passes in this view."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPasses.map((pass) => {
              const isPending = pass.status.toLowerCase() === "pending";
              const isApproved = pass.status.toLowerCase() === "approved";
              const isRejected = pass.status.toLowerCase() === "rejected";
              const isProcessing = processingId === pass.id;

              return (
                <div
                  key={pass.id}
                  className={`card-surface p-4 sm:p-5 rounded-2xl border transition-all shadow-xs space-y-4 ${
                    isPending
                      ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/10"
                      : isApproved
                        ? "border-emerald-500/30"
                        : "border-border opacity-85"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-10 place-items-center rounded-xl font-bold text-xs ${
                          isPending
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : isApproved
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {isPending ? (
                          <Clock className="size-5" />
                        ) : isApproved ? (
                          <CheckCircle2 className="size-5" />
                        ) : (
                          <XCircle className="size-5" />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">
                            {pass.student_name}
                          </h4>
                          <span className="text-xs font-mono font-bold text-primary">
                            ({pass.student_code})
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {pass.department} Department &bull; {pass.year} &bull; Section {pass.section}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-border bg-muted text-muted-foreground">
                        To: {(pass.target_role || "hod").toLowerCase() === "counselor" ? "Counselor" : "HOD"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                          isPending
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            : isApproved
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {pass.status}
                      </span>
                      {pass.exit_at && (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          Exited: {new Date(pass.exit_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {pass.entry_at && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          Completed (Entry Recorded)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pass Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                        Date of Movement
                      </span>
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-primary" />
                        {pass.date}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                        Valid Time Window
                      </span>
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="size-3.5 text-primary" />
                        {pass.valid_from} &ndash; {pass.valid_until}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-card border border-border space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                        Stated Reason
                      </span>
                      <p className="font-medium text-foreground">{pass.reason}</p>
                    </div>
                  </div>

                  {/* Actions for Pending Passes */}
                  {isPending && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border/40">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={isProcessing}
                        disabled={isProcessing}
                        onClick={() => handleDecision(pass.id, "rejected", pass.student_name)}
                        className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
                      >
                        {!isProcessing && <X className="size-4" />}
                        {isProcessing ? "Rejecting..." : "[ REJECT ]"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        loading={isProcessing}
                        disabled={isProcessing}
                        onClick={() => handleDecision(pass.id, "approved", pass.student_name)}
                        className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
                      >
                        {!isProcessing && <Check className="size-4" />}
                        {isProcessing ? "Approving..." : "[ APPROVE PASS ]"}
                      </Button>
                    </div>
                  )}

                  {!isPending && (
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                      <span>Authorized/Issued By: <strong className="text-foreground">{pass.issued_by}</strong></span>
                      <span>Created: {new Date(pass.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

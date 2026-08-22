import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck,
  Clock,
  FileText,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Activity,
  Calendar,
  Building2,
  User,
  Search,
  SlidersHorizontal,
  Filter,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { QRCode } from "@/components/qr-code";
import { cn } from "@/lib/utils";
import {
  getMyMovementPermissionsApi,
  requestMovementPermissionApi,
} from "@/lib/api/student.server";
import type { DBPermission } from "@/lib/db/permissions.server";

export const Route = createFileRoute("/student/passes")({
  head: () => ({ meta: [{ title: "My Movement Passes — Student Portal" }] }),
  component: StudentPassesPage,
});

function formatDateStr(d: any): string {
  if (!d) return "Today";
  if (typeof d === "string") return d;
  if (d instanceof Date) return d.toISOString().split("T")[0]!;
  return String(d);
}

function formatTimeStr(t: any): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  return String(t);
}

function StudentPassesPage() {
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";
  const [passes, setPasses] = useState<DBPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Apply new pass form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  const [validFrom, setValidFrom] = useState("10:00");
  const [validUntil, setValidUntil] = useState("12:30");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPasses() {
      try {
        const res = await getMyMovementPermissionsApi();
        if (isMounted && res.success && res.permissions) {
          setPasses(res.permissions);
        }
      } catch (err) {
        console.error("Failed to load student passes from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPasses();
    return () => {
      isMounted = false;
    };
  }, [rollNo]);

  const handleRequestPass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      toast.error("Please enter a reason for movement permission.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0]!;
    const cleanDate = (date || todayStr).trim();
    if (cleanDate < todayStr) {
      toast.error("Date of movement cannot be in the past.");
      return;
    }

    if (validFrom >= validUntil) {
      toast.error("Valid From time must be earlier than Valid Until time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestMovementPermissionApi({
        data: {
          reason: cleanReason,
          date: cleanDate,
          validFrom: String(validFrom),
          validUntil: String(validUntil),
        },
      });

      if (res.success && res.permission) {
        const newPerm = res.permission;
        toast.success("Movement Pass Requested!", {
          description:
            "Your request has been submitted to your Department HOD for authorization (Status: Pending).",
        });
        setPasses((prev) => [newPerm, ...prev]);
        setShowApplyModal(false);
        setReason("");
      } else {
        toast.error(res.error || "Failed to submit movement pass request.");
      }
    } catch (err) {
      console.error("Error applying for pass:", err);
      toast.error("Error submitting movement pass request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter calculation & counts
  const counts = {
    all: passes.length,
    approved: passes.filter((p) => String(p.status || "").toLowerCase() === "approved").length,
    pending: passes.filter((p) => String(p.status || "").toLowerCase() === "pending").length,
    rejected: passes.filter((p) => String(p.status || "").toLowerCase() === "rejected").length,
  };

  const filteredPasses = passes
    .filter((pass) => {
      const statusStr = String(pass.status || "pending").toLowerCase();
      if (statusFilter !== "all" && statusStr !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const reasonMatch = String(pass.reason || "").toLowerCase().includes(q);
        const authorityMatch = String(pass.issued_by || "").toLowerCase().includes(q);
        const studentMatch = String(pass.student_code || "").toLowerCase().includes(q);
        const passIdMatch = String(pass.id || "").toLowerCase().includes(q);
        if (!reasonMatch && !authorityMatch && !studentMatch && !passIdMatch) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(`${a.date || ""}T${a.valid_from || "00:00"}`).getTime() || 0;
      const timeB = new Date(`${b.date || ""}T${b.valid_from || "00:00"}`).getTime() || 0;
      return sortBy === "newest" ? timeB - timeA : timeA - timeB;
    });

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6 w-full">
        <PageHeader
          title="My Movement Passes"
          description="View active and past campus corridor and gate movement passes issued to you."
          breadcrumb={[
            { label: "Student", to: "/student/dashboard" },
            { label: "My Movement Passes" },
          ]}
          actions={
            <Button
              onClick={() => setShowApplyModal((prev) => !prev)}
              className="rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="size-4 mr-1.5" /> Apply New Pass
            </Button>
          }
        />

        {/* Apply Pass Form Card */}
        {showApplyModal && (
          <form
            onSubmit={handleRequestPass}
            className="card-surface p-6 rounded-2xl border border-primary/30 shadow-xs w-full max-w-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">
                Request New Movement Permission Pass
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                STATUS: PENDING HOD
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passReason" className="text-xs font-semibold">
                Reason for Movement
              </Label>
              <Textarea
                id="passReason"
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Lab component procurement at Electronics Lab / Medical Center Visit"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="passDate" className="text-xs font-semibold">
                  Date
                </Label>
                <Input
                  id="passDate"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>
              <div>
                <Label htmlFor="validFrom" className="text-xs font-semibold">
                  Valid From
                </Label>
                <Input
                  id="validFrom"
                  type="time"
                  required
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>
              <div>
                <Label htmlFor="validUntil" className="text-xs font-semibold">
                  Valid Until
                </Label>
                <Input
                  id="validUntil"
                  type="time"
                  required
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowApplyModal(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || !reason.trim()}
                size="sm"
                className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
              >
                {!submitting && <Send className="size-3.5 mr-1" />}
                {submitting ? "Submitting Request..." : "Submit Request"}
              </Button>
            </div>
          </form>
        )}

        {/* Interactive Full-Width Filter & Search Bar */}
        {!loading && passes.length > 0 && (
          <div className="card-surface p-4 rounded-2xl border border-border shadow-xs space-y-3 w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Live Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter by reason, authority, or pass ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search query"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal className="size-3.5 text-muted-foreground hidden sm:block" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
                  className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                </select>
              </div>
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
              {[
                { id: "all", label: "All Passes", count: counts.all, icon: Filter },
                { id: "approved", label: "Approved", count: counts.approved, icon: CheckCircle2 },
                { id: "pending", label: "Pending", count: counts.pending, icon: Clock },
                { id: "rejected", label: "Rejected", count: counts.rejected, icon: XCircle },
              ].map((tab) => {
                const isSelected = statusFilter === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 outline-none cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                    )}
                  >
                    <TabIcon className="size-3.5" />
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-bold ml-0.5",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-background text-muted-foreground border border-border"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center w-full max-w-2xl mx-auto text-xs text-muted-foreground">
            Loading movement passes from database...
          </div>
        ) : filteredPasses.length > 0 ? (
          /* Responsive Multi-Column Grid Layout for Pass Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
            {filteredPasses.map((pass) => {
              const statusStr = String(pass.status || "pending").toLowerCase();
              const isApproved = statusStr === "approved";
              const isPending = statusStr === "pending";
              const isRejected = statusStr === "rejected";
              const passIdStr = String(pass.id || "");
              const passCode = passIdStr.startsWith("CMADMS-PASS-")
                ? passIdStr
                : `CMADMS-PASS-${passIdStr.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

              const formattedDate = formatDateStr(pass.date);
              const validFromStr = formatTimeStr(pass.valid_from);
              const validUntilStr = formatTimeStr(pass.valid_until);

              return (
                <div
                  key={pass.id}
                  className={`card-surface p-5 sm:p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${
                    isApproved
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                      : isPending
                        ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20"
                        : "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex items-center gap-2 font-bold text-xs sm:text-sm ${
                        isApproved
                          ? "text-emerald-700 dark:text-emerald-300"
                          : isPending
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isApproved ? (
                        <CheckCircle2 className="size-4 sm:size-5 shrink-0" />
                      ) : isPending ? (
                        <Clock className="size-4 sm:size-5 shrink-0" />
                      ) : (
                        <XCircle className="size-4 sm:size-5 shrink-0" />
                      )}
                      <span className="truncate">
                        {isApproved
                          ? "APPROVED DIGITAL GATE PASS"
                          : isPending
                            ? "PENDING HOD AUTHORIZATION"
                            : "REJECTED PASS"}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        isApproved
                          ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30"
                          : isPending
                            ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30"
                      }`}
                    >
                      {pass.status}
                    </span>
                  </div>

                  {isApproved && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-4 rounded-xl bg-card border border-emerald-500/20 flex-1">
                      <div className="flex flex-col items-center shrink-0">
                        <QRCode value={passCode} size={120} />
                        <span className="mt-2 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 text-center">
                          {passCode}
                        </span>
                      </div>
                      <div className="flex-1 text-xs space-y-2 text-foreground w-full">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Student Name</span>
                            <span className="font-bold truncate block">{profile?.full_name || "Student"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Roll Number</span>
                            <span className="font-bold font-mono text-primary truncate block">{pass.student_code}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Department</span>
                            <span className="font-bold truncate block">{profile?.department || "CSE"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Approved By</span>
                            <span className="font-bold truncate block">{pass.issued_by}</span>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-border">
                          <span className="text-muted-foreground block text-[10px]">Reason for Leaving</span>
                          <span className="font-semibold text-[11px] leading-tight block">{pass.reason}</span>
                        </div>
                        <div className="pt-1.5 border-t border-border flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground text-[10px]">Valid Window</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-[11px]">
                            {validFromStr} – {validUntilStr} ({formattedDate})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isApproved && (
                    <div className="text-xs space-y-2 text-foreground flex-1 flex flex-col justify-center">
                      <p className="flex items-start gap-1.5">
                        <FileText className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span>Reason: <strong className="font-bold">{pass.reason}</strong></span>
                      </p>
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-3.5 shrink-0" />
                        <span>Valid Time: {validFromStr} — {validUntilStr} ({formattedDate})</span>
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Authority: <strong className="text-foreground">{pass.issued_by}</strong>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : passes.length > 0 ? (
          /* Filter Return Empty State */
          <div className="card-surface p-8 rounded-2xl border border-border text-center w-full max-w-2xl mx-auto text-xs text-muted-foreground space-y-3">
            <Filter className="size-8 text-muted-foreground/60 mx-auto" />
            <div>
              <p className="font-bold text-foreground text-sm">No Matching Movement Passes</p>
              <p className="text-muted-foreground mt-0.5">
                No movement passes match your active filter criteria:{" "}
                <span className="font-semibold text-foreground">
                  Status: "{statusFilter.toUpperCase()}"
                  {searchQuery ? ` & Search: "${searchQuery}"` : ""}
                </span>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Clear Filters
            </Button>
          </div>
        ) : (
          /* Zero Total Passes Empty State */
          <div className="card-surface p-8 rounded-2xl border border-border text-center w-full max-w-2xl mx-auto text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">No Movement Passes Found</p>
            <p>
              No active or historical movement passes found in database for Roll No:{" "}
              <strong className="text-foreground">{rollNo}</strong>.
            </p>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

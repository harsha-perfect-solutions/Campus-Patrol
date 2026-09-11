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
  Calendar,
  Building2,
  Search,
  SlidersHorizontal,
  Filter,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  Tag,
  Layers,
  HelpCircle,
  ChevronDown,
  User,
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
import { getMyCounselorApi } from "@/lib/api/counselor.server";
import type { DBPermission } from "@/lib/db/permissions.server";

export const Route = createFileRoute("/student/passes")({
  head: () => ({ meta: [{ title: "My Movement Passes — Student Portal" }] }),
  component: StudentPassesPage,
});

type PassState = "active" | "completed" | "expired" | "pending" | "rejected";

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function formatPassDateWithWeek(dateStr: string): {
  fullDate: string;
  dayOfWeek: string;
  weekStr: string;
  relativeTag: string;
} {
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split("T")[0]!;

  const cleanDateStr = dateStr ? String(dateStr).split("T")[0]! : todayStr;
  const d = new Date(`${cleanDateStr}T00:00:00`);

  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" }); // e.g. "Sat"
  const fullDate = d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }); // e.g. "Saturday, 22 Aug 2026"
  const weekNum = getWeekNumber(d);

  let relativeTag = "Past Date";
  if (cleanDateStr === todayStr) {
    relativeTag = "Today";
  } else {
    const yesterday = new Date(todayObj);
    yesterday.setDate(yesterday.getDate() - 1);
    if (cleanDateStr === yesterday.toISOString().split("T")[0]) {
      relativeTag = "Yesterday";
    } else if (getWeekNumber(todayObj) === weekNum) {
      relativeTag = "This Week";
    }
  }

  return {
    fullDate,
    dayOfWeek,
    weekStr: `Week ${weekNum}`,
    relativeTag,
  };
}

function getDerivedPassState(pass: DBPermission): {
  state: PassState;
  label: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
} {
  const rawStatus = String(pass.status || "pending").toLowerCase();
  if (rawStatus === "pending") {
    const isCounselor = (pass.target_role || "").toLowerCase() === "counselor";
    return {
      state: "pending",
      label: isCounselor ? "PENDING COUNSELOR REVIEW" : "PENDING HOD AUTHORIZATION",
      badgeClass: "bg-muted text-foreground border-border",
      borderClass: "border-border",
      bgClass: "bg-muted/20",
    };
  }
  if (rawStatus === "rejected") {
    return {
      state: "rejected",
      label: "REJECTED PASS",
      badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
      borderClass: "border-destructive/30",
      bgClass: "bg-destructive/5 dark:bg-destructive/10",
    };
  }

  // If student checked in (entry_at exists) or completed flag is true => COMPLETED
  if (pass.entry_at || pass.completed) {
    return {
      state: "completed",
      label: "COMPLETED & RETURNED",
      badgeClass: "bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/30",
      borderClass: "border-blue-500/30",
      bgClass: "bg-blue-500/5 dark:bg-blue-950/20",
    };
  }

  // Check date & time validity
  const todayStr = new Date().toISOString().split("T")[0]!;
  const passDateStr = pass.date ? String(pass.date).split("T")[0]! : todayStr;

  if (passDateStr < todayStr) {
    return {
      state: "expired",
      label: "EXPIRED (PAST DATE)",
      badgeClass: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30",
      borderClass: "border-slate-500/30",
      bgClass: "bg-slate-500/5 dark:bg-slate-950/20",
    };
  }

  // If today's date, compare current time vs valid_until
  if (passDateStr === todayStr && pass.valid_until) {
    const now = new Date();
    const currentHHMM = now.toTimeString().slice(0, 5);
    let untilHHMM = String(pass.valid_until).trim();

    if (untilHHMM.includes("PM") || untilHHMM.includes("AM")) {
      const match = untilHHMM.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hrs = parseInt(match[1]!, 10);
        const mins = match[2]!;
        const ampm = match[3]!.toUpperCase();
        if (ampm === "PM" && hrs < 12) hrs += 12;
        if (ampm === "AM" && hrs === 12) hrs = 0;
        untilHHMM = `${String(hrs).padStart(2, "0")}:${mins}`;
      }
    } else {
      untilHHMM = untilHHMM.slice(0, 5);
    }

    if (currentHHMM > untilHHMM) {
      return {
        state: "expired",
        label: "EXPIRED (TIME ELAPSED)",
        badgeClass: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30",
        borderClass: "border-slate-500/30",
        bgClass: "bg-slate-500/5 dark:bg-slate-950/20",
      };
    }
  }

  // Active
  return {
    state: "active",
    label: "ACTIVE DIGITAL GATE PASS",
    badgeClass: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
    borderClass: "border-emerald-500/30",
    bgClass: "bg-emerald-500/5 dark:bg-emerald-950/20",
  };
}

function StudentPassesPage() {
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";
  const [passes, setPasses] = useState<DBPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "completed" | "expired" | "pending" | "rejected"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [groupByWeek, setGroupByWeek] = useState(false);

  // Apply new pass form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [targetRole, setTargetRole] = useState<"counselor" | "hod">("counselor");
  const [counselorInfo, setCounselorInfo] = useState<{
    assigned: boolean;
    counselorName?: string;
    email?: string | null;
  } | null>(null);
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

    async function loadCounselor() {
      try {
        const res = await getMyCounselorApi();
        if (isMounted && res && res.assigned) {
          setCounselorInfo({
            assigned: true,
            counselorName: res.counselorName,
            email: res.email,
          });
        }
      } catch (err) {
        console.warn("Counselor fetch notice:", err);
      }
    }

    loadPasses();
    loadCounselor();
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
          targetRole,
        },
      });

      if (res.success && res.permission) {
        const newPerm = res.permission;
        const recipientLabel =
          targetRole === "counselor"
            ? `Faculty Counselor ${counselorInfo?.counselorName ? `(${counselorInfo.counselorName})` : ""}`
            : `Department HOD (${profile?.department || "Dept"})`;
        toast.success("Movement Pass Requested!", {
          description: `Your request has been submitted to your ${recipientLabel} for authorization (Status: Pending).`,
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

  // Compute counts for status tabs based on derived state
  const stateCounts = {
    all: passes.length,
    active: 0,
    completed: 0,
    expired: 0,
    pending: 0,
    rejected: 0,
  };

  passes.forEach((p) => {
    const derived = getDerivedPassState(p);
    stateCounts[derived.state]++;
  });

  const filteredPasses = passes
    .filter((pass) => {
      const derived = getDerivedPassState(pass);
      if (statusFilter !== "all" && derived.state !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const reasonMatch = String(pass.reason || "").toLowerCase().includes(q);
        const authorityMatch = String(pass.issued_by || "").toLowerCase().includes(q);
        const studentMatch = String(pass.student_code || "").toLowerCase().includes(q);
        const passIdMatch = String(pass.id || "").toLowerCase().includes(q);
        const dateMatch = String(pass.date || "").toLowerCase().includes(q);
        if (!reasonMatch && !authorityMatch && !studentMatch && !passIdMatch && !dateMatch) {
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
          description="View active, completed, and historical campus movement clearance passes issued to you."
          breadcrumb={[
            { label: "Student", to: "/student/dashboard" },
            { label: "My Movement Passes" },
          ]}
          actions={
            <Button
              onClick={() => setShowApplyModal((prev) => !prev)}
              className="rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs w-full sm:w-auto"
            >
              <Plus className="size-4 mr-1.5" /> Apply New Pass
            </Button>
          }
        />

        {/* Apply Pass Form Card */}
        {showApplyModal && (
          <form
            onSubmit={handleRequestPass}
            className="card-surface p-4 sm:p-6 rounded-2xl border border-primary/30 shadow-xs w-full max-w-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">
                Request New Movement Permission Pass
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-border bg-muted text-foreground">
                STATUS: PENDING {targetRole === "counselor" ? "COUNSELOR" : "HOD"}
              </span>
            </div>

            {/* Choose Target Authority: Counselor vs HOD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Send Request To (Approving Role) <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  Select who should authorize this pass
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Counselor Selection Option */}
                <button
                  type="button"
                  onClick={() => setTargetRole("counselor")}
                  className={cn(
                    "relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                    targetRole === "counselor"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg font-bold text-xs transition-colors",
                      targetRole === "counselor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <User className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground">Faculty Counselor</span>
                      {targetRole === "counselor" && (
                        <CheckCircle2 className="size-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {counselorInfo?.counselorName
                        ? counselorInfo.counselorName
                        : "Direct Mentor / Class Advisor"}
                    </p>
                  </div>
                </button>

                {/* HOD Selection Option */}
                <button
                  type="button"
                  onClick={() => setTargetRole("hod")}
                  className={cn(
                    "relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                    targetRole === "hod"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg font-bold text-xs transition-colors",
                      targetRole === "hod"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Building2 className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground">Department HOD</span>
                      {targetRole === "hod" && (
                        <CheckCircle2 className="size-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Head of Department ({profile?.department || "Dept"})
                    </p>
                  </div>
                </button>
              </div>

              {/* Informational routing helper */}
              <div className="p-2.5 rounded-xl border border-border bg-muted/40 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                <span>
                  {targetRole === "counselor" ? (
                    <>
                      This request will be routed directly to your <strong>Faculty Counselor</strong>
                      {counselorInfo?.counselorName && ` (${counselorInfo.counselorName})`} for review. Department HOD will not receive this pass request.
                    </>
                  ) : (
                    <>
                      This request will be routed directly to your <strong>Department HOD</strong> ({profile?.department || "Department"} Office) for official departmental authorization. Counselor will not receive this pass request.
                    </>
                  )}
                </span>
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  className="text-xs rounded-xl h-11 sm:h-9"
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
                  className="text-xs rounded-xl h-11 sm:h-9"
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
                  className="text-xs rounded-xl h-11 sm:h-9"
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

        {/* Interactive Filter & Search Bar */}
        {!loading && passes.length > 0 && (
          <div className="card-surface p-4 rounded-2xl border border-border shadow-xs space-y-3 w-full">
            {/* Mobile Filter Dropdown (< 640px) */}
            <div className="block sm:hidden space-y-3 w-full">
              <div>
                <label htmlFor="mobile-status-filter" className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">
                  Filter Passes
                </label>
                <div className="relative w-full">
                  <select
                    id="mobile-status-filter"
                    aria-label="Filter passes by status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full h-10 px-3.5 pr-9 rounded-xl bg-background border border-border text-xs font-bold text-foreground appearance-none outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs"
                  >
                    {[
                      { id: "all", label: "All Passes", count: stateCounts.all },
                      { id: "active", label: "Active (Scan QR)", count: stateCounts.active },
                      { id: "completed", label: "Completed", count: stateCounts.completed },
                      { id: "expired", label: "Expired", count: stateCounts.expired },
                      { id: "pending", label: "Pending HOD", count: stateCounts.pending },
                      { id: "rejected", label: "Rejected", count: stateCounts.rejected },
                    ].map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} ({opt.count})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ChevronDown className="size-4" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by reason, authority..."
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

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
                  className="h-9 px-2.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-primary shrink-0"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            {/* Desktop Filter & Search Bar (>= 640px) */}
            <div className="hidden sm:block space-y-3 w-full">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Filter by reason, authority, date (e.g. 2026-08-22)..."
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

                <div className="flex items-center gap-2 shrink-0">
                  <SlidersHorizontal className="size-3.5 text-muted-foreground" />
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
                  { id: "all", label: "All Passes", count: stateCounts.all, icon: Filter },
                  { id: "active", label: "Active (Scan QR)", count: stateCounts.active, icon: CheckCircle2 },
                  { id: "completed", label: "Completed", count: stateCounts.completed, icon: Check },
                  { id: "expired", label: "Expired", count: stateCounts.expired, icon: Clock },
                  { id: "pending", label: "Pending HOD", count: stateCounts.pending, icon: Clock },
                  { id: "rejected", label: "Rejected", count: stateCounts.rejected, icon: XCircle },
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
          </div>
        )}

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center w-full max-w-2xl mx-auto text-xs text-muted-foreground">
            Loading movement passes from database...
          </div>
        ) : filteredPasses.length > 0 ? (
          /* Multi-Column Grid Layout for Pass Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
            {filteredPasses.map((pass) => {
              const derived = getDerivedPassState(pass);
              const passIdStr = String(pass.id || "");
              const passCode = passIdStr.startsWith("CMADMS-PASS-")
                ? passIdStr
                : `CMADMS-PASS-${passIdStr.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

              const dateInfo = formatPassDateWithWeek(pass.date);

              return (
                <div
                  key={pass.id}
                  className={cn(
                    "card-surface p-4 sm:p-6 rounded-2xl border space-y-4 flex flex-col justify-between transition-all duration-150",
                    derived.borderClass,
                    derived.bgClass,
                    derived.state === "active" && "shadow-md ring-1 ring-emerald-500/30"
                  )}
                >
                  {/* Card Header: Derived Status Badge & Date/Week info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                        {derived.state === "active" ? (
                          <CheckCircle2 className="size-4 sm:size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : derived.state === "completed" ? (
                          <Check className="size-4 sm:size-5 shrink-0 text-blue-600 dark:text-blue-400" />
                        ) : derived.state === "expired" ? (
                          <Clock className="size-4 sm:size-5 shrink-0 text-slate-500" />
                        ) : derived.state === "pending" ? (
                          <Clock className="size-4 sm:size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <XCircle className="size-4 sm:size-5 shrink-0 text-destructive" />
                        )}
                        <span className="truncate font-extrabold">{derived.label}</span>
                      </div>

                      <span
                        className={cn(
                          "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase shrink-0 border",
                          derived.badgeClass
                        )}
                      >
                        {derived.state}
                      </span>
                    </div>

                    {/* Date & Week Metadata Pill */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Calendar className="size-3.5 text-primary" />
                        {dateInfo.fullDate}
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground font-mono">
                        {dateInfo.weekStr}
                      </span>
                      {dateInfo.relativeTag && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            dateInfo.relativeTag === "Today"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted/80 text-muted-foreground"
                          )}
                        >
                          {dateInfo.relativeTag}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTIVE PASS: Display Active QR Code */}
                  {derived.state === "active" && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-4 rounded-xl bg-card border border-emerald-500/30 flex-1 shadow-xs">
                      <div className="flex flex-col items-center shrink-0">
                        <QRCode value={passCode} size={125} />
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
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-[11px]">
                            {pass.valid_from} – {pass.valid_until}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COMPLETED PASS: Display Completion Receipt & Gate Entry Timestamp */}
                  {derived.state === "completed" && (
                    <div className="p-4 rounded-xl bg-card border border-blue-500/20 flex-1 space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                        <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                          <Check className="size-4 text-blue-500" /> Pass Successfully Completed
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">{passCode}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Reason</span>
                          <span className="font-semibold text-foreground">{pass.reason}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Authorized By</span>
                          <span className="font-semibold text-foreground">{pass.issued_by}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Valid Time Window</span>
                          <span className="font-semibold text-foreground">{pass.valid_from} – {pass.valid_until}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Gate Return Entry</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {pass.entry_at || "Returned & Checked In"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EXPIRED PASS: Display Expiry Information */}
                  {derived.state === "expired" && (
                    <div className="p-4 rounded-xl bg-card/60 border border-slate-500/20 flex-1 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Clock className="size-4 text-slate-500" /> Time Window Elapsed
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">{passCode}</span>
                      </div>
                      <p className="text-muted-foreground">
                        Reason: <strong className="text-foreground font-semibold">{pass.reason}</strong>
                      </p>
                      <p className="text-muted-foreground">
                        Valid Time: <span className="font-medium text-foreground">{pass.valid_from} – {pass.valid_until}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 italic pt-1">
                        * Pass validity period has ended. If you need campus exit clearance, please apply for a new pass.
                      </p>
                    </div>
                  )}

                  {/* PENDING / REJECTED PASS */}
                  {(derived.state === "pending" || derived.state === "rejected") && (
                    <div className="text-xs space-y-2 text-foreground flex-1 flex flex-col justify-center p-4 rounded-xl bg-card border border-border">
                      <p className="flex items-start gap-1.5">
                        <FileText className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span>Reason: <strong className="font-bold">{pass.reason}</strong></span>
                      </p>
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-3.5 shrink-0" />
                        <span>Valid Window: {pass.valid_from} — {pass.valid_until}</span>
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                        <span className="text-muted-foreground">
                          Approving Authority:{" "}
                          <strong className="text-foreground">
                            {pass.status === "pending"
                              ? (pass.target_role || "hod").toLowerCase() === "counselor"
                                ? "Faculty Counselor (Pending Review)"
                                : "Department HOD (Pending Authorization)"
                              : pass.issued_by || "College Authority"}
                          </strong>
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border bg-muted text-muted-foreground">
                          To: {(pass.target_role || "hod").toLowerCase() === "counselor" ? "Counselor" : "HOD"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : passes.length > 0 ? (
          /* Filter Empty State */
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
          /* Zero Passes Found */
          <div className="card-surface p-8 rounded-2xl border border-border text-center w-full max-w-2xl mx-auto text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">No Movement Passes Found</p>
            <p>
              No movement passes recorded in database for Roll No:{" "}
              <strong className="text-foreground">{rollNo}</strong>.
            </p>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}


import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  MapPin,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ToneBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  currentClassByStudent,
  faculty,
  locations,
  permissionByStudent,
  students,
  type Report,
} from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/check")({
  validateSearch: z.object({ student: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Student Verification — CMADMS" },
      {
        name: "description",
        content:
          "Verify a student's current class and movement permission before reporting unauthorized movement.",
      },
      { property: "og:title", content: "Student Verification — CMADMS" },
      {
        property: "og:description",
        content: "Check class schedule and movement permission in one step.",
      },
    ],
  }),
  component: CheckStudentPage,
});

type Result = {
  student: (typeof students)[number] | null;
  slot: (typeof currentClassByStudent)[string];
  permission: ReturnType<() => (typeof permissionByStudent)[string]>;
};

function CheckStudentPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { addReport } = useCmadms();

  const [query, setQuery] = useState(search.student ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [evidence, setEvidence] = useState("");

  const runCheck = (raw: string) => {
    const id = raw.trim().toUpperCase();
    if (!id) return;
    setLoading(true);
    setResult(null);
    setNotFound(null);
    setFormOpen(false);
    window.setTimeout(() => {
      const student = students.find((s) => s.id === id) ?? null;
      if (!student) {
        setNotFound(id);
        setLoading(false);
        return;
      }
      setResult({
        student,
        slot: currentClassByStudent[id] ?? null,
        permission: permissionByStudent[id],
      });
      setLoading(false);
    }, 700);
  };

  useEffect(() => {
    if (search.student) {
      setQuery(search.student);
      runCheck(search.student);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.student]);

  const slot = result?.slot ?? null;
  const permission = result?.permission;
  const state: "authorized" | "no-class" | "unauthorized" | null = !result
    ? null
    : !slot
      ? "no-class"
      : permission
        ? "authorized"
        : "unauthorized";

  const submitReport = () => {
    if (!result?.student || !slot) return;
    setSubmitting(true);
    window.setTimeout(() => {
      const now = new Date();
      const time = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const report: Report = {
        id: `V-20260810-${String(Math.floor(Math.random() * 900) + 100)}`,
        studentName: result.student!.name,
        studentId: result.student!.id,
        department: result.student!.department,
        yearSection: `${result.student!.year} • ${result.student!.section}`,
        className: slot.subject,
        scheduledTime: `${slot.start} — ${slot.end}`,
        room: slot.room,
        incidentTime: time,
        createdAt: `10 Aug 2026, ${time}`,
        location: location || "Not specified",
        remarks: remarks || "No additional remarks provided.",
        evidence: evidence || undefined,
        reportedBy: faculty.name,
        status: "pending",
        timeline: [
          { time, title: "Violation reported", detail: faculty.name, tone: "violation" },
          { time, title: "Student notified", tone: "info" },
        ],
      };
      addReport(report);
      setSubmitting(false);
      setConfirmOpen(false);
      setFormOpen(false);
      toast.success("Violation reported", { description: `Case ${report.id} has been created.` });
      navigate({ to: "/reports/$reportId", params: { reportId: report.id } });
    }, 900);
  };

  return (
    <>
      <PageHeader
        title="Student Verification"
        description="Verify the student's current academic status before reporting unauthorized movement."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "Verification" }, { label: "Check Student" }]}
      />

      <section className="card-surface p-5 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/check", search: { student: query.trim().toUpperCase() } });
            runCheck(query);
          }}
        >
          <Label htmlFor="student-id" className="text-[13px] font-medium">
            Student ID
          </Label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-subtle-foreground"
                aria-hidden
              />
              <Input
                id="student-id"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="23CSE1012"
                className="h-11 pl-10"
                autoComplete="off"
              />
            </div>
            <Button type="submit" size="lg" loading={loading} className="sm:w-40">
              Check
            </Button>
          </div>
          <p className="mt-2 text-xs text-subtle-foreground">
            Try 23CSE1012 (unauthorized), 23CSE1044 (authorized) or 22MEC3007 (no class).
          </p>
        </form>
      </section>

      {loading && <VerificationSkeleton />}

      {notFound && !loading && (
        <section className="card-surface">
          <EmptyState
            icon={UserRound}
            title="No student found"
            description={`We couldn't find a student record for "${notFound}". Check the ID and try again.`}
            action={
              <Button variant="outline" onClick={() => setNotFound(null)}>
                Clear search
              </Button>
            }
          />
        </section>
      )}

      {result?.student && !loading && (
        <>
          {/* Status banner */}
          <section
            className={cn(
              "flex items-center gap-4 rounded-[14px] border px-5 py-4",
              state === "authorized" && "border-success/30 bg-success-soft",
              state === "no-class" && "border-info/30 bg-info-soft",
              state === "unauthorized" && "border-destructive/30 bg-destructive-soft",
            )}
            role="status"
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                state === "authorized" && "bg-success text-success-foreground",
                state === "no-class" && "bg-info text-info-foreground",
                state === "unauthorized" && "bg-destructive text-destructive-foreground",
              )}
            >
              {state === "unauthorized" ? (
                <AlertTriangle className="size-5" aria-hidden />
              ) : (
                <CheckCircle2 className="size-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-base font-semibold",
                  state === "authorized" && "text-success",
                  state === "no-class" && "text-info",
                  state === "unauthorized" && "text-destructive",
                )}
              >
                {state === "authorized" && "Student is authorized to be outside class"}
                {state === "no-class" && "No class is currently scheduled"}
                {state === "unauthorized" &&
                  "Student appears to be outside class without permission"}
              </p>
              <p className="text-xs text-muted-foreground">
                Verification completed at 10:42 AM by {faculty.name}
              </p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            {/* Student profile */}
            <section className="card-surface p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-navy text-lg font-semibold text-navy-foreground">
                  {result.student.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-foreground">
                    {result.student.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{result.student.id}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {result.student.department} • {result.student.year} • {result.student.section}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-divider pt-4">
                <span className="text-sm text-muted-foreground">
                  Semester {result.student.semester}
                </span>
                <ToneBadge tone="success">
                  <CheckCircle2 className="size-3.5" aria-hidden /> {result.student.status}
                </ToneBadge>
              </div>
            </section>

            {/* Current class */}
            <section
              className={cn(
                "rounded-[14px] border p-6 shadow-card",
                slot ? "border-primary/25 bg-card" : "border-success/30 bg-success-soft",
              )}
            >
              {slot ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 animate-pulse rounded-full bg-destructive" aria-hidden />
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-destructive">
                      Class currently in session
                    </p>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">{slot.subject}</h3>
                  <dl className="mt-4 space-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarClock className="size-[18px] shrink-0" aria-hidden />
                      <span>
                        {slot.start} — {slot.end}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DoorOpen className="size-[18px] shrink-0" aria-hidden />
                      <span>{slot.room}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="size-[18px] shrink-0" aria-hidden />
                      <span>{slot.faculty}</span>
                    </div>
                  </dl>
                  <p className="mt-4 rounded-xl bg-accent px-3 py-2.5 text-[13px] text-accent-foreground">
                    Student should currently be attending this class.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="size-[18px]" aria-hidden />
                    <p className="text-xs font-semibold uppercase tracking-[0.1em]">
                      No class scheduled
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    The student is not currently scheduled for a class.
                  </p>
                  <p className="mt-2 text-sm font-medium text-success">
                    No violation should be created.
                  </p>
                </>
              )}
            </section>
          </div>

          {/* Permission status */}
          {slot && permission && (
            <section className="rounded-[14px] border border-success/30 bg-success-soft p-6">
              <div className="flex items-center gap-2 text-success">
                <ShieldCheck className="size-[18px]" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.1em]">
                  Authorized movement
                </p>
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">Active Permission</h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Reason</dt>
                  <dd className="mt-0.5 font-medium text-foreground">{permission.reason}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Issued By</dt>
                  <dd className="mt-0.5 font-medium text-foreground">{permission.issuedBy}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Valid Until</dt>
                  <dd className="mt-0.5 font-medium text-foreground">{permission.validUntil}</dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-success/20 pt-4">
                <ToneBadge tone="success">
                  <CheckCircle2 className="size-3.5" aria-hidden /> Authorized
                </ToneBadge>
              </div>
            </section>
          )}

          {slot && !permission && (
            <section className="rounded-[14px] border border-destructive/35 bg-destructive-soft p-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-[18px]" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.1em]">
                  Unauthorized movement
                </p>
              </div>
              <p className="mt-3 text-sm text-foreground">
                No active movement permission was found.
              </p>
              <div className="mt-4 rounded-xl border border-destructive/20 bg-card p-4">
                <p className="text-xs text-muted-foreground">The student is scheduled for:</p>
                <p className="mt-1 text-base font-semibold text-foreground">{slot.subject}</p>
                <p className="text-sm text-muted-foreground">
                  {slot.start} — {slot.end} • {slot.room}
                </p>
              </div>
              {!formOpen && (
                <Button
                  variant="destructive"
                  size="lg"
                  className="mt-5 w-full sm:w-auto"
                  onClick={() => setFormOpen(true)}
                >
                  <AlertTriangle /> Report Violation
                </Button>
              )}
            </section>
          )}

          {/* Report form */}
          {formOpen && slot && (
            <section className="card-surface overflow-hidden">
              <div className="border-b border-divider px-6 py-4">
                <h2 className="text-base font-semibold text-foreground">Report Unauthorized Movement</h2>
                <p className="text-xs text-muted-foreground">
                  Review the incident details and add your report before submitting.
                </p>
              </div>
              <div className="grid gap-6 p-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Incident Information</h3>
                  <dl className="mt-4 divide-y divide-divider text-sm">
                    {[
                      ["Student", result.student.name],
                      ["Student ID", result.student.id],
                      ["Department", result.student.department],
                      ["Year / Section", `${result.student.year} • ${result.student.section}`],
                      ["Current Class", slot.subject],
                      ["Scheduled Time", `${slot.start} — ${slot.end}`],
                      ["Room", slot.room],
                      ["Incident Time", "10:42 AM"],
                      ["Reported By", faculty.name],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-right font-medium text-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground">Report Details</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="loc">Location</Label>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger id="loc" className="mt-1.5 h-11">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((l) => (
                            <SelectItem key={l} value={l}>
                              <span className="flex items-center gap-2">
                                <MapPin className="size-4" aria-hidden /> {l}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="remarks">Remarks</Label>
                      <Textarea
                        id="remarks"
                        rows={5}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Describe where and how the student was observed..."
                        className="mt-1.5"
                      />
                      <p className="mt-1 text-xs text-subtle-foreground">
                        Keep the description factual and specific.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="evidence">Evidence (optional)</Label>
                      <label
                        htmlFor="evidence"
                        className="mt-1.5 flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary"
                      >
                        <Upload className="size-[18px]" aria-hidden />
                        {evidence || "Upload file"}
                      </label>
                      <input
                        id="evidence"
                        type="file"
                        className="sr-only"
                        onChange={(e) => setEvidence(e.target.files?.[0]?.name ?? "")}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-divider px-6 py-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!location}
                >
                  Submit Violation
                </Button>
              </div>
            </section>
          )}
        </>
      )}

      {!result && !loading && !notFound && (
        <section className="card-surface">
          <EmptyState
            icon={ClipboardCheck}
            title="Start a verification"
            description="Enter a student ID above to check the current class schedule and movement permission."
          />
        </section>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Unauthorized Movement?</DialogTitle>
            <DialogDescription>You are about to submit a violation report.</DialogDescription>
          </DialogHeader>
          <dl className="divide-y divide-divider text-sm">
            {[
              ["Student", result?.student?.name ?? "—"],
              ["Class", slot?.subject ?? "—"],
              ["Time", "10:42 AM"],
              ["Reason", "No active permission found."],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={submitting} onClick={submitReport}>
              Confirm Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VerificationSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-[14px]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface space-y-3 p-6">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="card-surface space-y-3 p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

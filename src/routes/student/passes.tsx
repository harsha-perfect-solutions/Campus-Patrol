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

    // Time comparison
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

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
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
            className="card-surface p-6 rounded-2xl border border-primary/30 shadow-xs max-w-xl space-y-4"
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

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center max-w-xl text-xs text-muted-foreground">
            Loading movement passes from database...
          </div>
        ) : passes.length > 0 ? (
          <div className="space-y-4 max-w-xl">
            {passes.map((pass) => {
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
                  className={`card-surface p-6 rounded-2xl border space-y-4 ${
                    isApproved
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                      : isPending
                        ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20"
                        : "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex items-center gap-2 font-bold text-sm ${
                        isApproved
                          ? "text-emerald-700 dark:text-emerald-300"
                          : isPending
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isApproved ? (
                        <CheckCircle2 className="size-5" />
                      ) : isPending ? (
                        <Clock className="size-5" />
                      ) : (
                        <XCircle className="size-5" />
                      )}
                      <span>
                        {isApproved
                          ? "APPROVED DIGITAL GATE PASS"
                          : isPending
                            ? "PENDING HOD AUTHORIZATION"
                            : "REJECTED PASS"}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
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
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-card border border-emerald-500/20">
                      <div className="flex flex-col items-center">
                        <QRCode value={passCode} size={130} />
                        <span className="mt-2 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {passCode}
                        </span>
                      </div>
                      <div className="flex-1 text-xs space-y-2 text-foreground">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">Student Name</span>
                            <span className="font-bold">{profile?.full_name || "Student"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Roll Number</span>
                            <span className="font-bold font-mono text-primary">{pass.student_code}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Department</span>
                            <span className="font-bold">{profile?.department || "CSE"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Approved By</span>
                            <span className="font-bold">{pass.issued_by}</span>
                          </div>
                        </div>
                        <div className="pt-1 border-t border-border">
                          <span className="text-muted-foreground block text-[11px]">Reason for Leaving</span>
                          <span className="font-semibold">{pass.reason}</span>
                        </div>
                        <div className="pt-1 border-t border-border flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Valid Window</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {validFromStr} – {validUntilStr} ({formattedDate})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isApproved && (
                    <div className="text-xs space-y-1.5 text-foreground">
                      <p className="flex items-center gap-1.5">
                        <FileText className="size-3.5 text-muted-foreground" />
                        Reason: <strong className="font-bold">{pass.reason}</strong>
                      </p>
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-3.5" />
                        Valid Time: {validFromStr} — {validUntilStr} ({formattedDate})
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
        ) : (
          <div className="card-surface p-8 rounded-2xl border border-border text-center max-w-xl text-xs text-muted-foreground space-y-1">
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

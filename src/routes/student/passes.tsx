import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Clock, FileText, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  getMyMovementPermissionsApi,
  requestMovementPermissionApi,
} from "@/lib/api/student.server";
import type { DBPermission } from "@/lib/db/permissions.server";

export const Route = createFileRoute("/student/passes")({
  head: () => ({ meta: [{ title: "My Movement Passes — Student Portal" }] }),
  component: StudentPassesPage,
});

function StudentPassesPage() {
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";
  const [passes, setPasses] = useState<DBPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply new pass form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [validFrom, setValidFrom] = useState("10:00 AM");
  const [validUntil, setValidUntil] = useState("11:30 AM");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPasses() {
      try {
        const res = await getMyMovementPermissionsApi();
        if (isMounted && res.success) {
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
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      const res = await requestMovementPermissionApi({
        data: {
          reason: reason.trim(),
          date: String(date),
          validFrom: String(validFrom),
          validUntil: String(validUntil),
        },
      });

      if (res.success && res.permission) {
        const newPerm = res.permission;
        toast.success("Movement Pass Requested!", {
          description:
            "Your pass request has been submitted for faculty authorization (Status: Pending).",
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
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <h3 className="text-sm font-bold text-foreground">
                Request New Movement Permission Pass
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                STATUS: PENDING
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
                  type="text"
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
                  type="text"
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
                disabled={!reason.trim()}
                size="sm"
                className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
              >
                <Send className="size-3.5 mr-1" /> Submit Request
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
              const isApproved = pass.status.toLowerCase() === "approved";
              const isPending = pass.status.toLowerCase() === "pending";
              return (
                <div
                  key={pass.id}
                  className={`card-surface p-6 rounded-2xl border space-y-4 ${
                    isApproved
                      ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : isPending
                        ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20"
                        : "border-red-300 bg-red-50/40 dark:bg-red-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex items-center gap-2 font-bold text-sm ${
                        isApproved
                          ? "text-emerald-700 dark:text-emerald-300"
                          : isPending
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      <ShieldCheck className="size-5" />
                      <span>
                        {isApproved
                          ? "APPROVED MOVEMENT PASS"
                          : isPending
                            ? "PENDING AUTHORIZATION"
                            : "REJECTED PASS"}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase ${
                        isApproved
                          ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                          : isPending
                            ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                            : "bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {pass.status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5 text-foreground">
                    <p className="flex items-center gap-1.5">
                      <FileText className="size-3.5 text-muted-foreground" />
                      Reason: <strong className="font-bold">{pass.reason}</strong>
                    </p>
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3.5" />
                      Valid Time: {pass.valid_from} — {pass.valid_until} ({pass.date})
                    </p>
                    <p className="text-muted-foreground text-[11px]">Issued by: {pass.issued_by}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-surface p-8 rounded-2xl border border-border text-center max-w-xl text-xs text-muted-foreground">
            No active or historical movement passes found in database for Roll No:{" "}
            <strong className="text-foreground">{rollNo}</strong>.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

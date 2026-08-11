import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Clock, FileText, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/explanations")({
  head: () => ({ meta: [{ title: "Submit Explanation — Student Portal" }] }),
  component: StudentExplanationsPage,
});

function getDeadlineStatus(deadlineIso: string) {
  const now = new Date().getTime();
  const deadline = new Date(deadlineIso).getTime();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return { expired: true, text: "Deadline Passed" };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { expired: false, text: `${hours} hours ${mins} mins remaining` };
}

const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "doc", "docx"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function StudentExplanationsPage() {
  const { reports, submitExplanation } = useCmadms();
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";

  const targetReport = reports.find(
    (r) => (r.studentId === rollNo || r.studentId === "23CSE1012") && r.status !== "Exonerated",
  );

  const [text, setText] = useState(targetReport?.explanation || "");
  const [fileName, setFileName] = useState(targetReport?.evidence || "");
  const [submitting, setSubmitting] = useState(false);

  const deadlineStatus = targetReport ? getDeadlineStatus(targetReport.explanationDeadline) : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("Invalid file format. Upload PDF, PNG, JPG, or DOC.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    setFileName(file.name);
    toast.success(`Attached evidence: ${file.name}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReport || !text.trim()) return;

    setSubmitting(true);

    window.setTimeout(() => {
      const res = submitExplanation(targetReport.id, text.trim(), fileName || undefined);
      setSubmitting(false);

      if (!res.success) {
        toast.error(res.error);
        return;
      }

      toast.success("Explanation Submitted!", {
        description: `Your response for Case ${targetReport.id} has been recorded for HOD review.`,
      });
    }, 500);
  };

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="Submit 24-Hour Explanation"
          description="Provide your official statement and evidence before the 24-hour deadline expires."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "Explanations" }]}
        />

        {targetReport ? (
          <form onSubmit={handleSubmit} className="card-surface p-6 rounded-2xl border border-border shadow-xs max-w-xl space-y-5">
            {/* Incident Header */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">INCIDENT CASE DETAILS</span>
              <h3 className="text-base font-bold text-foreground mt-0.5">{targetReport.id} &bull; {targetReport.className}</h3>
              <p className="text-xs text-muted-foreground mt-1">Incident Time: {targetReport.incidentTime} &bull; Room: {targetReport.room}</p>
            </div>

            {/* Real 24-Hour Deadline Banner */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              deadlineStatus?.expired
                ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}>
              <div className="flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                <span>Deadline Status: <strong>{deadlineStatus?.text}</strong></span>
              </div>
              <span className="text-[11px] opacity-80">
                Window: 24 Hours
              </span>
            </div>

            {deadlineStatus?.expired && (
              <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Submission Blocked:</strong> The 24-hour explanation deadline for this violation has passed. The HOD will proceed with case evaluation based on available faculty logs.
                </p>
              </div>
            )}

            {/* Official Statement */}
            <div className="space-y-1.5 pt-2 border-t border-divider">
              <Label htmlFor="explanation" className="text-xs font-semibold">Your Official Statement</Label>
              <Textarea
                id="explanation"
                rows={5}
                required
                disabled={deadlineStatus?.expired}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Explain why you were outside the classroom (e.g., Authorized by Lab Assistant to fetch practical components)..."
                className="text-xs rounded-xl"
              />
            </div>

            {/* File Upload Evidence */}
            <div className="space-y-1.5">
              <Label htmlFor="ev" className="text-xs font-semibold">Supporting Evidence (Max 5MB: PDF, PNG, JPG, DOC)</Label>
              <label
                htmlFor="ev"
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-background px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary ${
                  deadlineStatus?.expired ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <Upload className="size-4" />
                <span className="truncate">{fileName || "Upload signed pass copy, medical certificate, or lab slip"}</span>
              </label>
              <input
                id="ev"
                type="file"
                disabled={deadlineStatus?.expired}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            <Button
              type="submit"
              loading={submitting}
              disabled={deadlineStatus?.expired || !text.trim()}
              className="w-full h-10 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs"
            >
              Submit Official Explanation
            </Button>
          </form>
        ) : (
          <div className="card-surface p-8 rounded-2xl text-center text-xs text-muted-foreground max-w-xl">
            No pending violation reports requiring explanation.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

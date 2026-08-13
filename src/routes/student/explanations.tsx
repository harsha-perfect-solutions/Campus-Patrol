import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Clock, Download, Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { getMyViolationReportsApi, submitStudentExplanationApi } from "@/lib/api/student.server";
import type { DBViolationReport } from "@/lib/db/violations.server";

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
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";

  const [dbReports, setDbReports] = useState<DBViolationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadReports() {
      try {
        const res = await getMyViolationReportsApi();
        if (isMounted && res.success) {
          setDbReports(res.reports);
        }
      } catch (err) {
        console.error("Failed to load student violation reports:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReports();
    return () => {
      isMounted = false;
    };
  }, [rollNo]);

  // Find target report requiring explanation or under review (not resolved exonerated/warned/escalated)
  const targetReport = dbReports.find(
    (r) => r.status !== "exonerated" && r.status !== "warned" && r.status !== "escalated",
  );

  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (targetReport?.explanation) {
      setText(targetReport.explanation);
    }
    if (targetReport?.evidence) {
      setFileName(targetReport.evidence);
    }
  }, [targetReport]);

  const isAlreadySubmitted =
    Boolean(targetReport?.explanation) ||
    targetReport?.status === "explanation_submitted" ||
    targetReport?.status === "under_review";

  const deadlineStatus = targetReport
    ? getDeadlineStatus(targetReport.explanation_deadline || targetReport.created_at)
    : null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReport || !text.trim()) return;

    setSubmitting(true);
    try {
      const payload: { reportId: string; explanation: string; evidence?: string } = {
        reportId: targetReport.id,
        explanation: text.trim(),
      };
      if (fileName) {
        payload.evidence = fileName;
      }

      const res = await submitStudentExplanationApi({
        data: payload,
      });

      if (res.success && res.report) {
        toast.success("Explanation Submitted!", {
          description: `Your response for Case ${targetReport.id} has been recorded in PostgreSQL for HOD review.`,
        });
        setDbReports((prev) => prev.map((r) => (r.id === res.report!.id ? res.report! : r)));
      } else {
        toast.error(res.error || "Failed to record student explanation in database.");
      }
    } catch (err) {
      console.error("Failed to submit student explanation:", err);
      toast.error("Error saving explanation to database.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="Submit 24-Hour Explanation"
          description="Provide your official statement and evidence before the 24-hour deadline expires."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "Explanations" }]}
        />

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center max-w-xl text-xs text-muted-foreground">
            Loading violation case details...
          </div>
        ) : targetReport ? (
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs max-w-xl space-y-5">
            {/* Incident Header */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                INCIDENT CASE DETAILS
              </span>
              <h3 className="text-base font-bold text-foreground mt-0.5">
                {targetReport.id} &bull; {targetReport.class_name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Incident Time: {targetReport.incident_time} &bull; Room: {targetReport.room}
              </p>
            </div>

            {isAlreadySubmitted ? (
              <div className="space-y-4 pt-2 border-t border-divider">
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-3">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      EXPLANATION SUBMITTED & UNDER HOD REVIEW
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      Your official statement for Case <strong>{targetReport.id}</strong> has been
                      saved to the database and routed to your Department HOD.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Your Submitted Statement
                  </Label>
                  <blockquote className="text-xs text-foreground leading-relaxed italic bg-muted/40 p-3.5 rounded-xl border border-border">
                    "{targetReport.explanation}"
                  </blockquote>
                </div>

                {targetReport.evidence && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Attached Evidence Document
                    </Label>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="size-4 text-primary shrink-0" />
                        <span className="truncate text-xs font-semibold text-foreground">
                          {targetReport.evidence}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg text-xs h-8">
                        <Download className="size-3.5 mr-1" /> View Copy
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-semibold"
                  >
                    <Link to="/reports/$reportId" params={{ reportId: targetReport.id }}>
                      View Complete Case File & Status &rarr;
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 pt-2 border-t border-divider">
                {/* Real 24-Hour Deadline Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                    deadlineStatus?.expired
                      ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0" />
                    <span>
                      Deadline Status: <strong>{deadlineStatus?.text}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] opacity-80">Window: 24 Hours</span>
                </div>

                {deadlineStatus?.expired && (
                  <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-800 flex items-start gap-2.5">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <p>
                      <strong>Submission Blocked:</strong> The 24-hour explanation deadline for this
                      violation has passed. The HOD will proceed with case evaluation based on
                      available faculty logs.
                    </p>
                  </div>
                )}

                {/* Official Statement */}
                <div className="space-y-1.5">
                  <Label htmlFor="explanation" className="text-xs font-semibold">
                    Your Official Statement
                  </Label>
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
                  <Label htmlFor="ev" className="text-xs font-semibold">
                    Supporting Evidence (Max 5MB: PDF, PNG, JPG, DOC)
                  </Label>
                  <label
                    htmlFor="ev"
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-background px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary ${
                      deadlineStatus?.expired ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <Upload className="size-4" />
                    <span className="truncate">
                      {fileName || "Upload signed pass copy, medical certificate, or lab slip"}
                    </span>
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
            )}
          </div>
        ) : (
          <div className="card-surface p-8 rounded-2xl text-center text-xs text-muted-foreground max-w-xl">
            No pending violation reports requiring explanation for Roll No:{" "}
            <strong className="text-foreground">{rollNo}</strong>.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

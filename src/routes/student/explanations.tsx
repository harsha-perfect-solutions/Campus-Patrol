import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Paperclip,
  Upload,
  Camera,
  X,
  FileText,
  Image as ImageIcon,
  Check,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CameraModal } from "@/components/camera-modal";
import { useAuth } from "@/lib/auth";
import { downloadEvidenceImage } from "@/lib/download-evidence";
import { getMyViolationReportsApi, submitStudentExplanationApi } from "@/lib/api/student.server";
import type { DBViolationReport } from "@/lib/db/violations.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/explanations")({
  head: () => ({ meta: [{ title: "Submit Explanation — Student Portal" }] }),
  component: StudentExplanationsPage,
});

function getDeadlineStatus(deadlineIso?: string, createdAtIso?: string) {
  const now = new Date().getTime();
  let deadline = deadlineIso ? new Date(deadlineIso).getTime() : 0;
  if (!deadline && createdAtIso) {
    deadline = new Date(createdAtIso).getTime() + 24 * 60 * 60 * 1000;
  }
  if (!deadline) {
    return { expired: false, text: "24 hours remaining" };
  }

  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return { expired: true, text: "MEET THE HOD AT CABIN (24 Hours Exceeded)" };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { expired: false, text: `${hours} hours ${mins} mins remaining` };
}

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg"];
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

  // Target report needing explanation (excludes finalized cases)
  const targetReport = dbReports.find(
    (r) =>
      r.status !== "resolved" &&
      r.status !== "dismissed" &&
      r.status !== "exonerated" &&
      r.status !== "warned" &&
      r.status !== "escalated",
  );

  const [text, setText] = useState("");
  const [studentFileName, setStudentFileName] = useState("");
  const [studentFileDataUrl, setStudentFileDataUrl] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (targetReport?.explanation) {
      setText(targetReport.explanation);
    }
  }, [targetReport]);

  const isAlreadySubmitted =
    Boolean(targetReport?.explanation) ||
    targetReport?.status === "explanation_submitted" ||
    targetReport?.status === "under_review";

  const deadlineStatus = targetReport
    ? getDeadlineStatus(targetReport.explanation_deadline, targetReport.created_at)
    : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("Invalid file format. Only PNG, JPG, and JPEG image files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileSizeStr(`${sizeInMb} MB`);
    setStudentFileName(file.name);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setStudentFileDataUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      setStudentFileDataUrl(null);
    }

    toast.success(`Attached document: ${file.name}`);
  };

  const handleRemoveFile = () => {
    setStudentFileName("");
    setStudentFileDataUrl(null);
    setFileSizeStr(null);
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

      // Pass student uploaded data URL or file name as evidence payload
      if (studentFileDataUrl) {
        payload.evidence = studentFileDataUrl;
      } else if (studentFileName) {
        payload.evidence = studentFileName;
      }

      const res = await submitStudentExplanationApi({
        data: payload,
      });

      if (res.success && res.report) {
        toast.success("Explanation Submitted Successfully!", {
          description: `Your official statement for Case #${targetReport.id} has been recorded in PostgreSQL for Counselor review.`,
        });
        setDbReports((prev) => prev.map((r) => (r.id === res.report!.id ? res.report! : r)));
      } else {
        toast.error(res.error || "Failed to record student explanation.");
      }
    } catch (err: any) {
      console.error("Failed to submit student explanation:", err);
      toast.error("Error saving explanation to database.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6 pt-2">
        <PageHeader
          title="Submit Explanation"
          description="Provide your official statement and supporting evidence before the response deadline expires."
          breadcrumb={[{ label: "Student Portal", to: "/student/dashboard" }, { label: "Submit Explanation" }]}
        />

        {loading ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center max-w-2xl text-xs text-muted-foreground shadow-2xs">
            Loading violation case details...
          </div>
        ) : targetReport ? (
          <div className="card-surface p-4 sm:p-6 rounded-2xl border border-border shadow-xs max-w-2xl space-y-6">
            {/* Incident Summary Card */}
            <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between border-b border-divider pb-2">
                <span className="text-[11px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                  INCIDENT CASE DETAILS #{targetReport.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                  {targetReport.violation_type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Scheduled Subject</span>
                  <span className="font-bold text-foreground">{targetReport.class_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Location / Room</span>
                  <span className="font-bold text-foreground">{targetReport.location} ({targetReport.room})</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Incident Time</span>
                  <span className="font-bold text-foreground">{targetReport.incident_time}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Reported By</span>
                  <span className="font-bold text-foreground">{targetReport.reported_by}</span>
                </div>
              </div>
            </div>

            {/* Reporter Evidence Photo (If attached by Faculty) */}
            {targetReport.evidence && (
              <div className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      REPORTER EVIDENCE PHOTO ATTACHED
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-bold rounded-lg border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 gap-1.5 w-fit"
                    onClick={() => downloadEvidenceImage(targetReport.evidence!, targetReport.id)}
                  >
                    <Download className="size-3" /> Download Photo
                  </Button>
                </div>

                {targetReport.evidence.startsWith("data:") ? (
                  <div className="flex flex-col items-center gap-2 p-2 rounded-xl bg-background border border-blue-200/60">
                    <img
                      src={targetReport.evidence}
                      alt="Faculty evidence photo"
                      className="max-h-48 rounded-lg object-contain border border-border shadow-2xs"
                    />
                    <span className="text-[10px] text-muted-foreground">Official Observation Photo attached by {targetReport.reported_by}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-blue-200/60">
                    <span className="text-xs font-semibold text-foreground truncate">
                      Attached: {targetReport.evidence}
                    </span>
                  </div>
                )}
              </div>
            )}

            {isAlreadySubmitted ? (
              <div className="space-y-4 pt-2 border-t border-divider">
                <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-3 shadow-2xs">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      EXPLANATION SUBMITTED & UNDER COUNSELOR REVIEW
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      Your official statement for Case <strong>#{targetReport.id}</strong> has been
                      saved to the database and routed to your assigned Class Counselor.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Your Submitted Statement
                  </Label>
                  <blockquote className="text-xs text-foreground leading-relaxed italic bg-muted/40 p-4 rounded-2xl border border-border font-medium">
                    "{targetReport.explanation}"
                  </blockquote>
                </div>

                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-bold h-9"
                  >
                    <Link to="/student/violations">
                      View All Incident Records & Status &rarr;
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 pt-2 border-t border-divider">
                {/* 24-Hour Deadline Status Banner */}
                <div
                  className={cn(
                    "p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-semibold shadow-2xs",
                    deadlineStatus?.expired
                      ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Response Deadline Status: <strong>{deadlineStatus?.text}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold opacity-80 uppercase">Window: 24 Hours</span>
                </div>

                {deadlineStatus?.expired && (
                  <div className="rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-900 dark:text-red-200 flex items-start gap-3 shadow-2xs">
                    <AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-sm uppercase tracking-wide text-red-700 dark:text-red-300">
                        24 Hours Exceeded — Meet HOD at Cabin!
                      </p>
                      <p className="mt-1 font-medium leading-relaxed">
                        You did not submit an explanation within the 24-hour response window for Case <strong>#{targetReport.id}</strong>. Online submission is now locked. Please report directly to the <strong>HOD Cabin</strong> to present your explanation in person.
                      </p>
                    </div>
                  </div>
                )}

                {/* Official Statement Input */}
                <div className="space-y-2">
                  <Label htmlFor="explanation" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Your Official Explanation Statement *
                  </Label>
                  <Textarea
                    id="explanation"
                    rows={5}
                    required
                    disabled={deadlineStatus?.expired}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Provide an accurate, honest statement explaining your presence outside class during this scheduled period (e.g., Authorized by Lab Assistant Sharma to fetch practical components from Room C-202)..."
                    className="text-xs rounded-xl leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Min 10 characters required</span>
                    <span>{text.length} / 2000 chars</span>
                  </div>
                </div>

                {/* Supporting Document / Evidence Upload Dropzone */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Attach Supporting Evidence / Permission Slip (Optional)
                  </Label>

                  {studentFileName || studentFileDataUrl ? (
                    /* Attached File Card */
                    <div className="p-4 rounded-2xl border border-primary/40 bg-primary/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          {studentFileDataUrl ? (
                            <img
                              src={studentFileDataUrl}
                              alt="Attached preview"
                              className="size-12 rounded-xl object-cover border border-primary/30 shrink-0"
                            />
                          ) : (
                            <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                              <FileText className="size-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-foreground block truncate">
                              {studentFileName || "Captured Photo Evidence"}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {fileSizeStr ? `Size: ${fileSizeStr} • ` : ""}Ready to submit
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl"
                          onClick={handleRemoveFile}
                        >
                          <X className="size-3.5 mr-1" /> Remove File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Upload Dropzone & Camera Launcher */
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* File Upload Dropzone */}
                        <label
                          htmlFor="student-ev-upload"
                          className={cn(
                            "sm:col-span-2 flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-input bg-background p-4 text-center text-xs transition-colors hover:border-primary hover:bg-muted/30 shadow-2xs",
                            deadlineStatus?.expired && "opacity-50 pointer-events-none",
                          )}
                        >
                          <div className="flex items-center gap-2 font-bold text-foreground">
                            <Upload className="size-4 text-primary" />
                            <span>Upload Permission Slip / Document</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            PNG, JPG, or JPEG (Max 5MB)
                          </span>
                        </label>
                        <input
                          id="student-ev-upload"
                          type="file"
                          disabled={deadlineStatus?.expired}
                          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                          className="sr-only"
                          onChange={handleFileChange}
                        />

                        {/* Camera Capture Option */}
                        <Button
                          type="button"
                          variant="outline"
                          disabled={deadlineStatus?.expired}
                          className="h-auto min-h-[72px] rounded-2xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 flex flex-col items-center justify-center gap-1.5 p-3 text-xs font-bold"
                          onClick={() => setCameraOpen(true)}
                        >
                          <Camera className="size-4" />
                          <span>Take Photo</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  loading={submitting}
                  disabled={submitting || deadlineStatus?.expired || text.trim().length < 10}
                  className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground text-xs shadow-xs"
                >
                  {submitting
                    ? "Submitting Explanation..."
                    : deadlineStatus?.expired
                    ? "Meet HOD at Cabin (24 Hours Exceeded)"
                    : "Submit Official Explanation to Counselor"}
                </Button>
              </form>
            )}
          </div>
        ) : (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground max-w-2xl shadow-2xs">
            No pending violation reports requiring explanation statement for Roll No:{" "}
            <strong className="text-foreground">{rollNo}</strong>.
          </div>
        )}

        {/* Camera Capture Modal */}
        <CameraModal
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl, filename) => {
            setStudentFileDataUrl(dataUrl);
            setStudentFileName(filename);
            setFileSizeStr("Snapshot Photo");
            toast.success(`Photo snapshot attached: ${filename}`);
          }}
        />
      </div>
    </RoleGuard>
  );
}

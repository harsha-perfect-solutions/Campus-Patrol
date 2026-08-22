import { useState, useEffect } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  MapPin,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  UserRound,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getHodCaseByIdApi, submitHodDecisionApi } from "@/lib/api/hod.server";
import { getViolationReportDetailApi } from "@/lib/api/faculty.server";
import { submitStudentExplanationApi } from "@/lib/api/student.server";
import type { Report, TimelineEvent } from "@/lib/cmadms-data";

export const Route = createFileRoute("/reports/$reportId")({
  head: ({ params }) => ({
    meta: [
      { title: `Case ${params.reportId} — CMADMS` },
      {
        name: "description",
        content: `Case management view for unauthorized movement report ${params.reportId}.`,
      },
      { property: "og:title", content: `Case ${params.reportId} — CMADMS` },
      {
        property: "og:description",
        content: "Full case detail: student, incident, timetable, explanation and decision.",
      },
    ],
  }),
  component: ReportDetail,
});

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
      <div className="flex items-center gap-2 border-b border-divider px-5 py-3.5 bg-muted/20">
        <Icon className="size-[18px] text-primary" aria-hidden />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div
          key={k}
          className="flex items-start justify-between gap-4 border-b border-divider pb-2.5"
        >
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="text-right text-xs font-semibold text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const toneStyles: Record<TimelineEvent["tone"], string> = {
  info: "bg-info-soft text-info border-info/30",
  violation: "bg-destructive-soft text-destructive border-destructive/30",
  resolved: "bg-success-soft text-success border-success/30",
  pending: "bg-warning-soft text-warning border-warning/30",
};

export function ReportDetail() {
  const params = useParams({ strict: false }) as { reportId?: string };
  const reportId = params?.reportId;
  const { reports: storeReports, updateReport, executeHodDecision } = useCmadms();
  const { role, profile } = useAuth();

  const [dbReport, setDbReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const [hodAction, setHodAction] = useState<"excuse" | "warning" | "violation">("excuse");
  const [hodNotes, setHodNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [submittingExplanation, setSubmittingExplanation] = useState(false);
  const [studentText, setStudentText] = useState("");

  const activeStoreReport = storeReports.find((r) => r.id === reportId);
  const report = dbReport || activeStoreReport;

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 300);
  };

  const handleDownloadEvidence = (evidenceStr: string, idStr: string) => {
    if (!evidenceStr) return;

    try {
      if (evidenceStr.startsWith("data:")) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const pngUrl = canvas.toDataURL("image/png");
            triggerDownload(pngUrl, `evidence_${idStr}.png`);
            toast.success("Evidence photo downloaded in PNG format (.png)");
          } else {
            triggerDownload(evidenceStr, `evidence_${idStr}.png`);
            toast.success("Evidence photo downloaded!");
          }
        };
        img.onerror = () => {
          triggerDownload(evidenceStr, `evidence_${idStr}.png`);
          toast.success("Evidence photo downloaded!");
        };
        img.src = evidenceStr;
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = 900;
        canvas.height = 550;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, 900, 550);
          ctx.fillStyle = "#2563eb";
          ctx.fillRect(0, 0, 900, 10);

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 26px sans-serif";
          ctx.fillText("CAMPUS GUARD PRO — EVIDENCE RECORD", 40, 60);

          ctx.font = "14px sans-serif";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(`Case Report ID: ${idStr}`, 40, 110);
          ctx.fillText(`Attached File Name: ${evidenceStr}`, 40, 140);
          ctx.fillText(`Timestamp: ${new Date().toLocaleString()}`, 40, 170);

          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(40, 200, 820, 280);
          ctx.fillStyle = "#64748b";
          ctx.font = "italic 15px sans-serif";
          ctx.fillText(`Official Disciplinary Evidence Document (${evidenceStr})`, 60, 240);

          ctx.fillStyle = "#94a3b8";
          ctx.font = "13px sans-serif";
          ctx.fillText("Verified by Campus Security Management & Discipline System (CMADMS)", 60, 440);

          const pngUrl = canvas.toDataURL("image/png");
          const cleanName = evidenceStr.replace(/\.[^/.]+$/, "");
          triggerDownload(pngUrl, `${cleanName}_${idStr}.png`);
          toast.success(`Downloaded evidence document in PNG format (.png)`);
        }
      }
    } catch (err) {
      console.error("Evidence download error:", err);
      toast.error("Failed to download evidence.");
    }
  };

  useEffect(() => {
    if (!reportId) return;
    let isMounted = true;

    async function loadReportDetail() {
      try {
        const res = await getViolationReportDetailApi({ data: { reportId: reportId! } });
        if (isMounted && res.success && res.report) {
          const r = res.report;
          const mapped: Report = {
            id: r.id,
            studentName: r.student_name,
            studentId: r.student_code,
            department: r.department,
            departmentHod: profile?.full_name || "Dr. Anjali Rao",
            yearSection: r.year_section,
            className: r.class_name,
            scheduledTime: r.scheduled_time,
            room: r.room,
            incidentTime: r.incident_time,
            location: r.location,
            remarks: r.remarks,
            evidence: r.evidence ?? undefined,
            reportedBy: r.reported_by,
            createdAt:
              (r.created_at as unknown) instanceof Date
                ? (r.created_at as unknown as Date).toISOString()
                : String(r.created_at),
            explanationDeadline: r.explanation_deadline
              ? (r.explanation_deadline as unknown) instanceof Date
                ? (r.explanation_deadline as unknown as Date).toISOString()
                : String(r.explanation_deadline)
              : (r.created_at as unknown) instanceof Date
                ? (r.created_at as unknown as Date).toISOString()
                : String(r.created_at),
            status: r.status as any,
            explanation: r.explanation ?? undefined,
            explanationSubmittedAt: r.explanation_submitted_at
              ? (r.explanation_submitted_at as unknown) instanceof Date
                ? (r.explanation_submitted_at as unknown as Date).toISOString()
                : String(r.explanation_submitted_at)
              : undefined,
            decision: r.decision ?? undefined,
            decisionBy: r.decision_by ?? undefined,
            decisionAt: r.decision_at
              ? (r.decision_at as unknown) instanceof Date
                ? (r.decision_at as unknown as Date).toISOString()
                : String(r.decision_at)
              : undefined,
            semester: r.semester,
            timeline: [
              {
                time:
                  (r.created_at as unknown) instanceof Date
                    ? (r.created_at as unknown as Date).toISOString()
                    : String(r.created_at),
                title: "Violation Reported",
                detail: `Reported by ${r.reported_by} at ${r.location}`,
                tone: "violation",
              },
            ],
          };

          if (r.explanation) {
            mapped.timeline.push({
              time: r.explanation_submitted_at
                ? (r.explanation_submitted_at as unknown) instanceof Date
                  ? (r.explanation_submitted_at as unknown as Date).toISOString()
                  : String(r.explanation_submitted_at)
                : (r.created_at as unknown) instanceof Date
                  ? (r.created_at as unknown as Date).toISOString()
                  : String(r.created_at),
              title: "Student explanation submitted",
              detail: r.explanation,
              tone: "info",
            });
          }

          if (r.decision) {
            mapped.timeline.push({
              time: r.decision_at
                ? (r.decision_at as unknown) instanceof Date
                  ? (r.decision_at as unknown as Date).toISOString()
                  : String(r.decision_at)
                : (r.created_at as unknown) instanceof Date
                  ? (r.created_at as unknown as Date).toISOString()
                  : String(r.created_at),
              title: `HOD Decision: ${r.status}`,
              detail: `${r.decision_by || "HOD"}: ${r.decision}`,
              tone: r.status === "exonerated" ? "resolved" : "violation",
            });
          }

          setDbReport(mapped);
        }
      } catch (err) {
        console.error("Failed to load report detail from PostgreSQL:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReportDetail();
    return () => {
      isMounted = false;
    };
  }, [reportId, profile?.full_name]);

  if (loading && !report) {
    return (
      <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
        Loading case file detail...
      </div>
    );
  }

  if (!report) {
    return (
      <section className="card-surface p-8 rounded-2xl">
        <EmptyState
          icon={FileText}
          title="Case not found"
          description={`No violation report exists with the ID ${reportId}.`}
          action={
            <Button asChild>
              <Link to="/reports">Back to Reports</Link>
            </Button>
          }
        />
      </section>
    );
  }

  const handleHodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDecision(true);
    const decisionEnum: "exonerated" | "warned" | "escalated" =
      hodAction === "excuse" ? "exonerated" : hodAction === "warning" ? "warned" : "escalated";
    const decisionKey =
      hodAction === "excuse" ? "exonerate" : hodAction === "warning" ? "warning" : "escalate";
    const hodName = profile?.full_name || "Dr. Anjali Rao (HOD)";

    try {
      const res = await submitHodDecisionApi({
        data: {
          reportId: report.id,
          decision: decisionEnum,
          decisionText: hodNotes || `Decision executed: ${hodAction}`,
        },
      });

      executeHodDecision(report.id, decisionKey, hodNotes, hodName);

      if (res.success && res.report) {
        setDbReport((prev) =>
          prev
            ? {
                ...prev,
                status: res.report!.status as any,
                decision: res.report!.decision ?? undefined,
                decisionBy: res.report!.decision_by ?? undefined,
                decisionAt: res.report!.decision_at ?? undefined,
              }
            : null,
        );
      }

      setSubmittingDecision(false);
      toast.success("HOD Decision Recorded", {
        description: `Case ${report.id} updated and saved to PostgreSQL.`,
      });
    } catch (err) {
      console.error("Failed to submit HOD decision:", err);
      toast.error("Failed to record HOD decision in database.");
      setSubmittingDecision(false);
    }
  };

  const isHodUser =
    role === "hod" ||
    role === "admin" ||
    (profile?.staff_code ? profile.staff_code.includes("HOD") : false);
  const isStudentUser = role === "student";

  const handleExportPDF = () => {
    try {
      toast.dismiss();
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to launch PDF document print dialog.");
    }
  };

  const handleExportExcel = () => {
    try {
      const headers = [
        "Case Report ID",
        "Student Name",
        "Roll Number",
        "Department",
        "Year & Section",
        "Semester",
        "Case Status",
        "Report Date",
        "Incident Time",
        "Observed Location",
        "Reported By Faculty",
        "Scheduled Class",
        "Class Time Slot",
        "Assigned Room",
        "Faculty Remarks",
        "Student Explanation",
        "HOD Decision",
        "Decision By",
      ];

      const row = [
        `"${report.id}"`,
        `"${report.studentName}"`,
        `"${report.studentId}"`,
        `"${report.department}"`,
        `"${report.yearSection}"`,
        `"${report.semester || 6}"`,
        `"${report.status}"`,
        `"${report.createdAt}"`,
        `"${report.incidentTime}"`,
        `"${report.location}"`,
        `"${report.reportedBy}"`,
        `"${report.className}"`,
        `"${report.scheduledTime}"`,
        `"${report.room}"`,
        `"${(report.remarks || "").replace(/"/g, '""')}"`,
        `"${(report.explanation || "N/A").replace(/"/g, '""')}"`,
        `"${(report.decision || "N/A").replace(/"/g, '""')}"`,
        `"${(report.decisionBy || "N/A").replace(/"/g, '""')}"`,
      ];

      const csvContent = "\uFEFF" + headers.join(",") + "\n" + row.join(",") + "\n";
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `case_report_${report.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Excel (.csv) Case Report Downloaded!", {
        description: `Saved case_report_${report.id}.csv to your downloads folder.`,
      });
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to generate Excel report.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Print & PDF Export Letterhead */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              CAMPUSGUARD PRO — OFFICIAL CASE REPORT
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Campus Movement & Discipline Management System (CMADMS)
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-slate-900">CASE FILE: {report.id}</p>
            <p className="text-slate-600">Report Date: {new Date(report.createdAt).toLocaleDateString("en-IN")}</p>
            <p className="text-slate-600">Status: {String(report.status || "").toUpperCase()}</p>
          </div>
        </div>
      </div>

      <PageHeader
        title={report.id}
        description="Unauthorized Movement — Case Review & HOD Decision View"
        breadcrumb={[
          { label: "Home", to: "/" },
          { label: "Reports", to: "/reports" },
          { label: report.id },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} />
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExportExcel}
              className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="size-4" />
              <span>Export Excel</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="rounded-xl font-semibold gap-1.5"
            >
              <Printer className="size-3.5" />
              <span>Print PDF</span>
            </Button>
            <Button variant="ghost" size="sm" asChild className="rounded-xl">
              <Link to="/reports">
                <ArrowLeft className="size-3.5 mr-1" /> Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Section title="Student Information" icon={UserRound}>
            <Facts
              items={[
                ["Student Name", report.studentName],
                ["Roll Number", report.studentId],
                ["Department", report.department],
                ["Year & Section", report.yearSection],
              ]}
            />
          </Section>

          <Section title="Incident Details" icon={MapPin}>
            <Facts
              items={[
                ["Incident Time", report.incidentTime],
                ["Observed Location", report.location],
                ["Reported By Faculty", report.reportedBy],
                ["Report Date", report.createdAt],
              ]}
            />
          </Section>

          <Section title="Timetable Schedule" icon={CalendarClock}>
            {report.className === "No Class Scheduled" || report.scheduledTime === "No Class Scheduled" ? (
              <div className="py-2 text-xs font-semibold text-muted-foreground italic">
                No class was scheduled at the time of the reported incident.
              </div>
            ) : (
              <Facts
                items={[
                  ["Scheduled Class", report.className],
                  ["Class Time Slot", report.scheduledTime],
                  ["Assigned Room", report.room],
                  ["Classroom Attendance", "Marked Absent"],
                ]}
              />
            )}
          </Section>

          <Section title="Faculty Report Remarks" icon={FileText}>
            <p className="text-xs leading-relaxed text-foreground bg-muted/30 p-3.5 rounded-xl border border-divider">
              "{report.remarks}"
            </p>
          </Section>

          <Section title="Faculty Incident Evidence Photo / File" icon={Paperclip}>
            {report.evidence ? (
              <div className="space-y-4">
                {report.evidence.startsWith("data:") && (
                  <div className="overflow-hidden rounded-xl border border-border bg-slate-950 aspect-video max-h-[340px] relative group flex items-center justify-center">
                    <img
                      src={report.evidence}
                      alt="Faculty incident evidence photo"
                      className="w-full h-full object-contain"
                    />
                    <a
                      href={report.evidence}
                      download={`evidence_faculty_${report.id}.png`}
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-md no-underline border border-slate-700"
                    >
                      <Download className="size-3.5" />
                      <span>Download Faculty Photo</span>
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 bg-card">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Paperclip className="size-4 text-primary shrink-0" />
                    <span className="truncate text-xs font-semibold text-foreground">
                      {report.evidence.startsWith("data:") ? `faculty_evidence_photo_${report.id}.jpg` : report.evidence}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-9 px-3.5 font-semibold gap-1.5 border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-2xs shrink-0"
                    onClick={() => handleDownloadEvidence(report.evidence!, report.id)}
                  >
                    <Download className="size-3.5" />
                    <span>Download Faculty Evidence (.png)</span>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No evidence photos attached by faculty to this incident report.</p>
            )}
          </Section>

          {/* Student Explanation Section */}
          <Section title="Student 24-Hour Explanation & Supporting Evidence" icon={MessageSquare}>
            {report.explanation ? (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Student Official Statement
                    </span>
                    {report.explanationSubmittedAt && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Submitted: {new Date(report.explanationSubmittedAt).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <blockquote className="text-xs text-foreground leading-relaxed italic bg-background/90 p-3.5 rounded-xl border border-emerald-200/60 font-medium shadow-2xs">
                    "{report.explanation}"
                  </blockquote>
                </div>

                {report.evidence && (
                  <div className="pt-2 border-t border-emerald-200/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                        <Paperclip className="size-3.5 text-primary" />
                        Student Supporting Evidence Attachment
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                        onClick={() => handleDownloadEvidence(report.evidence!, report.id)}
                      >
                        <Download className="size-3" /> Download Student Evidence
                      </Button>
                    </div>

                    {report.evidence.startsWith("data:") ? (
                      <div className="p-3 rounded-xl bg-background border border-border flex flex-col items-center gap-2">
                        <img
                          src={report.evidence}
                          alt="Student supporting evidence photo"
                          className="max-h-60 w-auto rounded-lg object-contain border border-border shadow-2xs"
                        />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          📷 Official Supporting Attachment submitted by Student
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                        <span className="text-xs font-semibold text-foreground truncate">
                          📎 Attached: {report.evidence}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-bold rounded-lg"
                          onClick={() => handleDownloadEvidence(report.evidence!, report.id)}
                        >
                          <Download className="size-3 mr-1" /> Download (.png)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : isStudentUser ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">
                  An explanation is required for this movement incident. Please submit your
                  statement and attach any supporting documents (e.g. Lab Slip, Medical Pass) via
                  the <strong>Submit 24-Hour Explanation</strong> portal section.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                >
                  <Link to="/student/explanations">Go to Submit 24-Hour Explanation &rarr;</Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Awaiting student explanation (24-hour response window active).
              </p>
            )}
          </Section>

          {/* HOD Review & Decision Section */}
          <Section title="HOD Case Decision & Actions" icon={ShieldCheck}>
            {report.decision ? (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  DECISION RECORDED BY HOD
                </span>
                <p className="mt-1 text-xs font-semibold text-foreground leading-relaxed">
                  {report.decision}
                </p>
              </div>
            ) : isHodUser ? (
              <form onSubmit={handleHodSubmit} className="space-y-4">
                <p className="text-xs text-muted-foreground font-medium">
                  Select your HOD decision for case{" "}
                  <strong className="text-foreground">{report.id}</strong>:
                </p>

                <div className="grid gap-2.5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setHodAction("excuse")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-xs font-bold transition-all text-center",
                      hodAction === "excuse"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs"
                        : "border-border hover:bg-accent text-muted-foreground",
                    )}
                  >
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span>Excuse / Pass Valid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHodAction("warning")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-xs font-bold transition-all text-center",
                      hodAction === "warning"
                        ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 shadow-xs"
                        : "border-border hover:bg-accent text-muted-foreground",
                    )}
                  >
                    <AlertTriangle className="size-5 text-amber-600" />
                    <span>Issue Warning</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHodAction("violation")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-xs font-bold transition-all text-center",
                      hodAction === "violation"
                        ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 shadow-xs"
                        : "border-border hover:bg-accent text-muted-foreground",
                    )}
                  >
                    <ShieldCheck className="size-5 text-red-600" />
                    <span>Confirm Penalty</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hodNotes" className="text-xs font-semibold">
                    HOD Remarks / Decision Notes
                  </Label>
                  <Textarea
                    id="hodNotes"
                    value={hodNotes}
                    onChange={(e) => setHodNotes(e.target.value)}
                    placeholder="Enter reason or instructions for the student record..."
                    className="text-xs rounded-xl"
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  loading={submittingDecision}
                  disabled={submittingDecision}
                  className="bg-primary text-primary-foreground font-semibold rounded-xl w-full h-10 shadow-xs"
                >
                  {submittingDecision ? "Submitting Decision..." : "Submit HOD Decision"}
                </Button>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground">
                Awaiting review and final decision by Department Head.
              </p>
            )}
          </Section>
        </div>

        {/* Right Sidebar: Timeline */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Section title="Case Audit Timeline" icon={GraduationCap}>
            <ol className="space-y-4">
              {report.timeline.map((e, i) => (
                <li key={`${e.time}-${i}`} className="relative flex gap-3">
                  {i !== report.timeline.length - 1 && (
                    <span
                      className="absolute left-[7px] top-4 h-full w-px bg-divider"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "z-10 mt-1 size-4 shrink-0 rounded-full border-2",
                      toneStyles[e.tone],
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold text-muted-foreground">
                      {e.time}
                    </span>
                    <span className="block text-xs font-bold text-foreground">{e.title}</span>
                    {e.detail && (
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        {e.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </aside>
      </div>
    </div>
  );
}

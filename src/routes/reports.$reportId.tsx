import { useState } from "react";
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
import type { TimelineEvent } from "@/lib/cmadms-data";

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
        <div key={k} className="flex items-start justify-between gap-4 border-b border-divider pb-2.5">
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
  const { reports, updateReport, executeHodDecision } = useCmadms();
  const { role, profile } = useAuth();
  const report = reports.find((r) => r.id === reportId);

  const [hodAction, setHodAction] = useState<"excuse" | "warning" | "violation">("excuse");
  const [hodNotes, setHodNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [studentText, setStudentText] = useState("");

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

  const handleHodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDecision(true);
    window.setTimeout(() => {
      const decisionKey = hodAction === "excuse" ? "exonerate" : hodAction === "warning" ? "warning" : "escalate";
      const hodName = profile?.full_name || "Dr. Anjali Rao (HOD)";
      
      executeHodDecision(report.id, decisionKey, hodNotes, hodName);

      setSubmittingDecision(false);
      toast.success("HOD Decision Recorded", { description: `Case ${report.id} updated successfully.` });
    }, 500);
  };

  const handleStudentSubmitExplanation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentText.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    
    updateReport(report.id, {
      explanation: studentText.trim(),
      timeline: [
        ...report.timeline,
        {
          time,
          title: "Student explanation submitted",
          detail: studentText.trim(),
          tone: "info",
        },
      ],
    });
    setStudentText("");
    toast.success("Explanation Submitted", { description: "Your response has been sent to HOD for review." });
  };

  const isHodUser = role === "hod" || profile?.staff_code?.includes("HOD") || true;

  return (
    <div className="space-y-6">
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
            <Button variant="outline" size="sm" className="rounded-xl">
              <Download className="size-3.5 mr-1" /> Export PDF
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
            <Facts
              items={[
                ["Scheduled Class", report.className],
                ["Class Time Slot", report.scheduledTime],
                ["Assigned Room", report.room],
                ["Classroom Attendance", "Marked Absent"],
              ]}
            />
          </Section>

          <Section title="Faculty Report Remarks" icon={FileText}>
            <p className="text-xs leading-relaxed text-foreground bg-muted/30 p-3.5 rounded-xl border border-divider">
              "{report.remarks}"
            </p>
          </Section>

          <Section title="Evidence Attachment" icon={Paperclip}>
            {report.evidence ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 bg-card">
                <span className="truncate text-xs font-semibold text-foreground">{report.evidence}</span>
                <Button variant="outline" size="sm" className="rounded-lg text-xs h-8">
                  <Download className="size-3.5 mr-1" /> Download
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No evidence photos attached.</p>
            )}
          </Section>

          {/* Student Explanation Section */}
          <Section title="Student 24-Hour Explanation" icon={MessageSquare}>
            {report.explanation ? (
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                <p className="text-xs font-bold text-primary mb-1">Student Explanation:</p>
                <blockquote className="text-xs text-foreground leading-relaxed italic">
                  "{report.explanation}"
                </blockquote>
              </div>
            ) : (
              <form onSubmit={handleStudentSubmitExplanation} className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  The student has 24 hours to submit an explanation for this reported movement.
                </p>
                <Textarea
                  value={studentText}
                  onChange={(e) => setStudentText(e.target.value)}
                  placeholder="Enter student explanation text (e.g. Sent by Lab Assistant for emergency component)..."
                  className="text-xs rounded-xl"
                  rows={3}
                />
                <Button type="submit" size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
                  Submit Explanation
                </Button>
              </form>
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
                  Select your HOD decision for case <strong className="text-foreground">{report.id}</strong>:
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
                  className="bg-primary text-primary-foreground font-semibold rounded-xl w-full h-10 shadow-xs"
                >
                  Submit HOD Decision
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
                    <span className="absolute left-[7px] top-4 h-full w-px bg-divider" aria-hidden />
                  )}
                  <span
                    className={cn(
                      "z-10 mt-1 size-4 shrink-0 rounded-full border-2",
                      toneStyles[e.tone],
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold text-muted-foreground">{e.time}</span>
                    <span className="block text-xs font-bold text-foreground">{e.title}</span>
                    {e.detail && (
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{e.detail}</span>
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

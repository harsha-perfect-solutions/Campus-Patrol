import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileText,
  GraduationCap,
  MapPin,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";
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
    <section className="card-surface">
      <div className="flex items-center gap-2 border-b border-divider px-5 py-3.5">
        <Icon className="size-[18px] text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-medium text-foreground">{v}</dd>
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

function ReportDetail() {
  const { reportId } = Route.useParams();
  const { reports } = useCmadms();
  const report = reports.find((r) => r.id === reportId);

  if (!report) {
    return (
      <section className="card-surface">
        <EmptyState
          icon={FileText}
          title="Case not found"
          description={`No violation report exists with the ID ${reportId}.`}
          action={
            <Button asChild>
              <Link to="/reports">Back to My Reports</Link>
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <>
      <PageHeader
        title={report.id}
        description="Unauthorized Movement — case management view"
        breadcrumb={[
          { label: "Home", to: "/" },
          { label: "My Reports", to: "/reports" },
          { label: report.id },
        ]}
        actions={
          <>
            <StatusBadge status={report.status} />
            <Button variant="outline" size="sm">
              <Download /> Export
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/reports">
                <ArrowLeft /> Back
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Section title="Student Information" icon={UserRound}>
            <Facts
              items={[
                ["Student", report.studentName],
                ["Student ID", report.studentId],
                ["Department", report.department],
                ["Year / Section", report.yearSection],
              ]}
            />
          </Section>

          <Section title="Incident Information" icon={MapPin}>
            <Facts
              items={[
                ["Incident Time", report.incidentTime],
                ["Location", report.location],
                ["Reported By", report.reportedBy],
                ["Created", report.createdAt],
              ]}
            />
          </Section>

          <Section title="Timetable Information" icon={CalendarClock}>
            <Facts
              items={[
                ["Scheduled Class", report.className],
                ["Scheduled Time", report.scheduledTime],
                ["Room", report.room],
                ["Attendance", "Marked absent"],
              ]}
            />
          </Section>

          <Section title="Faculty Report" icon={FileText}>
            <p className="text-sm leading-relaxed text-muted-foreground">{report.remarks}</p>
          </Section>

          <Section title="Evidence" icon={Paperclip}>
            {report.evidence ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <span className="truncate text-sm text-foreground">{report.evidence}</span>
                <Button variant="ghost" size="sm">
                  <Download /> Download
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No evidence attached to this case.</p>
            )}
          </Section>

          <Section title="Student Explanation" icon={MessageSquare}>
            {report.explanation ? (
              <blockquote className="rounded-xl border-l-2 border-primary bg-accent px-4 py-3 text-sm text-accent-foreground">
                {report.explanation}
              </blockquote>
            ) : (
              <p className="text-sm text-muted-foreground">
                The student has not submitted an explanation yet.
              </p>
            )}
          </Section>

          <Section title="HOD Decision" icon={ShieldCheck}>
            {report.decision ? (
              <p className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-foreground">
                {report.decision}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Awaiting a decision from the department head.
              </p>
            )}
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Section title="Case Timeline" icon={GraduationCap}>
            <ol>
              {report.timeline.map((e, i) => (
                <li key={`${e.time}-${i}`} className="relative flex gap-3 pb-6 last:pb-0">
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
                    <span className="block text-xs font-medium text-subtle-foreground">{e.time}</span>
                    <span className="block text-sm font-medium text-foreground">{e.title}</span>
                    {e.detail && (
                      <span className="block text-xs text-muted-foreground">{e.detail}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </aside>
      </div>
    </>
  );
}

export const _unusedNotFound = notFound;

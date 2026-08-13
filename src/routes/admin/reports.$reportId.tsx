import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Clock, Eye, FileText, GraduationCap, ShieldCheck, User } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";

export const Route = createFileRoute("/admin/reports/$reportId")({
  head: ({ params }) => ({ meta: [{ title: `Case ${params.reportId} — Admin Audit View` }] }),
  component: AdminReportDetailPage,
});

function AdminReportDetailPage() {
  const params = useParams({ strict: false }) as { reportId?: string };
  const reportId = params?.reportId;
  const { reports } = useCmadms();
  const report = reports.find((r) => r.id === reportId);

  if (!report) {
    return (
      <RoleGuard allowedRoles={["admin"]}>
        <div className="card-surface p-8 rounded-2xl text-center text-xs text-muted-foreground">
          Case file {reportId} not found in master records.
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title={`Case File Audit — ${report.id}`}
          description={`System Monitoring Record • Student: ${report.studentName} (${report.studentId}) • Department: ${report.department}`}
          breadcrumb={[
            { label: "Admin", to: "/admin/dashboard" },
            { label: "Reported Cases", to: "/admin/reports" },
            { label: report.id },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl text-xs font-semibold"
            >
              <Link to="/admin/reports">
                <ArrowLeft className="size-3.5 mr-1" /> Back to Cases List
              </Link>
            </Button>
          }
        />

        {/* System Monitoring Banner */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-xs flex items-center justify-between text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-blue-600 shrink-0" />
            <span>
              <strong>System Audit Access:</strong> You are viewing this case as System
              Administrator. Disciplinary decisions are executed by Department HOD (
              <strong>{report.departmentHod}</strong>).
            </span>
          </div>
          <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-3 py-1 font-bold text-[11px] text-blue-700 dark:text-blue-300">
            {report.status}
          </span>
        </div>

        {/* Case File Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Student & Incident Summary */}
          <div className="space-y-6">
            <section className="card-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-divider pb-3">
                <GraduationCap className="size-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  STUDENT INFORMATION
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Student Name</dt>
                  <dd className="font-bold text-foreground">{report.studentName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Roll Number / ID</dt>
                  <dd className="font-bold text-foreground">{report.studentId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="font-bold text-foreground">{report.department}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Year / Section</dt>
                  <dd className="font-bold text-foreground">{report.yearSection}</dd>
                </div>
              </dl>
            </section>

            <section className="card-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-divider pb-3">
                <FileText className="size-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  INCIDENT REPORT DETAILS
                </span>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subject / Class</dt>
                  <dd className="font-bold text-foreground">{report.className}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Incident Time</dt>
                  <dd className="font-bold text-foreground">{report.incidentTime}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Location Found</dt>
                  <dd className="font-bold text-foreground">{report.location}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Reporting Faculty</dt>
                  <dd className="font-bold text-foreground">{report.reportedBy}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Department HOD</dt>
                  <dd className="font-bold text-foreground">{report.departmentHod}</dd>
                </div>
              </dl>

              <div className="pt-3 border-t border-divider text-xs">
                <span className="text-muted-foreground block text-[11px] font-semibold">
                  Faculty Remarks:
                </span>
                <p className="text-foreground mt-1 bg-muted/40 p-3 rounded-xl leading-relaxed">
                  {report.remarks}
                </p>
              </div>
            </section>
          </div>

          {/* Right Column: Student Statement & Timeline */}
          <div className="space-y-6">
            <section className="card-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-divider pb-3">
                <Clock className="size-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  STUDENT 24-HR EXPLANATION
                </span>
              </div>

              {report.explanation ? (
                <div className="text-xs space-y-2">
                  <span className="text-emerald-600 font-bold block">Statement Submitted:</span>
                  <p className="bg-emerald-50/50 dark:bg-emerald-950/20 text-foreground p-3 rounded-xl border border-emerald-200/60 leading-relaxed">
                    {report.explanation}
                  </p>
                  {report.evidence && (
                    <p className="text-[11px] text-muted-foreground">
                      Attached Evidence: <strong>{report.evidence}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl">
                  No explanation submitted yet by student.
                </p>
              )}
            </section>

            {/* Complete Case Audit Timeline */}
            <section className="card-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-divider pb-3">
                <ShieldCheck className="size-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  COMPLETE AUDIT TIMELINE
                </span>
              </div>

              <div className="space-y-3 divide-y divide-divider">
                {report.timeline.map((item, idx) => (
                  <div key={idx} className="pt-2.5 first:pt-0 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{item.title}</span>
                      <span className="text-[10px] text-subtle-foreground font-mono">
                        {item.time}
                      </span>
                    </div>
                    {item.detail && (
                      <p className="text-muted-foreground text-[11px] mt-0.5">{item.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

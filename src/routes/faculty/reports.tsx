import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText, Printer, Sparkles } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { ReportsTable } from "@/components/reports-table";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { fetchMyFacultyReportsApi } from "@/lib/api/faculty.server";
import type { Report } from "@/lib/cmadms-data";
import { hodByDepartment } from "@/lib/cmadms-data";
import { CaseReportTemplateModal } from "@/components/case-report-template-modal";
import { ScanStudentIdButton } from "@/components/scan-student-id-button";
import {
  sampleCaseReportTemplate,
  printCaseReport,
  downloadCaseReportHtml,
} from "@/lib/case-report-template-html";
import { toast } from "sonner";

export const Route = createFileRoute("/faculty/reports")({
  head: () => ({ meta: [{ title: "My Reports — Faculty Portal" }] }),
  component: FacultyReportsPage,
});

function FacultyReportsPage() {
  const { reports: storeReports } = useCmadms();
  const { profile } = useAuth();
  const activeFacultyName = profile?.full_name || "Prof. Rajesh Kumar";

  const [dbReports, setDbReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadReports() {
      try {
        const res = await fetchMyFacultyReportsApi();
        if (isMounted && res.success && res.reports.length > 0) {
          const mapped: Report[] = res.reports.map((r) => ({
            id: r.id,
            studentName: r.student_name,
            studentId: r.student_code,
            department: r.department,
            departmentHod: hodByDepartment[r.department]?.name || "Department HOD",
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
            semester: r.semester || 6,
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
          }));
          setDbReports(mapped);
        } else if (isMounted) {
          // Fallback to store reports filtered by faculty
          setDbReports(
            storeReports.filter(
              (r) => r.reportedBy.toLowerCase() === activeFacultyName.toLowerCase(),
            ),
          );
        }
      } catch (err) {
        console.error("Failed to load faculty reports from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReports();
    return () => {
      isMounted = false;
    };
  }, [activeFacultyName, storeReports]);

  const handleQuickDownloadSample = () => {
    try {
      downloadCaseReportHtml(sampleCaseReportTemplate, { generatedBy: activeFacultyName });
      toast.success("Downloaded Official Case Report Template (RPT-982727.html)");
    } catch (err: any) {
      toast.error(err.message || "Failed to download template");
    }
  };

  const handleQuickPrintSample = () => {
    try {
      printCaseReport(sampleCaseReportTemplate, { generatedBy: activeFacultyName });
      toast.success("Opening Case Report print dialog...");
    } catch (err: any) {
      toast.error(err.message || "Failed to open print dialog");
    }
  };

  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Reports"
          description="Track unauthorized movement cases submitted by you and download standardized case reports."
          breadcrumb={[{ label: "Faculty", to: "/faculty/dashboard" }, { label: "My Reports" }]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ScanStudentIdButton to="/faculty/check" size="sm" />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleQuickPrintSample}
                className="rounded-xl text-xs font-semibold gap-1.5 shadow-2xs"
              >
                <Printer className="size-3.5 text-primary" />
                <span>Print Template</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setTemplateModalOpen(true)}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
              >
                <Download className="size-3.5" />
                <span>Download Report Template</span>
              </Button>
            </div>
          }
        />

        {/* Case Report Template Showcase Banner */}
        <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-primary/5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Official Academic Case Report Template (RPT-982727)
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  Standard Format
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download or print standardized case reports with full Student, Timetable, Incident Details, Faculty Remarks, and Counselor Decisions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleQuickDownloadSample}
              className="rounded-xl text-xs font-semibold gap-1.5 bg-card flex-1 md:flex-initial"
            >
              <Download className="size-3.5 text-primary" />
              <span>Download (.html)</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setTemplateModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs flex-1 md:flex-initial"
            >
              <FileText className="size-3.5" />
              <span>Preview &amp; Export</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading your submitted violation reports...
          </div>
        ) : (
          <ReportsTable
            reports={dbReports}
            title="Faculty Submitted Reports"
            description="Cases filed by you and undergoing student explanation/HOD review."
          />
        )}

        {/* Case Report Template Preview & Export Modal */}
        <CaseReportTemplateModal
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          reports={dbReports}
        />
      </div>
    </RoleGuard>
  );
}


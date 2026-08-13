import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { ReportsTable } from "@/components/reports-table";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { fetchMyFacultyReportsApi } from "@/lib/api/faculty.server";
import type { Report } from "@/lib/cmadms-data";
import { hodByDepartment } from "@/lib/cmadms-data";

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

  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Reports"
          description="Track unauthorized movement cases submitted by you."
          breadcrumb={[{ label: "Faculty", to: "/faculty/dashboard" }, { label: "My Reports" }]}
        />
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
      </div>
    </RoleGuard>
  );
}

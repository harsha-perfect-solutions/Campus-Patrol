import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { ReportsTable } from "@/components/reports-table";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { getHodCasesApi } from "@/lib/api/hod.server";
import type { Report } from "@/lib/cmadms-data";
import { hodByDepartment } from "@/lib/cmadms-data";

export const Route = createFileRoute("/hod/cases")({
  head: () => ({ meta: [{ title: "Department Cases Queue — HOD Portal" }] }),
  component: HODCasesPage,
});

function HODCasesPage() {
  const { reports: storeReports } = useCmadms();
  const { profile } = useAuth();
  const userDept = profile?.department || "CSE";

  const [dbReports, setDbReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadHodCases() {
      try {
        const res = await getHodCasesApi();
        if (isMounted && res.success && res.reports.length > 0) {
          const mapped: Report[] = res.reports.map((r) => ({
            id: r.id,
            studentName: r.student_name,
            studentId: r.student_code,
            department: r.department,
            departmentHod:
              profile?.full_name || hodByDepartment[r.department]?.name || "Department HOD",
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
          // Fallback to store reports filtered by department
          const activeStatuses = [
            "reported",
            "notified",
            "awaiting_explanation",
            "explanation_submitted",
            "under_review",
            "Reported",
            "Student Notified",
            "Awaiting Explanation",
            "Explanation Submitted",
            "Under Review",
          ];
          setDbReports(
            storeReports.filter(
              (r) => r.department === userDept && activeStatuses.includes(r.status),
            ),
          );
        }
      } catch (err) {
        console.error("Failed to load HOD cases from PostgreSQL:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadHodCases();
    return () => {
      isMounted = false;
    };
  }, [userDept, profile?.full_name, storeReports]);

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        <PageHeader
          title={`${userDept} Department Cases Queue`}
          description={`Review unauthorized movement violation reports submitted for ${userDept} department.`}
          breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Cases" }]}
        />

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading department violation cases...
          </div>
        ) : (
          <ReportsTable
            reports={dbReports}
            title={`${userDept} Department Violation Case Files`}
            description="Review student explanations and execute final HOD decisions."
            emptyAction={
              <Button
                asChild
                className="rounded-xl font-semibold bg-primary text-primary-foreground"
              >
                <Link to="/hod/students">View Department Students</Link>
              </Button>
            }
          />
        )}
      </div>
    </RoleGuard>
  );
}

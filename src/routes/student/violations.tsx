import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getMyViolationReportsApi } from "@/lib/api/student.server";
import type { DBViolationReport } from "@/lib/db/violations.server";

export const Route = createFileRoute("/student/violations")({
  head: () => ({ meta: [{ title: "My Violations — Student Portal" }] }),
  component: StudentViolationsPage,
});

function StudentViolationsPage() {
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";

  const [dbReports, setDbReports] = useState<DBViolationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadViolations() {
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
    loadViolations();
    return () => {
      isMounted = false;
    };
  }, [rollNo]);

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Reported Violations"
          description="View violation reports logged for your account and check HOD decisions."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "My Violations" }]}
        />

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center max-w-xl text-xs text-muted-foreground">
            Loading violation reports from database...
          </div>
        ) : dbReports.length > 0 ? (
          <div className="space-y-4">
            {dbReports.map((r) => (
              <div
                key={r.id}
                className="card-surface p-5 rounded-2xl border border-border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{r.id}</span>
                    <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground mt-1">
                    Class: {r.class_name} &bull; Time: {r.incident_time} &bull; Room: {r.room}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Reported by {r.reported_by} on{" "}
                    {(r.created_at as unknown) instanceof Date
                      ? (r.created_at as unknown as Date).toISOString()
                      : String(r.created_at)}
                  </p>
                  {r.decision && (
                    <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      HOD Decision: {r.decision} (By {r.decision_by || "HOD"})
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-xl font-semibold self-start sm:self-auto"
                >
                  <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                    <Eye className="size-3.5 mr-1" /> View Case File
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-surface p-8 rounded-2xl border border-border text-center max-w-xl text-xs text-muted-foreground">
            No violation reports found in database for Roll No:{" "}
            <strong className="text-foreground">{rollNo}</strong>.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

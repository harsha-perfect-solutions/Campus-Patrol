import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Eye, FileText } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/violations")({
  head: () => ({ meta: [{ title: "My Violations — Student Portal" }] }),
  component: StudentViolationsPage,
});

function StudentViolationsPage() {
  const { reports } = useCmadms();
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";

  const myViolations = reports.filter((r) => r.studentId === rollNo || true);

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Reported Violations"
          description="View violation reports logged for your account and check HOD decisions."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "My Violations" }]}
        />

        <div className="space-y-4">
          {myViolations.map((r) => (
            <div key={r.id} className="card-surface p-5 rounded-2xl border border-border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{r.id}</span>
                  <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                    {r.status.toUpperCase()}
                  </span>
                </div>
                <p className="font-semibold text-foreground mt-1">
                  Class: {r.className} &bull; Time: {r.incidentTime} &bull; Room: {r.room}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Reported by {r.reportedBy} on {r.createdAt}</p>
                {r.decision && (
                  <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    HOD Decision: {r.decision}
                  </p>
                )}
              </div>

              <Button variant="outline" size="sm" asChild className="rounded-xl font-semibold self-start sm:self-auto">
                <Link to="/student/explanations">
                  <Eye className="size-3.5 mr-1" /> View & Respond
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}

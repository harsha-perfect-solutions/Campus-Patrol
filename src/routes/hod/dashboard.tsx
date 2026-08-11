import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Building2, CheckCircle2, FileText, GraduationCap, ShieldAlert } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/hod/dashboard")({
  head: () => ({ meta: [{ title: "HOD Dashboard — CMADMS" }] }),
  component: HODDashboardPage,
});

function HODDashboardPage() {
  return (
    <RoleGuard allowedRoles={["hod"]}>
      <HODDashboardContent />
    </RoleGuard>
  );
}

function HODDashboardContent() {
  const { reports } = useCmadms();
  const { profile } = useAuth();

  const userDept = profile?.department || "CSE";
  const departmentReports = reports.filter((r) => r.department === userDept);

  const newCases = departmentReports.filter((r) => r.status === "Awaiting Explanation" || r.status === "pending").length;
  const awaitingExplanation = departmentReports.filter((r) => !r.explanation && (r.status === "Awaiting Explanation" || r.status === "pending")).length;
  const underReview = departmentReports.filter((r) => r.status === "Explanation Submitted" || r.status === "Under Review" || r.status === "review").length;
  const resolved = departmentReports.filter((r) => r.status === "Exonerated" || r.status === "Warning" || r.status === "resolved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Department Discipline Hub — ${profile?.full_name || "Dr. Anjali Rao (HOD)"}`}
        description="Review student violation reports, explanations, and issue official disciplinary decisions."
        breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Dashboard" }]}
        actions={
          <Button asChild className="rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs">
            <Link to="/hod/cases">
              <ShieldAlert className="size-4 mr-2" /> Review Cases Queue ({newCases})
            </Link>
          </Button>
        }
      />

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "New Cases", value: newCases, color: "text-red-600 bg-red-50 dark:bg-red-950/40" },
          { label: "Awaiting Explanation", value: awaitingExplanation, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
          { label: "Under HOD Review", value: underReview, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
          { label: "Resolved Cases", value: resolved, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
        ].map((s) => (
          <div key={s.label} className="card-surface p-5 rounded-2xl border border-border shadow-2xs">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${s.color}`}>
              {s.label}
            </span>
            <p className="mt-3 text-3xl font-extrabold text-foreground">{String(s.value).padStart(2, "0")}</p>
          </div>
        ))}
      </div>

      {/* Cases Requiring Immediate Attention */}
      <section className="card-surface p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center justify-between border-b border-divider pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              CASES REQUIRING ATTENTION
            </span>
          </div>
          <Button variant="outline" size="sm" asChild className="rounded-xl text-xs">
            <Link to="/hod/cases">View Full Case Queue</Link>
          </Button>
        </div>

        <div className="mt-4 divide-y divide-divider">
          {departmentReports.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{r.id}</span>
                  <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                    {r.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-foreground font-semibold mt-1">
                  Student: {r.studentName} ({r.studentId}) &bull; Class: {r.className}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Reported by {r.reportedBy} at {r.incidentTime}</p>
              </div>

              <Button asChild size="sm" variant="default" className="rounded-xl bg-primary text-primary-foreground font-semibold self-start sm:self-auto">
                <Link to="/hod/cases/$reportId" params={{ reportId: r.id }}>
                  Review Case &rarr;
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

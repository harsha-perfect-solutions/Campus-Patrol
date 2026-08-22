import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ReportsTable } from "@/components/reports-table";
import { useCmadms } from "@/lib/cmadms-store";

import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/violations")({
  head: () => ({
    meta: [
      { title: "Reported Violations — CMADMS" },
      {
        name: "description",
        content:
          "Department-wide log of reported unauthorized student movement cases and their current status.",
      },
      { property: "og:title", content: "Reported Violations — CMADMS" },
      {
        property: "og:description",
        content: "Review every reported unauthorized movement case in one place.",
      },
    ],
  }),
  component: ProtectedViolationsPage,
});

function ProtectedViolationsPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod", "admin"]}>
      <ViolationsPage />
    </RoleGuard>
  );
}

function ViolationsPage() {
  const { reports } = useCmadms();
  const open = reports.filter((r) => r.status !== "resolved");

  return (
    <>
      <PageHeader
        title="Reported Violations"
        description="Every unauthorized movement case reported in your department."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "Reporting" }, { label: "Violations" }]}
        actions={
          <Button asChild>
            <Link to="/check">
              <Search /> Check Student
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Open cases", value: open.length, tone: "bg-destructive-soft text-destructive" },
          {
            label: "Under review",
            value: reports.filter((r) => r.status === "review").length,
            tone: "bg-info-soft text-info",
          },
          {
            label: "Resolved",
            value: reports.filter((r) => r.status === "resolved").length,
            tone: "bg-success-soft text-success",
          },
        ].map((s) => (
          <div key={s.label} className="card-surface flex items-center gap-4 p-5">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${s.tone}`}>
              <AlertTriangle className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-foreground">
                {String(s.value).padStart(2, "0")}
              </p>
              <p className="truncate text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <ReportsTable
        reports={reports}
        title="All violation cases"
        description="Search, filter and open any reported case."
      />
    </>
  );
}

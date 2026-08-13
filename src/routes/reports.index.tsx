import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ReportsTable } from "@/components/reports-table";
import { useCmadms } from "@/lib/cmadms-store";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "My Reports — CMADMS" },
      {
        name: "description",
        content: "Manage and track the unauthorized movement violations you have submitted.",
      },
      { property: "og:title", content: "My Reports — CMADMS" },
      { property: "og:description", content: "Track the status of every violation you filed." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { reports } = useCmadms();
  return (
    <>
      <PageHeader
        title="My Reports"
        description="Manage and track the violations you have submitted."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "Reporting" }, { label: "My Reports" }]}
        actions={
          <Button asChild>
            <Link to="/check">
              <Search /> Check Student
            </Link>
          </Button>
        }
      />
      <ReportsTable
        reports={reports}
        title="Submitted violations"
        description={`${reports.length} reports filed by you`}
      />
    </>
  );
}

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, Eye, FileSearch, Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCmadms } from "@/lib/cmadms-store";
import type { Report, ReportStatus } from "@/lib/cmadms-data";

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

const PAGE_SIZE = 4;

export function ReportsTable({
  reports,
  title,
  description,
}: {
  reports: Report[];
  title: string;
  description: string;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReportStatus | "all">("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const list = reports.filter((r) => {
      const matchQ =
        !q ||
        [r.id, r.studentName, r.studentId, r.className]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase());
      const matchS = status === "all" || r.status === status;
      return matchQ && matchS;
    });
    return [...list].sort((a, b) =>
      sortDesc ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );
  }, [reports, q, status, sortDesc]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="card-surface overflow-hidden">
      <div className="grid gap-4 border-b border-divider px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search..."
              className="h-10 pl-9"
              aria-label="Search reports"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as ReportStatus | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 w-[150px]" aria-label="Filter by status">
              <Filter className="mr-1 size-4" aria-hidden />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="review">Under Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setSortDesc((v) => !v)}>
            <ArrowUpDown /> {sortDesc ? "Newest" : "Oldest"}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No Reports Found"
          description="There are no violation reports matching your current filters."
          action={
            <Button asChild>
              <Link to="/check">Check Student</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider text-left text-xs uppercase tracking-wide text-subtle-foreground">
                  <th className="px-5 py-3 font-medium">Report ID</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Incident</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-accent/50">
                    <td className="px-5 py-3.5 font-medium text-foreground">{r.id}</td>
                    <td className="px-5 py-3.5">
                      <span className="block text-foreground">{r.studentName}</span>
                      <span className="block text-xs text-subtle-foreground">{r.studentId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.className}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.incidentTime}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.createdAt}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                          <Eye /> View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-divider md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">{r.id}</p>
                  <StatusBadge status={r.status} />
                </div>
                <div>
                  <p className="text-sm text-foreground">{r.studentName}</p>
                  <p className="text-xs text-subtle-foreground">{r.studentId}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.className} • {r.incidentTime}
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                    <Eye /> View Details
                  </Link>
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-divider px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + rows.length} of{" "}
              {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

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

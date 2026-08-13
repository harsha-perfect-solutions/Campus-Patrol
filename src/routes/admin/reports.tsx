import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Search } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminReportsApi } from "@/lib/api/admin.server";
import type { DBViolationReport } from "@/lib/db/violations.server";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reported Cases — Admin Console" }] }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dbReports, setDbReports] = useState<DBViolationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadReports() {
      try {
        const res = await getAdminReportsApi();

        if (isMounted && res.success) {
          setDbReports(res.reports);
        }
      } catch (err) {
        console.error("Failed to load violation reports from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReports();
    return () => {
      isMounted = false;
    };
  }, [deptFilter, statusFilter]);

  const filteredReports = dbReports.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(s) ||
      r.student_code.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s) ||
      r.reported_by.toLowerCase().includes(s)
    );
  });

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="All Institutional Reported Cases"
          description="System-wide monitoring of student unauthorized movement reports across all academic departments."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Reported Cases" }]}
        />

        {/* Search & Filter Bar */}
        <div className="card-surface p-4 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Student ID, Student Name, Faculty, or HOD..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="w-full sm:w-44">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="CSE">CSE Department</SelectItem>
                <SelectItem value="ECE">ECE Department</SelectItem>
                <SelectItem value="MECH">MECH Department</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Case Statuses</SelectItem>
                <SelectItem value="awaiting_explanation">Awaiting Explanation</SelectItem>
                <SelectItem value="explanation_submitted">Explanation Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="exonerated">Exonerated</SelectItem>
                <SelectItem value="warned">Warning Issued</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Global Cases Table */}
        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading institutional violation reports from database...
          </div>
        ) : (
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-divider text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Dept</th>
                  <th className="py-3 px-4">Class Session</th>
                  <th className="py-3 px-4">Reporting Faculty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-medium">
                {filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">{r.id}</td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {r.student_name}{" "}
                      <span className="text-[11px] text-muted-foreground block font-normal">
                        {r.student_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-accent px-2 py-1 text-[10px] font-extrabold text-foreground">
                        {r.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-foreground">
                      {r.class_name}{" "}
                      <span className="text-[11px] text-muted-foreground block">
                        {r.incident_time} &bull; {r.room}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-foreground">{r.reported_by}</td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-xl text-xs font-semibold"
                      >
                        <Link to={`/admin/reports/${r.id}` as any}>
                          <Eye className="size-3.5 mr-1" /> View Full Case
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

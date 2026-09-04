import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert, Building2 } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getHodDashboardStatsApi, getHodCasesApi } from "@/lib/api/hod.server";
import type { Report } from "@/lib/cmadms-data";
import { hodByDepartment } from "@/lib/cmadms-data";

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
  const { reports: storeReports } = useCmadms();
  const { profile } = useAuth();

  const userDept = profile?.department || "CSE";
  const [dbCases, setDbCases] = useState<Report[]>([]);
  const [stats, setStats] = useState({
    newCases: 0,
    awaitingExplanation: 0,
    underReview: 0,
    resolved: 0,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadStatsAndCases() {
      try {
        const [statsRes, casesRes] = await Promise.all([
          getHodDashboardStatsApi(),
          getHodCasesApi(),
        ]);

        if (isMounted && statsRes.success && statsRes.stats) {
          setStats({
            newCases: statsRes.stats.pendingCases,
            awaitingExplanation: statsRes.stats.awaitingExplanation,
            underReview: statsRes.stats.underReview,
            resolved:
              statsRes.stats.exonerated + statsRes.stats.warnings + statsRes.stats.escalated,
          });
        }

        if (isMounted && casesRes.success && casesRes.reports.length > 0) {
          const mapped: Report[] = casesRes.reports.map((r) => ({
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
            timeline: [],
          }));
          setDbCases(mapped);
        } else if (isMounted) {
          const departmentReports = storeReports.filter((r) => r.department === userDept);
          setDbCases(departmentReports);
          setStats({
            newCases: departmentReports.filter(
              (r) => r.status === "Awaiting Explanation" || r.status === "pending",
            ).length,
            awaitingExplanation: departmentReports.filter(
              (r) =>
                !r.explanation && (r.status === "Awaiting Explanation" || r.status === "pending"),
            ).length,
            underReview: departmentReports.filter(
              (r) =>
                r.status === "Explanation Submitted" ||
                r.status === "Under Review" ||
                r.status === "review",
            ).length,
            resolved: departmentReports.filter(
              (r) => r.status === "Exonerated" || r.status === "Warning" || r.status === "resolved",
            ).length,
          });
        }
      } catch (err) {
        console.error("Failed to load HOD stats from PostgreSQL:", err);
      }
    }

    loadStatsAndCases();
    return () => {
      isMounted = false;
    };
  }, [userDept, profile?.full_name, storeReports]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Department Discipline Hub — ${profile?.full_name || hodByDepartment[userDept]?.name || "Department HOD"}`}
        description="Review student violation reports, explanations, and issue official disciplinary decisions."
        breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Dashboard" }]}
        actions={
          <Button
            asChild
            className="rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            <Link to="/hod/violations">
              <ShieldAlert className="size-4 mr-2" /> Disciplinary Console ({stats.newCases})
            </Link>
          </Button>
        }
      />

      {/* CAMPUS BRANCH-WISE VIOLATION COUNTS (CSE, ECE, EEE, IT, MECH, CIVIL) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="size-4 text-primary" />
            CAMPUS BRANCH-WISE VIOLATION COUNTS
          </span>
          <span className="text-[11px] text-muted-foreground font-semibold">
            All Engineering Branches Overview
          </span>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            { dept: "CSE", name: "Computer Science", count: 15, isUserDept: userDept === "CSE", color: "border-primary/40 bg-primary/5 text-primary" },
            { dept: "ECE", name: "Electronics & Comm", count: 8, isUserDept: userDept === "ECE", color: "border-purple-300 bg-purple-50/40 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300" },
            { dept: "EEE", name: "Electrical & Elect", count: 4, isUserDept: userDept === "EEE", color: "border-amber-300 bg-amber-50/40 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300" },
            { dept: "IT", name: "Information Tech", count: 6, isUserDept: userDept === "IT", color: "border-blue-300 bg-blue-50/40 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300" },
            { dept: "MECH", name: "Mechanical Engg", count: 5, isUserDept: userDept === "MECH", color: "border-emerald-300 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300" },
            { dept: "CIVIL", name: "Civil Engineering", count: 3, isUserDept: userDept === "CIVIL", color: "border-zinc-300 bg-zinc-50/40 text-zinc-700 dark:bg-zinc-950/20 dark:text-zinc-300" },
          ].map((b) => (
            <div
              key={b.dept}
              className={cn(
                "card-surface p-4 rounded-2xl border transition-all relative overflow-hidden",
                b.isUserDept ? "border-2 border-primary shadow-xs ring-2 ring-primary/20" : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-extrabold", b.color)}>
                  {b.dept}
                </span>
                {b.isUserDept && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                    My Dept
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-black text-foreground">
                {String(b.count).padStart(2, "0")}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">
                {b.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "New Cases",
            value: stats.newCases,
            color: "text-red-600 bg-red-50 dark:bg-red-950/40",
          },
          {
            label: "Awaiting Explanation",
            value: stats.awaitingExplanation,
            color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
          },
          {
            label: "Under HOD Review",
            value: stats.underReview,
            color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
          },
          {
            label: "Resolved Cases",
            value: stats.resolved,
            color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="card-surface p-5 rounded-2xl border border-border shadow-2xs"
          >
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${s.color}`}>
              {s.label}
            </span>
            <p className="mt-3 text-3xl font-extrabold text-foreground">
              {String(s.value).padStart(2, "0")}
            </p>
          </div>
        ))}
      </div>

      {/* DAY-TO-DAY VIOLATION TREND & PROACTIVE HOD PRECAUTIONS CONSOLE */}
      <section className="card-surface p-4 sm:p-6 rounded-2xl border border-border shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-divider pb-4 gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-red-600 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground break-words">
              DEPARTMENT DAY-TO-DAY VIOLATION TREND & PROACTIVE HOD PRECAUTIONS
            </span>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
            Live Department Analytics ({userDept})
          </span>
        </div>

        {/* High Violation Precaution Alert Banner */}
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-600 text-white shrink-0 shadow-xs">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-red-900 dark:text-red-300 break-words">
                  🚨 HIGH VIOLATION ALERT: 3rd Year Section A requires HOD Intervention
                </h4>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 font-medium">
                  Increased unexcused movement detected during lab & lecture hours (3 active violations in Section A). Proactive HOD precautions recommended to prevent escalation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 pt-2 border-t border-red-500/20">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const toast = (window as any).toast || console.log;
                toast.success("Section Advisory Issued!", {
                  description: "Official HOD precautionary advisory sent to 3rd Year Sec A Class Counselor & Students.",
                });
              }}
              className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs min-h-[44px] sm:min-h-0 w-full sm:w-auto"
            >
              Issue Precautionary Advisory Warning
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const toast = (window as any).toast || console.log;
                toast.success("Counselor Precautionary Meeting Scheduled", {
                  description: "Notification sent to assigned Class Counselor Prof. Ravi Kumar for student counseling session.",
                });
              }}
              className="rounded-xl text-xs font-bold border-red-300 text-red-700 dark:text-red-300 hover:bg-red-100/50 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
            >
              Notify Counselor for Precautionary Counseling
            </Button>

            <Button
              asChild
              size="sm"
              variant="secondary"
              className="rounded-xl text-xs font-bold"
            >
              <Link to="/hod/violations">
                View Section A Violations &rarr;
              </Link>
            </Button>
          </div>
        </div>

        {/* Day-to-Day & Section Breakdown Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              3rd Year • Section A Violations
            </span>
            <p className="text-2xl font-extrabold text-foreground">04 <span className="text-xs font-bold text-red-600 dark:text-red-400">(High Trend)</span></p>
            <p className="text-[11px] text-muted-foreground">Class Counselor: Prof. Ravi Kumar</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              3rd Year • Section B Violations
            </span>
            <p className="text-2xl font-extrabold text-foreground">02 <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">(Normal)</span></p>
            <p className="text-[11px] text-muted-foreground">Class Counselor: Dr. Anjali Rao</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              2nd Year • Section A Violations
            </span>
            <p className="text-2xl font-extrabold text-foreground">01 <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">(Low)</span></p>
            <p className="text-[11px] text-muted-foreground">Class Counselor: Dr. Priya Sharma</p>
          </div>
        </div>
      </section>

      {/* Cases Requiring Immediate Attention */}
      <section className="card-surface p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center justify-between border-b border-divider pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              INCIDENTS & VIOLATIONS REQUIRING ATTENTION
            </span>
          </div>
          <Button variant="outline" size="sm" asChild className="rounded-xl text-xs font-semibold">
            <Link to="/hod/violations">Open Full Incident Console &rarr;</Link>
          </Button>
        </div>

        <div className="mt-4 divide-y divide-divider">
          {dbCases.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No pending cases requiring attention in {userDept} department.
            </p>
          ) : (
            dbCases.map((r) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 text-xs"
              >
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
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Reported by {r.reportedBy} at {r.incidentTime}
                  </p>
                </div>

                <Button
                  asChild
                  size="sm"
                  variant="default"
                  className="rounded-xl bg-primary text-primary-foreground font-semibold self-start sm:self-auto"
                >
                  <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                    Review Case &rarr;
                  </Link>
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

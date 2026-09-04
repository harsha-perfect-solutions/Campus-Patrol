import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, User, UserCheck } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  getMyStudentDashboardStatsApi,
  getMyViolationReportsApi,
  getMyStudentProfileApi,
} from "@/lib/api/student.server";
import { getMyCounselorApi } from "@/lib/api/counselor.server";
import type { DBStudentCounselorInfo } from "@/lib/db/counselor.server";
import type { DBViolationReport } from "@/lib/db/violations.server";
import type { StudentDashboardStats } from "@/lib/db/student.server";

export const Route = createFileRoute("/student/dashboard")({
  head: () => ({ meta: [{ title: "Student Dashboard — Campus Guard Pro" }] }),
  component: StudentDashboardPage,
});

function StudentDashboardPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <StudentDashboardContent />
    </RoleGuard>
  );
}

function StudentDashboardContent() {
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";

  const [studentName, setStudentName] = useState(profile?.full_name || "Meera Nair");
  const [stats, setStats] = useState<StudentDashboardStats>({
    activeGatePass: null,
    validUntil: null,
    confirmedViolations: 0,
    pendingExplanationCount: 0,
    activePermissionsCount: 0,
    approvedPermissionsCount: 0,
    rejectedPermissionsCount: 0,
  });
  const [pendingExplanation, setPendingExplanation] = useState<DBViolationReport | null>(null);
  const [counselorInfo, setCounselorInfo] = useState<DBStudentCounselorInfo | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        const [statsRes, violRes, profileRes, counselorRes] = await Promise.all([
          getMyStudentDashboardStatsApi(),
          getMyViolationReportsApi(),
          getMyStudentProfileApi(),
          getMyCounselorApi(),
        ]);

        if (isMounted && statsRes.success && statsRes.stats) {
          setStats(statsRes.stats);
        }

        if (isMounted && profileRes.success && profileRes.student?.name) {
          setStudentName(profileRes.student.name);
        }

        if (isMounted && counselorRes) {
          setCounselorInfo(counselorRes);
        }

        if (isMounted && violRes.success && violRes.reports.length > 0) {
          const pending = violRes.reports.find(
            (r) =>
              (!r.explanation || r.explanation.trim() === "") &&
              r.status !== "exonerated" &&
              r.status !== "warned" &&
              r.status !== "escalated",
          );
          setPendingExplanation(pending || null);
        }
      } catch (err) {
        console.error("Failed to load student dashboard data from PostgreSQL:", err);
      }
    }
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [rollNo]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${studentName}`}
        description={`Student Academic & Movement Status Portal • Roll No: ${rollNo}`}
        breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "Dashboard" }]}
      />

      {/* Top 4 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="size-3.5 text-primary" /> My Assigned Counselor
          </span>
          {counselorInfo?.assigned ? (
            <div className="mt-2">
              <p className="text-base font-extrabold text-foreground">{counselorInfo.counselorName}</p>
              <p className="text-xs font-semibold text-primary mt-0.5">{counselorInfo.role || "Class Counselor"}</p>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {counselorInfo.staffCode ? `ID: ${counselorInfo.staffCode} • ` : ""}
                {counselorInfo.department || "Faculty"}
              </p>
              {counselorInfo.email && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{counselorInfo.email}</p>
              )}
            </div>
          ) : (
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-2">
              Counselor not assigned. Please contact Admin/HOD.
            </p>
          )}
        </div>

        <div className="card-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Active Gate Pass
          </span>
          <p className="text-base font-bold text-foreground mt-2">
            {stats.activeGatePass || "No Active Gate Pass"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {stats.validUntil ? `Valid until ${stats.validUntil}` : "In class session"}
          </p>
        </div>

        <div className="card-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Current Semester Violations
          </span>
          <p className="text-3xl font-extrabold text-foreground mt-2">
            {stats.confirmedViolations}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Confirmed current-semester count</p>
        </div>

        <div className="card-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Academic Status
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Student &bull; Sem 6
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">3rd Year &bull; Section A</p>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student Digital Identity Card */}
        <section className="card-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-divider pb-3">
              <User className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                STUDENT DIGITAL IDENTITY
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-xl border border-primary/20">
                {studentName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">{studentName}</h3>
                <p className="text-xs font-bold text-muted-foreground">{rollNo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CSE &bull; 3rd Year &bull; Semester 6
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-divider flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl text-xs font-semibold"
            >
              <Link to="/student/profile">Profile & ID</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl text-xs font-semibold"
            >
              <Link to="/student/passes">My Passes</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-300"
            >
              <Link to="/student/violations">My Incidents</Link>
            </Button>
          </div>
        </section>

        {/* Today's Timetable */}
        <section className="card-surface p-6 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                MY TODAY CLASS SCHEDULE
              </span>
            </div>
            <Button variant="ghost" size="sm" asChild className="rounded-xl text-xs">
              <Link to="/student/timetable">Full Timetable</Link>
            </Button>
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            {[
              {
                time: "09:00 AM – 10:00 AM",
                subject: "Compiler Design",
                room: "Room C-201",
                active: false,
              },
              {
                time: "10:00 AM – 11:00 AM",
                subject: "Data Structures",
                room: "Room C-204",
                active: true,
              },
              {
                time: "11:15 AM – 12:15 PM",
                subject: "Database Management Systems",
                room: "Lab C-105",
                active: false,
              },
            ].map((slot) => (
              <div
                key={slot.time}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  slot.active
                    ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-foreground font-semibold"
                    : "border-border/60 bg-card text-muted-foreground"
                }`}
              >
                <div>
                  <p className="font-bold text-foreground">{slot.subject}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {slot.time} &bull; {slot.room}
                  </p>
                </div>
                {slot.active && (
                  <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                    Now in session
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

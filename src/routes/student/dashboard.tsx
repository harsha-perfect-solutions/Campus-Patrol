import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, User, UserCheck, ArrowRight, Clock, ShieldCheck } from "lucide-react";
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
import { getMyStudentTimetableApi } from "@/lib/api/timetable.server";
import type { DBStudent } from "@/lib/db/students.server";
import type { DBStudentCounselorInfo } from "@/lib/db/counselor.server";
import type { DBViolationReport } from "@/lib/db/violations.server";
import type { StudentDashboardStats } from "@/lib/db/student.server";
import type { DBClassSlot } from "@/lib/db/timetable.server";

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

function formatSlotTime(t?: string): string {
  if (!t) return "";
  const parts = t.split(":");
  let h = parseInt(parts[0] || "0", 10);
  const m = parts[1] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

function isSlotCurrentlyActive(startTime?: string, endTime?: string): boolean {
  if (!startTime || !endTime) return false;
  const now = new Date();
  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);
  if (sH === undefined || sM === undefined || eH === undefined || eM === undefined) return false;

  const currentMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;
  return currentMin >= startMin && currentMin <= endMin;
}

function StudentDashboardContent() {
  const { profile } = useAuth();

  const [student, setStudent] = useState<DBStudent | null>(null);
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
  const [timetableSlots, setTimetableSlots] = useState<DBClassSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const studentName = student?.name || profile?.full_name || "Student User";
  const rollNo = student?.student_code || profile?.student_code || "—";
  const dept = student?.department || profile?.department || "General";
  const year = student?.year || (loading ? "..." : "3rd Year");
  const section = student?.section || (loading ? "..." : "Section A");
  const sem = student?.semester ? `Sem ${student.semester}` : (loading ? "..." : "Sem 6");
  const semFull = student?.semester ? `Semester ${student.semester}` : (loading ? "..." : "Semester 6");
  const status = student?.status || "Active";

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        const [statsRes, violRes, profileRes, counselorRes, timetableRes] = await Promise.allSettled([
          getMyStudentDashboardStatsApi(),
          getMyViolationReportsApi(),
          getMyStudentProfileApi(),
          getMyCounselorApi(),
          getMyStudentTimetableApi(),
        ]);

        if (isMounted) {
          if (statsRes.status === "fulfilled" && statsRes.value.success && statsRes.value.stats) {
            setStats(statsRes.value.stats);
          }
          if (profileRes.status === "fulfilled" && profileRes.value.success && profileRes.value.student) {
            setStudent(profileRes.value.student);
          }
          if (counselorRes.status === "fulfilled" && counselorRes.value) {
            setCounselorInfo(counselorRes.value);
          }
          if (timetableRes.status === "fulfilled" && timetableRes.value.success && timetableRes.value.slots) {
            setTimetableSlots(timetableRes.value.slots);
          }
          if (violRes.status === "fulfilled" && violRes.value.success && violRes.value.reports.length > 0) {
            const pending = violRes.value.reports.find(
              (r) =>
                (!r.explanation || r.explanation.trim() === "") &&
                r.status !== "exonerated" &&
                r.status !== "warned" &&
                r.status !== "escalated",
            );
            setPendingExplanation(pending || null);
          }
        }
      } catch (err) {
        console.error("Failed to load student dashboard data from PostgreSQL:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [profile?.student_code, profile?.email]);

  // Today's timetable slots
  const todayDow = new Date().getDay(); // 0: Sun, 1: Mon ... 6: Sat
  const targetDow = todayDow === 0 ? 1 : todayDow; // default to Monday on Sundays
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayLabel = dayNames[todayDow] || "Today";
  const todaySlots = timetableSlots
    .filter((s) => Number(s.day_of_week) === targetDow)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${studentName}`}
        description={`Student Academic & Movement Status Portal • Roll No: ${rollNo} • Dept: ${dept}`}
        breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "Dashboard" }]}
      />

      {/* Pending Explanation Urgent Banner */}
      {pendingExplanation && (
        <div className="p-4 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Action Required: Pending Case Explanation</p>
              <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                You have a flagged movement incident ({pendingExplanation.id}) awaiting your formal explanation.
              </p>
            </div>
          </div>
          <Button size="sm" asChild className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shrink-0 self-start sm:self-auto">
            <Link to="/student/explanations">
              <span>Submit Statement</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Student Overview Metrics */}
      <div className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Counselor Card */}
        <div className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="size-3.5 text-primary shrink-0" /> Counselor
          </span>
          {counselorInfo?.assigned ? (
            <div className="mt-1.5">
              <p className="text-sm sm:text-base font-extrabold text-foreground truncate">{counselorInfo.counselorName}</p>
              <p className="text-[11px] sm:text-xs font-semibold text-primary truncate mt-0.5">{counselorInfo.role || "Class Counselor"}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                {counselorInfo.department || dept}
              </p>
            </div>
          ) : (
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1.5">
              Assigning Counselor...
            </p>
          )}
        </div>

        {/* Gate Pass Card */}
        <div className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" /> Gate Pass
          </span>
          <p className="text-sm sm:text-base font-bold text-foreground mt-1.5 truncate">
            {stats.activeGatePass || "No Active Pass"}
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {stats.validUntil ? `Until ${stats.validUntil}` : "In campus session"}
          </p>
        </div>

        {/* Violations Card */}
        <div className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-500 shrink-0" /> Violations
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1.5">
            {stats.confirmedViolations}
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Current Semester</p>
        </div>

        {/* Academic Status Card */}
        <div className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Academic Status
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {status} &bull; {sem}
          </span>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{year} &bull; {section}</p>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student Digital Identity Card */}
        <section className="card-surface p-4 sm:p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-divider pb-3">
              <User className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                STUDENT DIGITAL IDENTITY
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <span className="grid size-12 sm:size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-lg sm:text-xl border border-primary/20">
                {studentName
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">{studentName}</h3>
                <p className="text-xs font-bold text-muted-foreground font-mono">{rollNo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dept} &bull; {year} &bull; {semFull} &bull; {section}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-divider grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl text-[11px] sm:text-xs font-semibold px-1 text-center justify-center"
            >
              <Link to="/student/profile">Profile & ID</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl text-[11px] sm:text-xs font-semibold px-1 text-center justify-center"
            >
              <Link to="/student/passes">My Passes</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl text-[11px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-300 px-1 text-center justify-center"
            >
              <Link to="/student/violations">Incidents</Link>
            </Button>
          </div>
        </section>

        {/* Today's Timetable */}
        <section className="card-surface p-4 sm:p-6 rounded-2xl border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-divider pb-3 gap-1.5">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                MY {currentDayLabel.toUpperCase()} CLASS SCHEDULE
              </span>
            </div>
            <Button variant="ghost" size="sm" asChild className="rounded-xl text-xs self-start sm:self-auto">
              <Link to="/student/timetable">Full Timetable</Link>
            </Button>
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            {todaySlots.length > 0 ? (
              todaySlots.map((slot) => {
                const active = isSlotCurrentlyActive(slot.start_time, slot.end_time);
                return (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      active
                        ? "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-foreground font-semibold shadow-xs"
                        : "border-border/60 bg-card text-muted-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-foreground text-xs sm:text-sm">{slot.subject}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatSlotTime(slot.start_time)} – {formatSlotTime(slot.end_time)} &bull; {slot.room || "Room Assigned"}
                        {slot.faculty_name ? ` • ${slot.faculty_name}` : ""}
                      </p>
                    </div>
                    {active && (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-200 px-2 py-0.5 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 animate-pulse">
                        Now in session
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5 bg-muted/20">
                <BookOpen className="size-6 text-muted-foreground/50" />
                <p className="font-bold text-foreground">No classes scheduled for {currentDayLabel}</p>
                <p className="text-[11px] text-muted-foreground">
                  {timetableSlots.length > 0
                    ? `${timetableSlots.length} weekly classes scheduled. Click "Full Timetable" to view your weekly department timetable.`
                    : 'Click "Full Timetable" above to check your weekly department timetable.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, DoorOpen, Users, Clock, Sparkles, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ToneBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import { getAdminTimetableApi, getMyStudentTimetableApi } from "@/lib/api/timetable.server";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "My Timetable — CMADMS" },
      {
        name: "description",
        content:
          "Your weekly teaching schedule with rooms, batches and the class currently running.",
      },
      { property: "og:title", content: "My Timetable — CMADMS" },
      { property: "og:description", content: "Weekly teaching schedule for CMADMS faculty." },
    ],
  }),
  component: ProtectedTimetablePage,
});

function ProtectedTimetablePage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod", "student", "admin"]}>
      <TimetablePage />
    </RoleGuard>
  );
}

type ProcessedSlot = {
  id: string;
  subject: string;
  code: string;
  department: string;
  year: string;
  section: string;
  room: string;
  facultyName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  displayStart: string;
  displayEnd: string;
  periodType: string;
  semester?: number;
};

const DAY_KEYS = [
  { key: "Today", label: "Today" },
  { key: "Mon", label: "Monday", dow: 1 },
  { key: "Tue", label: "Tuesday", dow: 2 },
  { key: "Wed", label: "Wednesday", dow: 3 },
  { key: "Thu", label: "Thursday", dow: 4 },
  { key: "Fri", label: "Friday", dow: 5 },
  { key: "Sat", label: "Saturday", dow: 6 },
];

function formatTimeDisplay(t: string): string {
  if (!t) return "";
  const parts = t.split(":");
  let h = parseInt(parts[0] || "0", 10);
  const m = parts[1] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  const hh = String(h).padStart(2, "0");
  return `${hh}:${m} ${ampm}`;
}

function getPeriodBadge(periodType?: string) {
  const clean = (periodType || "CLASS").toUpperCase();
  switch (clean) {
    case "LAB":
      return {
        label: "🧪 LAB",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        note: "Attendance Required • 2-Hour Practical Block",
      };
    case "LIBRARY":
      return {
        label: "📚 LIBRARY",
        className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
        note: "Classroom Attendance: Not Required • Movement Monitoring: Disabled",
      };
    case "SPORTS":
      return {
        label: "⚽ SPORTS",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        note: "Expected Location: Sports Ground • Classroom Attendance: Not Required",
      };
    case "ACTIVITY":
      return {
        label: "🎨 ACTIVITY",
        className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
        note: "Co-Curricular Activity • Classroom Attendance: Not Required",
      };
    case "BREAK":
      return {
        label: "☕ BREAK",
        className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
        note: "10-Minute Morning Break • Normal Movement Allowed",
      };
    case "LUNCH":
      return {
        label: "🍱 LUNCH",
        className: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800",
        note: "Lunch Break • Normal Movement Allowed",
      };
    case "NO_CLASS":
      return {
        label: "— NO CLASS —",
        className: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800",
        note: "No Scheduled Academic Activity • Monitoring Disabled",
      };
    case "CLASS":
    default:
      return {
        label: "📖 CLASS",
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
        note: "Standard Academic Class • Attendance & Movement Monitored",
      };
  }
}

export function TimetablePage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { session, profile, role } = useAuth();
  const [selectedDay, setSelectedDay] = useState("Today");
  const [allSlots, setAllSlots] = useState<ProcessedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current day of week (1=Mon, ..., 7=Sun)
  const todayDow = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }, []);

  // Format current time HH:MM for "In session" checks
  const currentTimeStr = useMemo(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedule() {
      setLoading(true);
      try {
        let slotsData: any[] = [];

        if (role === "student") {
          const res = await getMyStudentTimetableApi();
          if (res.success && res.slots) {
            slotsData = res.slots;
          }
        } else if (role === "faculty" || role === "hod") {
          const facultyName = profile?.full_name || "";
          const res = await getAdminTimetableApi({
            data: facultyName ? { facultyName } : {},
          });
          if (res.success && res.slots) {
            slotsData = res.slots;
          }
        } else {
          const res = await getAdminTimetableApi({ data: {} });
          if (res.success && res.slots) {
            slotsData = res.slots;
          }
        }

        if (isMounted) {
          const mapped: ProcessedSlot[] = slotsData.map((s, idx) => ({
            id: s.id || `slot-${idx}`,
            subject: s.subject || "Scheduled Class",
            code: s.code || s.subject_code || "CS-100",
            department: s.department || "CSE",
            year: s.year || "3rd Year",
            section: s.section || "Section A",
            room: s.room || "Room C-204",
            facultyName: s.faculty_name || "Assigned Faculty",
            dayOfWeek: Number(s.day_of_week) || 1,
            startTime: s.start_time || "09:00",
            endTime: s.end_time || "10:00",
            displayStart: formatTimeDisplay(s.start_time),
            displayEnd: formatTimeDisplay(s.end_time),
            periodType: s.period_type || s.periodType || "CLASS",
            semester: s.semester || 1,
          }));
          setAllSlots(mapped);
        }
      } catch (err) {
        console.error("Failed to load timetable:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSchedule();
  }, [role, profile?.full_name]);

  // Determine active target Day of Week
  const targetDow = useMemo(() => {
    if (selectedDay === "Today") {
      return todayDow > 6 ? 1 : todayDow;
    }
    const found = DAY_KEYS.find((d) => d.key === selectedDay);
    return found?.dow ?? 1;
  }, [selectedDay, todayDow]);

  // Filter & sort slots for selected day
  const daySlots = useMemo(() => {
    return allSlots
      .filter((s) => s.dayOfWeek === targetDow)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allSlots, targetDow]);

  // Count slots per day for badge counters
  const slotCounts = useMemo(() => {
    const counts: Record<string, number> = { Today: 0 };
    DAY_KEYS.forEach((d) => {
      if (d.dow) {
        counts[d.key] = allSlots.filter((s) => s.dayOfWeek === d.dow).length;
      }
    });
    const effectiveTodayDow = todayDow > 6 ? 1 : todayDow;
    counts["Today"] = allSlots.filter((s) => s.dayOfWeek === effectiveTodayDow).length;
    return counts;
  }, [allSlots, todayDow]);

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="My Timetable"
          description="Your weekly academic schedule, assigned classrooms, and live class status."
          breadcrumb={[{ label: "Home", to: "/" }, { label: "Academic" }, { label: "Timetable" }]}
        />
      )}

      {/* Day Selector Tabs */}
      <div className="flex flex-nowrap overflow-x-auto pb-1.5 pt-0.5 gap-2 min-w-0 w-full no-scrollbar" role="tablist" aria-label="Select day">
        {DAY_KEYS.map((d) => {
          const count = slotCounts[d.key] || 0;
          const isSelected = selectedDay === d.key;
          return (
            <button
              key={d.key}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedDay(d.key)}
              className={cn(
                "flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-all duration-150 shadow-2xs shrink-0",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span>{d.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold leading-none",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Timetable Slot List Card */}
      <section className="card-surface p-5 sm:p-7">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="size-8 animate-spin text-primary/60" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">Loading timetable schedule...</p>
          </div>
        ) : daySlots.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No classes scheduled"
            description={`No academic periods scheduled for ${selectedDay === "Today" ? "today" : selectedDay}.`}
          />
        ) : (
          <div>
            {/* Mobile View (< 640px): Stacked Vertical Schedule Cards */}
            <div className="block sm:hidden space-y-3">
              {daySlots.map((s, i) => {
                const isTodaySelected = selectedDay === "Today" || targetDow === todayDow;
                const isInSession =
                  isTodaySelected &&
                  currentTimeStr >= s.startTime &&
                  currentTimeStr < s.endTime;
                const badge = getPeriodBadge(s.periodType);

                return (
                  <div
                    key={`mobile-${s.id}-${i}`}
                    className={cn(
                      "rounded-2xl border p-4 transition-all shadow-2xs space-y-3",
                      isInSession
                        ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                        <Clock className="size-4 shrink-0" />
                        <span>{s.displayStart} — {s.displayEnd}</span>
                      </div>
                      <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold border", badge.className)}>
                        {badge.label}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-extrabold text-foreground leading-snug break-words">
                          {s.subject}
                        </h3>
                        {isInSession && (
                          <ToneBadge tone="info" className="flex items-center gap-1 font-bold animate-pulse shrink-0">
                            <Sparkles className="size-3" /> In session
                          </ToneBadge>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-mono font-bold text-muted-foreground">{s.code}</p>
                    </div>

                    <p className="text-[11px] font-medium text-muted-foreground italic">
                      {badge.note}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-foreground pt-2.5 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">{s.department} {s.year} • {s.section}</span>
                      </div>
                      {s.room && (
                        <div className="flex items-center gap-1.5">
                          <DoorOpen className="size-3.5 text-primary shrink-0" />
                          <span className="truncate">{s.room}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View (>= 640px): Interactive Timeline Layout */}
            <ol className="hidden sm:block relative space-y-2">
              {daySlots.map((s, i) => {
                const isTodaySelected = selectedDay === "Today" || targetDow === todayDow;
                const isInSession =
                  isTodaySelected &&
                  currentTimeStr >= s.startTime &&
                  currentTimeStr < s.endTime;

                const badge = getPeriodBadge(s.periodType);

                return (
                  <li key={`desktop-${s.id}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Vertical Timeline Line */}
                    {i !== daySlots.length - 1 && (
                      <span
                        className="absolute left-[73px] top-6 h-full w-0.5 bg-border/80 sm:left-[89px]"
                        aria-hidden
                      />
                    )}

                    {/* Time Label Column */}
                    <div className="w-[56px] shrink-0 pt-2 text-right sm:w-[72px]">
                      <span className="block text-xs font-bold text-foreground sm:text-sm">
                        {s.displayStart.split(" ")[0]}
                      </span>
                      <span className="block text-[10px] font-semibold text-muted-foreground">
                        {s.displayStart.split(" ")[1]}
                      </span>
                    </div>

                    {/* Timeline Circle Node */}
                    <span
                      className={cn(
                        "z-10 mt-3.5 size-3.5 shrink-0 rounded-full border-2 bg-card transition-all shadow-2xs",
                        isInSession
                          ? "border-primary bg-primary ring-4 ring-primary/20"
                          : "border-muted-foreground/40",
                      )}
                      aria-hidden
                    />

                    {/* Period Card Content */}
                    <div
                      className={cn(
                        "min-w-0 flex-1 rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs",
                        isInSession
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-xs",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-base font-bold tracking-tight text-foreground">
                            {s.subject}
                          </h3>
                          <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground border border-border">
                            {s.code}
                          </span>
                          <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold border", badge.className)}>
                            {badge.label}
                          </span>
                        </div>
                        {isInSession && (
                          <ToneBadge tone="info" className="flex items-center gap-1 font-bold animate-pulse">
                            <Sparkles className="size-3" /> In session
                          </ToneBadge>
                        )}
                      </div>

                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        <Clock className="inline size-3.5 mr-1 text-primary/70" />
                        {s.displayStart} — {s.displayEnd}
                      </p>

                      <p className="mt-2 text-[11px] font-medium text-muted-foreground italic">
                        {badge.note}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-subtle-foreground border-t border-border/50 pt-3">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Users className="size-4 text-primary/80" aria-hidden />
                          {s.department} {s.year} &bull; {s.section}
                        </span>
                        {s.room && (
                          <span className="flex items-center gap-1.5 font-semibold text-foreground">
                            <DoorOpen className="size-4 text-primary/80" aria-hidden />
                            {s.room}
                          </span>
                        )}
                        {role !== "faculty" && s.facultyName && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <UserCheck className="size-4 text-muted-foreground" aria-hidden />
                            {s.facultyName}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}

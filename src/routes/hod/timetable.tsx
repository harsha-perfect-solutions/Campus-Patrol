import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  DoorOpen,
  GraduationCap,
  Users,
  Search,
  BookOpen,
  LayoutGrid,
  List,
  Sparkles,
  Printer,
  Table as TableIcon,
  CheckCircle2,
  Calendar,
  Layers,
  FlaskConical,
  Coffee,
  Utensils,
  Trophy,
  BookMarked,
  ShieldCheck,
  User,
  ChevronRight,
  Info,
  FileSpreadsheet,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { getAdminTimetableApi } from "@/lib/api/timetable.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hod/timetable")({
  head: () => ({
    meta: [
      { title: "Department Timetable & Subject Allocation — HOD Portal" },
      {
        name: "description",
        content:
          "Department teaching schedule, classroom allocations, and faculty subject mappings by academic year and section.",
      },
    ],
  }),
  component: HODTimetablePage,
});

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
  semester?: number | undefined;
  credits?: number | undefined;
};

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const SECTIONS = ["Section A", "Section B", "Section C", "Section D"] as const;

const DAY_KEYS = [
  { key: "Today", label: "Today" },
  { key: "Mon", label: "Monday", dow: 1, short: "MON" },
  { key: "Tue", label: "Tuesday", dow: 2, short: "TUE" },
  { key: "Wed", label: "Wednesday", dow: 3, short: "WED" },
  { key: "Thu", label: "Thursday", dow: 4, short: "THU" },
  { key: "Fri", label: "Friday", dow: 5, short: "FRI" },
  { key: "Sat", label: "Saturday", dow: 6, short: "SAT" },
];

const OFFICIAL_PERIODS = [
  { period: "1", start: "09:00", end: "10:00", startDisplay: "9.00 AM", endDisplay: "10.00 AM" },
  { period: "2", start: "10:00", end: "11:00", startDisplay: "10.00 AM", endDisplay: "11.00 AM" },
  { period: "BREAK", start: "11:00", end: "11:10", startDisplay: "11.00 AM", endDisplay: "11.10 AM", isBreak: true },
  { period: "3", start: "11:10", end: "12:10", startDisplay: "11.10 AM", endDisplay: "12.10 PM" },
  { period: "4", start: "12:10", end: "13:10", startDisplay: "12.10 PM", endDisplay: "1.10 PM" },
  { period: "LUNCH", start: "13:10", end: "14:10", startDisplay: "1.10 PM", endDisplay: "2.00 PM", isLunch: true },
  { period: "5", start: "14:10", end: "15:10", startDisplay: "2.00 PM", endDisplay: "3.00 PM" },
  { period: "6", start: "15:10", end: "16:10", startDisplay: "3.00 PM", endDisplay: "4.00 PM" },
  { period: "7", start: "16:10", end: "17:00", startDisplay: "4.00 PM", endDisplay: "5.00 PM" },
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

function getPeriodBadgeConfig(periodType?: string) {
  const clean = (periodType || "CLASS").toUpperCase();
  switch (clean) {
    case "LAB":
      return {
        label: "LAB (Practical)",
        icon: FlaskConical,
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      };
    case "LIBRARY":
      return {
        label: "LIBRARY / STUDY",
        icon: BookMarked,
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
      };
    case "SPORTS":
      return {
        label: "SPORTS / FITNESS",
        icon: Trophy,
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      };
    case "ACTIVITY":
      return {
        label: "CLUB / ACTIVITY",
        icon: Sparkles,
        className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
      };
    case "BREAK":
      return {
        label: "MORNING BREAK",
        icon: Coffee,
        className: "bg-muted text-muted-foreground border-border",
      };
    case "LUNCH":
      return {
        label: "LUNCH BREAK",
        icon: Utensils,
        className: "bg-muted text-muted-foreground border-border",
      };
    case "CLASS":
    default:
      return {
        label: "LECTURE",
        icon: BookOpen,
        className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
      };
  }
}

function getFacultyInitials(name?: string): string {
  if (!name || name === "-" || name.toLowerCase().includes("assigned")) return "FAC";
  const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, "").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 3).toUpperCase();
}

function getFacultyShortCode(name?: string): string {
  if (!name || name === "-" || name.toLowerCase().includes("assigned")) return "FAC";
  const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, "").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
    return `${parts[0][0]}${parts[1][0]}${parts[2][0]}`.toUpperCase();
  }
  if (parts.length === 2 && parts[0] && parts[1]) {
    return `${parts[0].slice(0, 2)}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 4).toUpperCase();
}

function getSemesterNumber(year: string): number {
  if (year === "1st Year") return 1;
  if (year === "2nd Year") return 3;
  if (year === "3rd Year") return 5;
  if (year === "4th Year") return 7;
  return 5;
}

function getSemesterRoman(sem: number): string {
  const map: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII" };
  return map[sem] || "V";
}

function HODTimetablePage() {
  const { profile } = useAuth();
  const userDept = profile?.department || "CSE";

  // Selection states
  const [selectedYear, setSelectedYear] = useState<string>("3rd Year");
  const [selectedSection, setSelectedSection] = useState<string>("Section A");
  const [selectedDay, setSelectedDay] = useState<string>("Today");
  const [viewMode, setViewMode] = useState<"grid" | "day" | "allocation">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Data & loading
  const [allSlots, setAllSlots] = useState<ProcessedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Day calculations
  const todayDow = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }, []);

  const currentTimeStr = useMemo(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }, []);

  // Fetch slots for selected department, year & section
  useEffect(() => {
    let isMounted = true;

    async function loadTimetable() {
      setLoading(true);
      try {
        const res = await getAdminTimetableApi({
          data: {
            department: userDept,
            year: selectedYear,
            section: selectedSection,
          },
        });

        if (isMounted) {
          if (res.success && res.slots) {
            const mapped: ProcessedSlot[] = res.slots.map((s, idx) => ({
              id: s.id || `slot-${idx}`,
              subject: s.subject || "Scheduled Subject",
              code: s.code || s.subject_code || "CS-000",
              department: s.department || userDept,
              year: s.year || selectedYear,
              section: s.section || selectedSection,
              room: s.room || "2-S-08",
              facultyName: s.faculty_name || "Faculty Incharge",
              dayOfWeek: Number(s.day_of_week) || 1,
              startTime: s.start_time || "09:00",
              endTime: s.end_time || "10:00",
              displayStart: formatTimeDisplay(s.start_time),
              displayEnd: formatTimeDisplay(s.end_time),
              periodType: s.period_type || "CLASS",
              semester: s.semester || getSemesterNumber(selectedYear),
              credits: (s.period_type || "").toUpperCase() === "LAB" ? 1.5 : 3,
            }));
            setAllSlots(mapped);
          } else {
            setAllSlots([]);
          }
        }
      } catch (err) {
        console.error("Failed to load department timetable:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTimetable();

    return () => {
      isMounted = false;
    };
  }, [userDept, selectedYear, selectedSection]);

  const activeSemester = useMemo(() => getSemesterNumber(selectedYear), [selectedYear]);
  const activeRoom = useMemo(() => {
    const found = allSlots.find((s) => s.room && s.room !== "-" && s.room !== "Central Library" && s.room !== "Ground");
    return found?.room || (selectedYear === "3rd Year" ? "2-S-08" : "R-101");
  }, [allSlots, selectedYear]);

  // Target day of week for Day Schedule view
  const targetDow = useMemo(() => {
    if (selectedDay === "Today") {
      return todayDow > 6 ? 1 : todayDow;
    }
    const found = DAY_KEYS.find((d) => d.key === selectedDay);
    return found?.dow ?? 1;
  }, [selectedDay, todayDow]);

  // Filtered slots for selected day
  const daySlots = useMemo(() => {
    let slots = allSlots.filter((s) => s.dayOfWeek === targetDow);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      slots = slots.filter(
        (s) =>
          s.subject.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.facultyName.toLowerCase().includes(q) ||
          s.room.toLowerCase().includes(q),
      );
    }
    return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allSlots, targetDow, searchQuery]);

  // Day counts
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

  // Unique Subjects & Faculty Allocation Summary (Lower Table)
  const subjectAllocationSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        sNo: number;
        code: string;
        subject: string;
        facultyName: string;
        room: string;
        periodType: string;
        weeklyCount: number;
        semester?: number | undefined;
        credits: number;
      }
    >();

    let counter = 1;
    allSlots.forEach((s) => {
      const cleanType = (s.periodType || "CLASS").toUpperCase();
      if (cleanType === "BREAK" || cleanType === "LUNCH") return;

      const key = `${s.code}-${s.subject}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.weeklyCount += 1;
        if (s.facultyName && existing.facultyName === "Faculty Incharge") {
          existing.facultyName = s.facultyName;
        }
      } else {
        const cred = cleanType === "LAB" ? 1.5 : cleanType === "ACTIVITY" ? 2 : 3;
        map.set(key, {
          sNo: counter++,
          code: s.code,
          subject: s.subject,
          facultyName: s.facultyName,
          room: s.room,
          periodType: s.periodType,
          weeklyCount: 1,
          semester: s.semester,
          credits: cred,
        });
      }
    });

    const list = Array.from(map.values());
    list.forEach((item, idx) => {
      item.sNo = idx + 1;
    });
    return list;
  }, [allSlots]);

  // Quick stats
  const stats = useMemo(() => {
    const academicSlots = allSlots.filter(
      (s) => !["BREAK", "LUNCH"].includes((s.periodType || "").toUpperCase()),
    );
    const facultySet = new Set(
      academicSlots
        .map((s) => s.facultyName)
        .filter((f) => f && f !== "-" && !f.toLowerCase().includes("assigned")),
    );
    const labSlots = allSlots.filter((s) => (s.periodType || "").toUpperCase() === "LAB");

    return {
      totalWeeklyPeriods: academicSlots.length,
      uniqueSubjects: subjectAllocationSummary.length,
      activeFaculty: facultySet.size,
      labSessions: labSlots.length,
    };
  }, [allSlots, subjectAllocationSummary]);

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        {/* Global Print Style for Official Institutional Format */}
        <style>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 4mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            header, nav, aside, footer, .print\\:hidden {
              display: none !important;
            }
            #official-print-sheet {
              display: block !important;
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 2px !important;
              border: 2px solid #000000 !important;
              box-shadow: none !important;
              page-break-inside: avoid !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        {/* Page Header (Hidden during browser print) */}
        <div className="print:hidden space-y-6">
          <PageHeader
            title="Department Master Timetable"
            description={`Official teaching schedule, room allocations & faculty subject mapping for ${userDept} Department.`}
            breadcrumb={[
              { label: "HOD Portal", to: "/hod/dashboard" },
              { label: "Academic Administration" },
              { label: "Department Timetable" },
            ]}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 text-xs font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => window.print()}
                >
                  <Printer className="size-3.5" />
                  <span>Print Timetable</span>
                </Button>
              </div>
            }
          />

          {/* 1. Year & Section Selector Card */}
          <div className="card-surface p-4 sm:p-5 rounded-2xl border border-border/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Year Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-primary" />
                  Select Academic Year
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {YEARS.map((y) => {
                    const isActive = selectedYear === y;
                    return (
                      <button
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 border shadow-2xs",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60",
                        )}
                      >
                        <GraduationCap className={cn("size-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span>{y}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  Select Section
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {SECTIONS.map((sec) => {
                    const isActive = selectedSection === sec;
                    return (
                      <button
                        key={sec}
                        onClick={() => setSelectedSection(sec)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 border shadow-2xs",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60",
                        )}
                      >
                        <span>{sec}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Banner */}
            <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  {userDept} • {selectedYear} • {selectedSection} • Semester {getSemesterRoman(activeSemester)}
                </span>
                <span className="text-muted-foreground">
                  Lecture Hall / Room: <strong className="text-foreground">{activeRoom}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 2. Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="card-surface p-4 rounded-xl border border-border/70 shadow-xs flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <BookOpen className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Total Classes
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
                  {stats.totalWeeklyPeriods} <span className="text-xs font-medium text-muted-foreground">/ wk</span>
                </p>
              </div>
            </div>

            <div className="card-surface p-4 rounded-xl border border-border/70 shadow-xs flex items-center gap-3">
              <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Layers className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Subjects Taught
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
                  {stats.uniqueSubjects} <span className="text-xs font-medium text-muted-foreground">courses</span>
                </p>
              </div>
            </div>

            <div className="card-surface p-4 rounded-xl border border-border/70 shadow-xs flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Faculty Assigned
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
                  {stats.activeFaculty} <span className="text-xs font-medium text-muted-foreground">teachers</span>
                </p>
              </div>
            </div>

            <div className="card-surface p-4 rounded-xl border border-border/70 shadow-xs flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FlaskConical className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Lab / Practical
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
                  {stats.labSessions} <span className="text-xs font-medium text-muted-foreground">blocks</span>
                </p>
              </div>
            </div>
          </div>

          {/* 3. View Mode Switcher & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 self-start">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" />
                <span>Weekly Grid</span>
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  viewMode === "day"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-3.5" />
                <span>Day Schedule</span>
              </button>
              <button
                onClick={() => setViewMode("allocation")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  viewMode === "allocation"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <TableIcon className="size-3.5" />
                <span>Faculty Directory</span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject or faculty..."
                className="pl-9 h-9 text-xs rounded-xl bg-card border-border shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL COLLEGE TIMETABLE SHEET (MATCHES UPLOADED PRINT FORMAT)          */}
        {/* Rendered ONLY during browser print via @media print                       */}
        {/* ========================================================================= */}
        <div
          id="official-print-sheet"
          className="hidden print:block bg-white text-black font-sans p-3 border-2 border-black space-y-2 max-w-full overflow-hidden"
        >
          {/* Top Institutional Header Box */}
          <div className="border border-black p-2 text-[10px] leading-tight space-y-1 bg-white">
            <div className="flex items-center justify-between border-b border-black pb-1 mb-1 font-bold">
              <div>
                <span className="text-[11px] tracking-wide uppercase font-black block">
                  CAMPUS MOVEMENT & ABSENCE DETECTION SYSTEM (CMADMS)
                </span>
                <span className="text-[10px] font-semibold text-black/80 block">
                  DEPARTMENT OF {userDept.toUpperCase()} ENGINEERING • MASTER CLASS SCHEDULE
                </span>
              </div>
              <div className="text-right text-[9px] text-black font-mono">
                <span>DOC: GMRIT/ADM/F-26</span> | <span>REV.: 01</span> | <span>w.e.f: 08-12-2025</span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <div>
                <span className="font-bold">Semester:</span> {getSemesterRoman(activeSemester)} & {getSemesterRoman(activeSemester + 1)} ({selectedYear})
              </div>
              <div className="text-center">
                <span className="font-bold">Academic Year:</span> 2025-26
              </div>
              <div className="text-right">
                <span className="font-bold">Section:</span> {selectedSection.replace("Section ", "")}
              </div>
              <div>
                <span className="font-bold">Chief Mentor:</span> Dr. K. V. Sharma (HOD)
              </div>
              <div className="text-center">
                <span className="font-bold">Lecture Hall No:</span> {activeRoom}
              </div>
              <div className="text-right">
                <span className="font-bold">Department:</span> {userDept}
              </div>
            </div>
          </div>

          {/* UPPER TABLE: Timetable Matrix */}
          <table className="w-full border-collapse border-2 border-black text-center text-[10px]">
            <thead>
              {/* Row 1: Period Numbers */}
              <tr className="border-b border-black bg-neutral-100 font-bold">
                <th className="border border-black p-1 w-14 text-center" rowSpan={3}>Timing</th>
                <th className="border border-black p-0.5 text-center font-bold">1</th>
                <th className="border border-black p-0.5 text-center font-bold">2</th>
                <th className="border border-black p-0 text-center w-8 bg-neutral-100 font-bold text-[8px] uppercase tracking-wider" rowSpan={3}>
                  <div className="py-0.5 flex flex-col items-center leading-none">
                    <span>11.00</span>
                    <span>AM</span>
                    <span>-</span>
                    <span>11.10</span>
                    <span>AM</span>
                  </div>
                </th>
                <th className="border border-black p-0.5 text-center font-bold">3</th>
                <th className="border border-black p-0.5 text-center font-bold">4</th>
                <th className="border border-black p-0 text-center w-8 bg-neutral-100 font-bold text-[8px] uppercase tracking-wider" rowSpan={3}>
                  <div className="py-0.5 flex flex-col items-center leading-none">
                    <span>1.10</span>
                    <span>PM</span>
                    <span>-</span>
                    <span>2.00</span>
                    <span>PM</span>
                  </div>
                </th>
                <th className="border border-black p-0.5 text-center font-bold">5</th>
                <th className="border border-black p-0.5 text-center font-bold">6</th>
                <th className="border border-black p-0.5 text-center font-bold">7</th>
              </tr>

              {/* Row 2: Start Time */}
              <tr className="border-b border-black text-[9px] font-semibold">
                <th className="border border-black p-0.5 bg-neutral-100 font-bold">Start Time</th>
                <td className="border border-black p-0.5">9.00 AM</td>
                <td className="border border-black p-0.5">10.00 AM</td>
                <td className="border border-black p-0.5">11.10 AM</td>
                <td className="border border-black p-0.5">12.10 PM</td>
                <td className="border border-black p-0.5">2.00 PM</td>
                <td className="border border-black p-0.5">3.00 PM</td>
                <td className="border border-black p-0.5">4.00 PM</td>
              </tr>

              {/* Row 3: End Time */}
              <tr className="border-b-2 border-black text-[9px] font-semibold">
                <th className="border border-black p-0.5 bg-neutral-100 font-bold">End Time</th>
                <td className="border border-black p-0.5">10.00 AM</td>
                <td className="border border-black p-0.5">11.00 AM</td>
                <td className="border border-black p-0.5">12.10 PM</td>
                <td className="border border-black p-0.5">1.10 PM</td>
                <td className="border border-black p-0.5">3.00 PM</td>
                <td className="border border-black p-0.5">4.00 PM</td>
                <td className="border border-black p-0.5">5.00 PM</td>
              </tr>
            </thead>

            <tbody>
              {[
                { dow: 1, label: "MON" },
                { dow: 2, label: "TUE" },
                { dow: 3, label: "WED" },
                { dow: 4, label: "THU" },
                { dow: 5, label: "FRI" },
                { dow: 6, label: "SAT" },
              ].map(({ dow, label }, index) => {
                const slotsForDay = allSlots.filter((s) => s.dayOfWeek === dow);

                const getSlot = (pNum: number) => {
                  const def = OFFICIAL_PERIODS.find((p) => p.period === String(pNum));
                  if (!def) return null;
                  return slotsForDay.find(
                    (s) =>
                      s.startTime <= def.start &&
                      s.endTime >= def.end &&
                      !["BREAK", "LUNCH"].includes((s.periodType || "").toUpperCase()),
                  );
                };

                const s1 = getSlot(1);
                const s2 = getSlot(2);
                const s3 = getSlot(3);
                const s4 = getSlot(4);
                const s5 = getSlot(5);
                const s6 = getSlot(6);
                const s7 = getSlot(7);

                const isLab12 = s1 && s2 && s1.code === s2.code && (s1.periodType === "LAB" || s1.endTime >= "11:00");
                const isLab34 = s3 && s4 && s3.code === s4.code && (s3.periodType === "LAB" || s3.endTime >= "13:00");
                const isLab56 = s5 && s6 && s5.code === s6.code && (s5.periodType === "LAB" || s5.endTime >= "16:00");

                return (
                  <tr key={dow} className="border-b border-black text-black">
                    {/* Day Name */}
                    <td className="border border-black p-0.5 font-bold bg-neutral-100 text-center text-[10px]">
                      {label}
                    </td>

                    {/* Period 1 & 2 */}
                    {isLab12 ? (
                      <td colSpan={2} className="border border-black p-0.5 text-center bg-neutral-50/50">
                        <div className="font-bold text-[10px] tracking-wide">
                          &lt;———— {s1.code} ————&gt;
                        </div>
                        <div className="text-[9px] font-semibold text-black/80">
                          {getFacultyShortCode(s1.facultyName)}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="border border-black p-0.5 text-center">
                          {s1 ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-[10px]">{s1.code}</div>
                              <div className="text-[9px] font-semibold text-black/75">{getFacultyShortCode(s1.facultyName)}</div>
                            </div>
                          ) : (
                            <span className="text-black/30">—</span>
                          )}
                        </td>
                        <td className="border border-black p-0.5 text-center">
                          {s2 ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-[10px]">{s2.code}</div>
                              <div className="text-[9px] font-semibold text-black/75">{getFacultyShortCode(s2.facultyName)}</div>
                            </div>
                          ) : (
                            <span className="text-black/30">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* BREAK: Spans all 6 days vertically */}
                    {index === 0 && (
                      <td
                        rowSpan={6}
                        className="border border-black bg-neutral-100 p-0 text-center font-extrabold text-[11px] tracking-widest align-middle w-8"
                      >
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span>B</span>
                          <span>R</span>
                          <span>E</span>
                          <span>A</span>
                          <span>K</span>
                        </div>
                      </td>
                    )}

                    {/* Period 3 & 4 */}
                    {isLab34 ? (
                      <td colSpan={2} className="border border-black p-0.5 text-center bg-neutral-50/50">
                        <div className="font-bold text-[10px] tracking-wide">
                          &lt;———— {s3.code} ————&gt;
                        </div>
                        <div className="text-[9px] font-semibold text-black/80">
                          {getFacultyShortCode(s3.facultyName)}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="border border-black p-0.5 text-center">
                          {s3 ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-[10px]">{s3.code}</div>
                              <div className="text-[9px] font-semibold text-black/75">{getFacultyShortCode(s3.facultyName)}</div>
                            </div>
                          ) : (
                            <span className="text-black/30">—</span>
                          )}
                        </td>
                        <td className="border border-black p-0.5 text-center">
                          {s4 ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-[10px]">{s4.code}</div>
                              <div className="text-[9px] font-semibold text-black/75">{getFacultyShortCode(s4.facultyName)}</div>
                            </div>
                          ) : (
                            <span className="text-black/30">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* LUNCH: Spans all 6 days vertically */}
                    {index === 0 && (
                      <td
                        rowSpan={6}
                        className="border border-black bg-neutral-100 p-0 text-center font-extrabold text-[11px] tracking-widest align-middle w-8"
                      >
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span>L</span>
                          <span>U</span>
                          <span>N</span>
                          <span>C</span>
                          <span>H</span>
                        </div>
                      </td>
                    )}

                    {/* Period 5 & 6 & 7 */}
                    {isLab56 ? (
                      <td colSpan={2} className="border border-black p-0.5 text-center bg-neutral-50/50">
                        <div className="font-bold text-[10px] tracking-wide">
                          &lt;———— {s5.code} ————&gt;
                        </div>
                        <div className="text-[9px] font-semibold text-black/80">
                          {getFacultyShortCode(s5.facultyName)}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="border border-black p-0.5 text-center">
                          {s5 ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-[10px]">{s5.code}</div>
                              <div className="text-[9px] font-semibold text-black/75">{getFacultyShortCode(s5.facultyName)}</div>
                            </div>
                          ) : (
                            <span className="text-black/30">—</span>
                          )}
                        </td>
                        <td className="border border-black p-0.5 text-center">
                          {s6 ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-[10px]">{s6.code}</div>
                              <div className="text-[9px] font-semibold text-black/75">{getFacultyShortCode(s6.facultyName)}</div>
                            </div>
                          ) : (
                            <span className="text-black/30">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Period 7 */}
                    <td className="border border-black p-0.5 text-center">
                      {s7 ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-[10px]">{s7.code}</div>
                          <div className="text-[9px] font-semibold text-black/75">{getFacultyShortCode(s7.facultyName)}</div>
                        </div>
                      ) : (
                        <div className="text-[8px] text-black/60 italic font-medium leading-none">LIBRARY / COUNSELLING</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* LOWER TABLE: Subject & Faculty Legend Table */}
          <div className="pt-0.5">
            <table className="w-full border-collapse border-2 border-black text-left text-[9px]">
              <thead>
                <tr className="bg-neutral-100 border-b-2 border-black font-bold">
                  <th className="border border-black p-1 w-8 text-center">S.No</th>
                  <th className="border border-black p-1 w-16 text-center">Code</th>
                  <th className="border border-black p-1">Course Title</th>
                  <th className="border border-black p-1 w-12 text-center">Credits</th>
                  <th className="border border-black p-1">Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {subjectAllocationSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-1 text-center text-muted-foreground border border-black">
                      No subject mappings found for this class.
                    </td>
                  </tr>
                ) : (
                  subjectAllocationSummary.map((sub) => (
                    <tr key={sub.code} className="hover:bg-neutral-50">
                      <td className="border border-black p-0.5 text-center font-bold">{sub.sNo}</td>
                      <td className="border border-black p-0.5 text-center font-mono font-bold">{sub.code}</td>
                      <td className="border border-black p-0.5 font-semibold">{sub.subject}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{sub.credits}</td>
                      <td className="border border-black p-0.5 font-medium">{sub.facultyName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Official Bottom Signatures Section */}
          <div className="pt-4 pb-0 flex items-center justify-between text-[10px] font-bold text-black px-6">
            <div className="text-center">
              <span className="block border-t border-black pt-0.5 px-3">Class Mentor</span>
            </div>
            <div className="text-center">
              <span className="block border-t border-black pt-0.5 px-3">Academic Coordinator</span>
            </div>
            <div className="text-center">
              <span className="block border-t border-black pt-0.5 px-3">Head of the Department (HOD)</span>
            </div>
          </div>
        </div>

        {/* VIEW 2: DAY SCHEDULE VIEW */}
        {viewMode === "day" && (
          <div className="space-y-4 print:hidden">
            {/* Day Selector Tabs */}
            <div className="flex flex-nowrap overflow-x-auto pb-1 pt-0.5 gap-2 min-w-0 w-full no-scrollbar">
              {DAY_KEYS.map((d) => {
                const isActive = selectedDay === d.key;
                const count = slotCounts[d.key] || 0;
                return (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDay(d.key)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 border shrink-0 shadow-2xs",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/70",
                    )}
                  >
                    <span>{d.label}</span>
                    <span
                      className={cn(
                        "size-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slots List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/40"
                  />
                ))}
              </div>
            ) : daySlots.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No Classes Scheduled"
                description={`No teaching periods scheduled for ${selectedDay} in ${userDept} ${selectedYear} (${selectedSection}).`}
              />
            ) : (
              <div className="space-y-3">
                {daySlots.map((slot) => {
                  const badgeCfg = getPeriodBadgeConfig(slot.periodType);
                  const BadgeIcon = badgeCfg.icon;
                  const isBreak = ["BREAK", "LUNCH"].includes((slot.periodType || "").toUpperCase());
                  const isRunningNow =
                    selectedDay === "Today" &&
                    slot.dayOfWeek === todayDow &&
                    currentTimeStr >= slot.startTime &&
                    currentTimeStr < slot.endTime;

                  if (isBreak) {
                    return (
                      <div
                        key={slot.id}
                        className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/30 flex items-center justify-between gap-4 text-muted-foreground"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            <BadgeIcon className="size-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {slot.subject}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {badgeCfg.label}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted border border-border">
                          {slot.displayStart} - {slot.displayEnd}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        "card-surface p-4 sm:p-5 rounded-2xl border transition-all duration-150 shadow-xs relative overflow-hidden",
                        isRunningNow
                          ? "border-emerald-500/60 ring-2 ring-emerald-500/20 bg-emerald-500/[0.03]"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {isRunningNow && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-bl-xl shadow-xs flex items-center gap-1.5 animate-pulse">
                          <span className="size-1.5 rounded-full bg-white" />
                          Class In Session Now
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Subject & Timing */}
                        <div className="space-y-2 flex-1 min-w-0">
                          {/* Period & Timing Pill */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-lg border border-border/60">
                              <Clock className="size-3 text-primary" />
                              {slot.displayStart} - {slot.displayEnd}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border",
                                badgeCfg.className,
                              )}
                            >
                              <BadgeIcon className="size-3" />
                              {badgeCfg.label}
                            </span>
                          </div>

                          {/* Subject Title */}
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                              {slot.subject}
                            </h3>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {slot.code}
                            </span>
                          </div>

                          {/* Room Location */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border font-medium text-foreground">
                              <DoorOpen className="size-3.5 text-primary" />
                              {slot.room}
                            </span>
                            <span>•</span>
                            <span>
                              {slot.year} ({slot.section})
                            </span>
                          </div>
                        </div>

                        {/* Faculty Profile Card (Prominent & Clear) */}
                        <div className="md:w-72 p-3 sm:p-3.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/80 flex items-center gap-3 shrink-0">
                          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {getFacultyInitials(slot.facultyName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Assigned Faculty
                            </span>
                            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                              {slot.facultyName}
                            </p>
                            <span className="text-[11px] text-muted-foreground font-medium truncate block">
                              {userDept} Department
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: WEEKLY TIMETABLE MATRIX GRID */}
        {viewMode === "grid" && (
          <div className="card-surface p-4 sm:p-5 rounded-2xl border border-border/80 shadow-xs space-y-4 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Weekly Schedule Matrix — {selectedYear} ({selectedSection})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Complete Monday through Saturday timetable grid with designated faculty for each period.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full border-collapse text-left text-xs min-w-[950px]">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="p-3 font-bold text-muted-foreground w-28 uppercase tracking-wider">
                      Day
                    </th>
                    {OFFICIAL_PERIODS.map((p) => (
                      <th
                        key={p.period}
                        className={cn(
                          "p-2.5 font-bold text-center border-l border-border",
                          p.isBreak || p.isLunch ? "w-20 bg-muted/30 text-muted-foreground" : "w-36 text-foreground",
                        )}
                      >
                        <span className="block text-[11px]">
                          {p.isBreak ? "Break" : p.isLunch ? "Lunch" : `Period ${p.period}`}
                        </span>
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {p.startDisplay} - {p.endDisplay}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[1, 2, 3, 4, 5, 6].map((dow) => {
                    const dayLabel = DAY_KEYS.find((d) => d.dow === dow)?.label || `Day ${dow}`;
                    const isCurrentDay = todayDow === dow;

                    return (
                      <tr
                        key={dow}
                        className={cn(
                          "hover:bg-muted/20 transition-colors",
                          isCurrentDay && "bg-primary/[0.02]",
                        )}
                      >
                        <td className="p-3 font-bold text-foreground align-top bg-muted/30 border-r border-border">
                          <div className="flex items-center gap-1.5">
                            {isCurrentDay && <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />}
                            <span>{dayLabel}</span>
                          </div>
                        </td>

                        {OFFICIAL_PERIODS.map((periodDef) => {
                          if (periodDef.isBreak || periodDef.isLunch) {
                            return (
                              <td
                                key={periodDef.period}
                                className="p-2 text-center align-middle bg-muted/20 border-r border-border text-muted-foreground text-[10px] font-medium"
                              >
                                {periodDef.isBreak ? "BREAK" : "LUNCH"}
                              </td>
                            );
                          }

                          // Find matching slot for this day and time
                          const slot = allSlots.find(
                            (s) =>
                              s.dayOfWeek === dow &&
                              s.startTime <= periodDef.start &&
                              s.endTime >= periodDef.end,
                          );

                          if (!slot) {
                            return (
                              <td
                                key={periodDef.period}
                                className="p-2 text-center align-middle border-r border-border text-muted-foreground/50 text-[11px] bg-muted/5"
                              >
                                —
                              </td>
                            );
                          }

                          const badgeCfg = getPeriodBadgeConfig(slot.periodType);

                          return (
                            <td
                              key={periodDef.period}
                              className="p-2 align-top border-r border-border min-w-[130px]"
                            >
                              <div
                                className={cn(
                                  "p-2 rounded-xl border text-xs space-y-1 shadow-2xs transition-all",
                                  badgeCfg.className,
                                )}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-[11px] truncate" title={slot.subject}>
                                    {slot.subject}
                                  </span>
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-card/60 border border-border shrink-0">
                                    {slot.code}
                                  </span>
                                </div>
                                <div className="text-[10px] font-semibold text-foreground/90 flex items-center gap-1 truncate" title={slot.facultyName}>
                                  <User className="size-2.5 text-primary shrink-0" />
                                  <span className="truncate">{slot.facultyName}</span>
                                </div>
                                <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                                  <DoorOpen className="size-2.5 shrink-0" />
                                  <span>{slot.room}</span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: FACULTY & SUBJECT ALLOCATION SUMMARY */}
        {viewMode === "allocation" && (
          <div className="card-surface p-4 sm:p-5 rounded-2xl border border-border/80 shadow-xs space-y-4 print:hidden">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Faculty Subject Allocation Directory — {selectedYear} ({selectedSection})
              </h3>
              <p className="text-xs text-muted-foreground">
                Assigned professors and designated classrooms for all active subjects in this class.
              </p>
            </div>

            {subjectAllocationSummary.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Subjects Allocated"
                description={`No active subject allocations found for ${userDept} ${selectedYear} (${selectedSection}).`}
              />
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      <th className="p-3 font-bold text-muted-foreground uppercase tracking-wider w-12 text-center">
                        S.No
                      </th>
                      <th className="p-3 font-bold text-muted-foreground uppercase tracking-wider w-24">
                        Code
                      </th>
                      <th className="p-3 font-bold text-muted-foreground uppercase tracking-wider">
                        Course Title
                      </th>
                      <th className="p-3 font-bold text-muted-foreground uppercase tracking-wider">
                        Assigned Faculty Member
                      </th>
                      <th className="p-3 font-bold text-muted-foreground uppercase tracking-wider">
                        Room
                      </th>
                      <th className="p-3 font-bold text-muted-foreground text-center uppercase tracking-wider w-20">
                        Credits
                      </th>
                      <th className="p-3 font-bold text-muted-foreground text-center uppercase tracking-wider w-24">
                        Weekly Hrs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subjectAllocationSummary.map((sub) => {
                      return (
                        <tr key={sub.code} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-center font-bold text-muted-foreground">
                            {sub.sNo}
                          </td>
                          <td className="p-3 font-mono font-bold text-primary">
                            {sub.code}
                          </td>
                          <td className="p-3 font-bold text-foreground">
                            {sub.subject}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                {getFacultyInitials(sub.facultyName)}
                              </div>
                              <div>
                                <span className="font-bold text-foreground block">
                                  {sub.facultyName}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {userDept} Faculty
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/60 border border-border">
                              <DoorOpen className="size-3 text-primary" />
                              {sub.room}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-foreground">
                            {sub.credits}
                          </td>
                          <td className="p-3 text-center font-extrabold text-foreground">
                            {sub.weeklyCount} hrs/wk
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
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
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  RotateCcw,
  Building2,
  UserCheck,
  Check,
  ChevronsUpDown,
  PlusCircle,
  MapPin,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  getAdminTimetableApi,
  addTimetableSlotApi,
  updateTimetableSlotApi,
  deleteTimetableSlotApi,
  getDynamicSubjectsApi,
} from "@/lib/api/timetable.server";
import { getAdminFacultyListApi } from "@/lib/api/faculty.server";
import { getCampusRoomsApi } from "@/lib/api/rooms.server";
import type { CampusRoom } from "@/lib/db/rooms.server";
import type { DBClassSlot, TimetableSlotInput, PeriodType } from "@/lib/db/timetable.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hod/timetable")({
  head: () => ({
    meta: [
      { title: "Department Timetable Management — HOD Portal" },
      {
        name: "description",
        content:
          "Manage department teaching schedule, slot creation, editing, classroom allocations, and faculty subject mappings.",
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

export type PeriodDefinition = {
  id: string;
  period: string;
  name: string;
  start: string;
  end: string;
  label: string;
  isBreak: boolean;
  breakType?: "BREAK" | "LUNCH";
  title?: string;
};

const DEFAULT_PERIOD_DEFINITIONS: PeriodDefinition[] = [
  { id: "p1", period: "1", name: "Period 1", start: "09:00", end: "10:00", label: "09:00 - 10:00", isBreak: false },
  { id: "p2", period: "2", name: "Period 2", start: "10:00", end: "11:00", label: "10:00 - 11:00", isBreak: false },
  { id: "p-break", period: "--", name: "Morning Break", start: "11:00", end: "11:10", label: "11:00 - 11:10", isBreak: true, breakType: "BREAK", title: "BREAK (10 Minutes)" },
  { id: "p3", period: "3", name: "Period 3", start: "11:10", end: "12:10", label: "11:10 - 12:10", isBreak: false },
  { id: "p4", period: "4", name: "Period 4", start: "12:10", end: "13:10", label: "12:10 - 01:10", isBreak: false },
  { id: "p-lunch", period: "--", name: "Lunch Break", start: "13:10", end: "14:10", label: "01:10 - 02:10", isBreak: true, breakType: "LUNCH", title: "LUNCH BREAK (1 Hour)" },
  { id: "p5", period: "5", name: "Period 5", start: "14:10", end: "15:10", label: "02:10 - 03:10", isBreak: false },
  { id: "p6", period: "6", name: "Period 6", start: "15:10", end: "16:10", label: "03:10 - 04:10", isBreak: false },
  { id: "p7", period: "7", name: "Period 7", start: "16:10", end: "17:00", label: "04:10 - 05:00", isBreak: false },
];

const PERIOD_TYPES: { value: string; label: string }[] = [
  { value: "CLASS", label: "CLASS (1 Hr Lecture)" },
  { value: "LAB", label: "LAB (2 Hrs Practical)" },
  { value: "LIBRARY", label: "LIBRARY (Self Study)" },
  { value: "SPORTS", label: "SPORTS (Physical Fitness)" },
  { value: "ACTIVITY", label: "ACTIVITY (Club / Seminar)" },
  { value: "BREAK", label: "BREAK (Morning Break)" },
  { value: "LUNCH", label: "LUNCH (Midday Lunch)" },
  { value: "NO_CLASS", label: "NO CLASS (Empty Period)" },
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const SECTIONS = ["Section A", "Section B", "Section C", "Section D"] as const;

// Default faculty rosters organized by branch/department
const BRANCH_FACULTY_DEFAULTS: Record<string, { name: string; staffCode: string }[]> = {
  CSE: [
    { name: "Prof. Ravi Kumar", staffCode: "F-101" },
    { name: "Dr. Ramesh B", staffCode: "CSE-102" },
    { name: "Prof. Vikram Mehta", staffCode: "FAC-101" },
    { name: "Prof. Anita Sen", staffCode: "FAC-102" },
    { name: "Prof. V. Chary", staffCode: "CSE-105" },
    { name: "Dr. S. Sharma", staffCode: "MAT-101" },
    { name: "Mr. Arjun V", staffCode: "PHY-102" },
    { name: "Mrs. Priya N", staffCode: "CSE-107" },
    { name: "Dr. Meena K", staffCode: "CSE-108" },
  ],
  ECE: [
    { name: "Dr. K. Swaminathan", staffCode: "FAC-103" },
    { name: "Prof. S. Nambiar", staffCode: "FAC-104" },
    { name: "Dr. R. Lakshmi", staffCode: "ECE-105" },
    { name: "Mr. T. Srinivas", staffCode: "ECE-106" },
  ],
  EEE: [
    { name: "Dr. H. Varma", staffCode: "FAC-105" },
    { name: "Prof. K. Rao", staffCode: "EEE-102" },
    { name: "Mrs. G. Sunitha", staffCode: "EEE-103" },
  ],
  MECH: [
    { name: "Prof. B. Mukherjee", staffCode: "FAC-106" },
    { name: "Dr. A. K. Verma", staffCode: "MECH-102" },
    { name: "Mr. Suresh P", staffCode: "MECH-103" },
  ],
  CIVIL: [
    { name: "Dr. P. Deshmukh", staffCode: "FAC-107" },
    { name: "Prof. N. K. Rao", staffCode: "CIVIL-102" },
    { name: "Ms. Kavitha S", staffCode: "CIVIL-103" },
  ],
  AIML: [
    { name: "Dr. M. Venkat", staffCode: "FAC-108" },
    { name: "Prof. Sneha Roy", staffCode: "AIML-102" },
    { name: "Mr. Dinesh K", staffCode: "AIML-103" },
  ],
  IT: [
    { name: "Dr. P. Ramanathan", staffCode: "IT-101" },
    { name: "Prof. Deepa Nair", staffCode: "IT-102" },
  ],
};

function getSemestersForYear(year: string): number[] {
  if (year === "1st Year") return [1, 2];
  if (year === "2nd Year") return [3, 4];
  if (year === "3rd Year") return [5, 6];
  if (year === "4th Year") return [7, 8];
  return [1, 2, 3, 4, 5, 6, 7, 8];
}

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

function getSemesterRoman(sem: number): string {
  const map: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII" };
  return map[sem] || "V";
}

export interface RoomOption {
  code: string;
  name: string;
  type: "Classroom" | "Laboratory" | "Venue" | "Other";
  block?: string;
  capacity?: number;
}

const DEFAULT_CAMPUS_ROOMS: RoomOption[] = [
  // Classrooms
  { code: "2-S-08", name: "Lecture Hall 2-S-08", type: "Classroom", block: "CSE Block • 2nd Floor", capacity: 60 },
  { code: "R-101", name: "Lecture Room 101", type: "Classroom", block: "Main Academic Block • 1st Floor", capacity: 60 },
  { code: "R-102", name: "Lecture Room 102", type: "Classroom", block: "Main Academic Block • 1st Floor", capacity: 60 },
  { code: "R-201", name: "Lecture Room 201", type: "Classroom", block: "Block 2 • 2nd Floor", capacity: 65 },
  { code: "R-202", name: "Lecture Room 202", type: "Classroom", block: "Block 2 • 2nd Floor", capacity: 65 },
  { code: "R-301", name: "Lecture Room 301", type: "Classroom", block: "Senior Wing • 3rd Floor", capacity: 70 },
  { code: "R-302", name: "Lecture Room 302", type: "Classroom", block: "Senior Wing • 3rd Floor", capacity: 70 },
  { code: "R-401", name: "Lecture Room 401", type: "Classroom", block: "Senior Wing • 4th Floor", capacity: 70 },
  { code: "R-402", name: "Lecture Room 402", type: "Classroom", block: "Senior Wing • 4th Floor", capacity: 70 },
  { code: "Room C-204", name: "Smart Classroom C-204", type: "Classroom", block: "C-Block (CSE) • 2nd Floor", capacity: 60 },
  { code: "Room C-205", name: "Classroom C-205", type: "Classroom", block: "C-Block (CSE) • 2nd Floor", capacity: 60 },
  { code: "Room E-102", name: "Classroom E-102", type: "Classroom", block: "E-Block (ECE) • 1st Floor", capacity: 60 },
  { code: "Room M-101", name: "Classroom M-101", type: "Classroom", block: "Mechanical Block", capacity: 60 },
  { code: "Room CV-201", name: "Classroom CV-201", type: "Classroom", block: "Civil Block", capacity: 60 },

  // Laboratories
  { code: "Project Lab", name: "Capstone Project Lab", type: "Laboratory", block: "Tech Hub • 3rd Floor", capacity: 45 },
  { code: "Programming Lab", name: "Advanced Programming Lab", type: "Laboratory", block: "C-Block • 1st Floor", capacity: 50 },
  { code: "Computer Lab 1", name: "Computer Center Lab 1", type: "Laboratory", block: "IT Wing • Ground Floor", capacity: 60 },
  { code: "Computer Lab 2", name: "Computer Center Lab 2", type: "Laboratory", block: "IT Wing • 1st Floor", capacity: 60 },
  { code: "Computer Lab 3", name: "Systems & Network Lab 3", type: "Laboratory", block: "C-Block • 3rd Floor", capacity: 45 },
  { code: "AI & Robotics Lab", name: "AI & Deep Learning Lab", type: "Laboratory", block: "Innovation Center", capacity: 40 },
  { code: "Web Technologies Lab", name: "Full-Stack Web Tech Lab", type: "Laboratory", block: "C-Block • 2nd Floor", capacity: 50 },
  { code: "Microcontroller Lab 2", name: "Embedded Systems Lab", type: "Laboratory", block: "E-Block • 1st Floor", capacity: 40 },
  { code: "VLSI Design Lab", name: "VLSI & Circuits Lab", type: "Laboratory", block: "E-Block • 2nd Floor", capacity: 40 },

  // Venues & Special Areas
  { code: "Seminar Hall", name: "Department Seminar Hall", type: "Venue", block: "Central Block • 2nd Floor", capacity: 150 },
  { code: "Auditorium", name: "Main Campus Auditorium", type: "Venue", block: "Administrative Block", capacity: 500 },
  { code: "Central Library", name: "Central Library & Reading Hall", type: "Venue", block: "Library Building", capacity: 200 },
  { code: "Ground", name: "Outdoor Sports Ground & Arena", type: "Venue", block: "Campus Sports Complex", capacity: 300 },
  { code: "Drawing Hall", name: "Engineering Graphics Hall", type: "Venue", block: "Mechanical Wing", capacity: 80 },
  { code: "-", name: "No Room / Break / Free Period", type: "Other", block: "N/A" },
];

function SearchableRoomSelect({
  value,
  onChange,
  roomOptions,
  placeholder = "Select or search classroom / lab room...",
}: {
  value: string;
  onChange: (val: string) => void;
  roomOptions: RoomOption[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "Classroom" | "Laboratory" | "Venue">("ALL");

  const filtered = useMemo(() => {
    let list = roomOptions;
    if (activeTab !== "ALL") {
      list = list.filter((r) => r.type === activeTab);
    }
    const q = query.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.block && r.block.toLowerCase().includes(q)),
    );
  }, [roomOptions, query, activeTab]);

  const selectedItem = useMemo(() => {
    return roomOptions.find((r) => r.code.toLowerCase() === (value || "").toLowerCase());
  }, [roomOptions, value]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return roomOptions.some((r) => r.code.toLowerCase() === q);
  }, [roomOptions, query]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-9 px-3 rounded-md border border-input bg-background flex items-center justify-between text-xs hover:border-primary/50 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="flex items-center gap-2 truncate">
          <DoorOpen className="size-3.5 text-primary shrink-0" />
          {value ? (
            <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
              <span className="font-mono">{value}</span>
              {selectedItem?.type && selectedItem.type !== "Other" && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded font-medium",
                    selectedItem.type === "Laboratory"
                      ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
                      : selectedItem.type === "Classroom"
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-300"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-300",
                  )}
                >
                  {selectedItem.type}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0 opacity-70" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl p-2 space-y-2 max-h-80 flex flex-col text-xs animation-in fade-in-50 zoom-in-95">
            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search room number, lab, or hall..."
                className="pl-8 pr-7 h-8 text-xs bg-muted/40 border-border/70"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg">
              {(["ALL", "Classroom", "Laboratory", "Venue"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                    activeTab === tab
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "ALL" ? "All" : tab === "Laboratory" ? "Labs" : tab === "Classroom" ? "Classes" : "Venues"}
                </button>
              ))}
            </div>

            {/* Quick Custom Entry */}
            {query.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={() => {
                  onChange(query.trim());
                  setIsOpen(false);
                  setQuery("");
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 flex items-center justify-between font-semibold transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <PlusCircle className="size-3.5 shrink-0" />
                  <span className="truncate">Use custom: &quot;<strong className="font-mono">{query.trim()}</strong>&quot;</span>
                </div>
                <span className="text-[10px] uppercase font-bold shrink-0">Select</span>
              </button>
            )}

            {/* Scrollable Room List */}
            <div className="overflow-y-auto space-y-1 max-h-48 pr-1">
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-[11px]">
                  No rooms found matching &quot;{query}&quot;
                </div>
              ) : (
                filtered.map((room) => {
                  const isSelected = (value || "").toLowerCase() === room.code.toLowerCase();
                  return (
                    <button
                      key={room.code}
                      type="button"
                      onClick={() => {
                        onChange(room.code);
                        setIsOpen(false);
                        setQuery("");
                      }}
                      className={cn(
                        "w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted/70 text-foreground",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold">{room.code}</span>
                          {room.type && room.type !== "Other" && (
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.2 rounded font-semibold",
                                isSelected
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : room.type === "Laboratory"
                                    ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
                                    : room.type === "Classroom"
                                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-300"
                                      : "bg-amber-500/15 text-amber-600 dark:text-amber-300",
                              )}
                            >
                              {room.type}
                            </span>
                          )}
                        </div>
                        {room.name && room.name !== room.code && (
                          <p className={cn("text-[11px] truncate", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                            {room.name} {room.block ? `• ${room.block}` : ""}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {room.capacity && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", isSelected ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>
                            {room.capacity} seats
                          </span>
                        )}
                        {isSelected && <Check className="size-3.5" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HODTimetablePage() {
  const { profile } = useAuth();
  const userDept = profile?.department || "CSE";

  // Selection states
  const [selectedYear, setSelectedYear] = useState<string>("3rd Year");
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [selectedSection, setSelectedSection] = useState<string>("Section A");
  const [selectedDay, setSelectedDay] = useState<string>("Today");
  const [viewMode, setViewMode] = useState<"grid" | "day" | "allocation">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("ALL");

  // Data & loading
  const [allSlots, setAllSlots] = useState<ProcessedSlot[]>([]);
  const [rawSlots, setRawSlots] = useState<DBClassSlot[]>([]);
  const [dbRoomsList, setDbRoomsList] = useState<CampusRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Period Timings Configuration State
  const [periodDefs, setPeriodDefs] = useState<PeriodDefinition[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cmadms-hod-period-definitions");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_PERIOD_DEFINITIONS;
  });
  const [isTimingsModalOpen, setIsTimingsModalOpen] = useState(false);
  const [editingPeriodDefs, setEditingPeriodDefs] = useState<PeriodDefinition[]>(periodDefs);

  // CRUD Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DBClassSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Dynamic Subjects & Faculty List for Modal
  const [dynamicSubjects, setDynamicSubjects] = useState<
    { courseCode: string; title: string; courseType: string; assignedFaculty: string }[]
  >([]);
  const [dbFacultyList, setDbFacultyList] = useState<{ name: string; staffCode: string; department?: string }[]>([]);

  // Form State
  const [formData, setFormData] = useState<TimetableSlotInput>({
    subject: "",
    subjectCode: "",
    department: userDept,
    year: selectedYear,
    semester: selectedSemester,
    section: selectedSection,
    room: "2-S-08",
    facultyName: "",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    periodType: "CLASS",
  });

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

  // Update semester when year changes
  useEffect(() => {
    const availableSems = getSemestersForYear(selectedYear);
    if (!availableSems.includes(selectedSemester)) {
      setSelectedSemester(availableSems[0] ?? 1);
    }
  }, [selectedYear, selectedSemester]);

  // Fetch slots for selected department, year & section
  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminTimetableApi({
        data: {
          department: userDept,
          year: selectedYear,
          semester: selectedSemester,
          section: selectedSection,
        },
      });

      if (res.success && res.slots) {
        setRawSlots(res.slots);
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
          semester: s.semester || selectedSemester,
          credits: (s.period_type || "").toUpperCase() === "LAB" ? 1.5 : 3,
        }));
        setAllSlots(mapped);
      } else {
        setRawSlots([]);
        setAllSlots([]);
      }
    } catch (err) {
      console.error("Failed to load department timetable:", err);
      toast.error("Failed to load department timetable.");
    } finally {
      setLoading(false);
    }
  }, [userDept, selectedYear, selectedSemester, selectedSection]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  // Load dynamic catalog subjects, faculty, and campus rooms
  useEffect(() => {
    const loadSubjectsFacultyAndRooms = async () => {
      const targetDept = formData.department || userDept;
      try {
        const [subRes, facRes, roomsRes] = await Promise.all([
          getDynamicSubjectsApi({
            data: {
              department: targetDept,
              year: formData.year,
              semester: formData.semester ?? selectedSemester ?? 1,
              periodType: formData.periodType ?? "CLASS",
            },
          }),
          getAdminFacultyListApi({
            data: {
              department: targetDept,
              status: "Active",
            },
          }),
          getCampusRoomsApi({ data: { status: "Active" } }),
        ]);

        if (subRes.success && subRes.subjects) {
          setDynamicSubjects(subRes.subjects);
        }

        if (facRes.success && facRes.facultyList) {
          setDbFacultyList(
            facRes.facultyList.map((f) => ({
              name: f.name,
              staffCode: f.staffCode,
              department: f.department,
            })),
          );
        }

        if (roomsRes.success && roomsRes.rooms) {
          setDbRoomsList(roomsRes.rooms);
        }
      } catch {
        // ignore
      }
    };

    if (isAddModalOpen || isEditModalOpen) {
      loadSubjectsFacultyAndRooms();
    }
  }, [
    userDept,
    formData.department,
    formData.year,
    formData.semester,
    formData.periodType,
    selectedSemester,
    isAddModalOpen,
    isEditModalOpen,
  ]);

  // Combined Room Options for Dropdown & Search
  const allRoomOptions = useMemo<RoomOption[]>(() => {
    const map = new Map<string, RoomOption>();

    // 1. Baseline Defaults
    DEFAULT_CAMPUS_ROOMS.forEach((r) => {
      map.set(r.code.toLowerCase().trim(), r);
    });

    // 2. Database rooms
    dbRoomsList.forEach((r) => {
      const key = r.roomCode.toLowerCase().trim();
      const type = r.roomType.toLowerCase().includes("lab")
        ? "Laboratory"
        : r.roomType.toLowerCase().includes("class")
          ? "Classroom"
          : "Venue";
      map.set(key, {
        code: r.roomCode,
        name: `${r.roomCode} (${r.buildingBlock || "Campus"})`,
        type,
        block: `${r.buildingBlock} • ${r.floor}`,
        capacity: r.capacity,
      });
    });

    // 3. Any active room currently in formData
    if (formData.room && formData.room.trim() && !map.has(formData.room.toLowerCase().trim())) {
      map.set(formData.room.toLowerCase().trim(), {
        code: formData.room,
        name: formData.room,
        type: "Other",
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      const order = { Classroom: 1, Laboratory: 2, Venue: 3, Other: 4 };
      const diff = (order[a.type] || 4) - (order[b.type] || 4);
      if (diff !== 0) return diff;
      return a.code.localeCompare(b.code);
    });
  }, [dbRoomsList, formData.room]);

  // Unique rooms present in this timetable for toolbar quick filtering
  const availableRoomsInTimetable = useMemo(() => {
    const counts = new Map<string, number>();
    allSlots.forEach((s) => {
      const r = (s.room || "").trim();
      if (r && r !== "-") {
        counts.set(r, (counts.get(r) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([room, count]) => ({ room, count }))
      .sort((a, b) => b.count - a.count);
  }, [allSlots]);

  // Combined branch-based faculty options for Dropdown
  const branchFacultyOptions = useMemo(() => {
    const dept = (formData.department || userDept || "CSE").toUpperCase();
    const defaults = BRANCH_FACULTY_DEFAULTS[dept] || BRANCH_FACULTY_DEFAULTS["CSE"] || [];
    const map = new Map<string, { name: string; staffCode: string }>();

    // 1. Add DB faculty for this department ONLY
    dbFacultyList.forEach((f) => {
      if (f.name && (!f.department || f.department.toUpperCase() === dept)) {
        map.set(f.name.toLowerCase().trim(), { name: f.name, staffCode: f.staffCode });
      }
    });

    // 2. Add branch defaults strictly for this branch (e.g. CSE)
    defaults.forEach((f) => {
      const key = f.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, f);
      }
    });

    // 3. Add any assigned faculty from dynamic course catalog for this department (strictly excluded if belonging to other branch)
    const otherDeptFaculty = new Set<string>();
    Object.entries(BRANCH_FACULTY_DEFAULTS).forEach(([dKey, fList]) => {
      if (dKey.toUpperCase() !== dept) {
        fList.forEach((f) => otherDeptFaculty.add(f.name.toLowerCase().trim()));
      }
    });
    dbFacultyList.forEach((f) => {
      if (f.department && f.department.toUpperCase() !== dept && f.name) {
        otherDeptFaculty.add(f.name.toLowerCase().trim());
      }
    });

    dynamicSubjects.forEach((sub) => {
      if (sub.assignedFaculty && sub.assignedFaculty !== "Unassigned" && sub.assignedFaculty !== "-") {
        const key = sub.assignedFaculty.toLowerCase().trim();
        if (!otherDeptFaculty.has(key) && !map.has(key)) {
          map.set(key, { name: sub.assignedFaculty, staffCode: "Catalog" });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [formData.department, userDept, dbFacultyList, dynamicSubjects]);

  const activeSemester = selectedSemester;
  const activeRoom = useMemo(() => {
    const found = allSlots.find((s) => s.room && s.room !== "-" && s.room !== "Central Library" && s.room !== "Ground");
    return found?.room || (selectedYear === "3rd Year" ? "2-S-08" : "R-101");
  }, [allSlots, selectedYear]);

  // Handle cell click in Weekly Grid
  const handleCellClick = (dayNum: number, periodDef: (typeof OFFICIAL_PERIODS)[0], existingProcessedSlot?: ProcessedSlot) => {
    setServerError(null);
    if (existingProcessedSlot) {
      const matchedRaw = rawSlots.find((r) => r.id === existingProcessedSlot.id);
      if (matchedRaw) {
        handleOpenEdit(matchedRaw);
      } else {
        handleOpenEdit({
          id: existingProcessedSlot.id,
          subject: existingProcessedSlot.subject,
          subject_code: existingProcessedSlot.code,
          code: existingProcessedSlot.code,
          department: existingProcessedSlot.department,
          year: existingProcessedSlot.year,
          semester: existingProcessedSlot.semester || selectedSemester,
          section: existingProcessedSlot.section,
          room: existingProcessedSlot.room,
          faculty_name: existingProcessedSlot.facultyName,
          day_of_week: existingProcessedSlot.dayOfWeek,
          start_time: existingProcessedSlot.startTime,
          end_time: existingProcessedSlot.endTime,
          period_type: existingProcessedSlot.periodType,
        });
      }
    } else {
      let defaultPeriodType: PeriodType = "CLASS";
      let defaultFaculty = branchFacultyOptions[0]?.name || "Prof. Ravi Kumar";
      let defaultSubject = "";

      if (periodDef.period === "BREAK") {
        defaultPeriodType = "BREAK";
        defaultFaculty = "-";
        defaultSubject = "Morning Break";
      } else if (periodDef.period === "LUNCH") {
        defaultPeriodType = "LUNCH";
        defaultFaculty = "-";
        defaultSubject = "Lunch Break";
      }

      setFormData({
        subject: defaultSubject,
        subjectCode: "",
        department: userDept,
        year: selectedYear,
        semester: selectedSemester,
        section: selectedSection,
        room: activeRoom,
        facultyName: defaultFaculty,
        dayOfWeek: dayNum,
        startTime: periodDef.start,
        endTime: periodDef.end,
        periodType: defaultPeriodType,
      });
      setIsAddModalOpen(true);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setServerError(null);
    const defaultFaculty = branchFacultyOptions[0]?.name || "Prof. Ravi Kumar";
    setFormData({
      subject: "",
      subjectCode: "",
      department: userDept,
      year: selectedYear,
      semester: selectedSemester,
      section: selectedSection,
      room: activeRoom,
      facultyName: defaultFaculty,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      periodType: "CLASS",
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (slot: DBClassSlot) => {
    setServerError(null);
    setSelectedSlot(slot);
    setFormData({
      subject: slot.subject,
      subjectCode: slot.code || slot.subject_code || "",
      department: slot.department || userDept,
      year: slot.year || selectedYear,
      semester: slot.semester || selectedSemester,
      section: slot.section || selectedSection,
      room: slot.room || activeRoom,
      facultyName: slot.faculty_name || branchFacultyOptions[0]?.name || "",
      dayOfWeek: slot.day_of_week,
      startTime: slot.start_time,
      endTime: slot.end_time,
      periodType: (slot.period_type || "CLASS") as PeriodType,
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (slot: DBClassSlot) => {
    setSelectedSlot(slot);
    setIsDeleteModalOpen(true);
  };

  // Submit Add Slot
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await addTimetableSlotApi({ data: formData });
      if (res.success) {
        toast.success("Timetable slot created successfully!");
        setIsAddModalOpen(false);
        loadTimetable();
      } else {
        setServerError(res.error || "Failed to create timetable slot.");
        toast.error(res.error || "Failed to create timetable slot.");
      }
    } catch (err: any) {
      setServerError(err.message || "Failed to create timetable slot.");
      toast.error(err.message || "Failed to create timetable slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Slot
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await updateTimetableSlotApi({
        data: {
          id: selectedSlot.id,
          input: formData,
        },
      });

      if (res.success) {
        toast.success("Timetable slot updated successfully!");
        setIsEditModalOpen(false);
        loadTimetable();
      } else {
        setServerError(res.error || "Failed to update timetable slot.");
        toast.error(res.error || "Failed to update timetable slot.");
      }
    } catch (err: any) {
      setServerError(err.message || "Failed to update timetable slot.");
      toast.error(err.message || "Failed to update timetable slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete Slot
  const handleDeleteSubmit = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);

    try {
      const res = await deleteTimetableSlotApi({
        data: { id: selectedSlot.id },
      });

      if (res.success) {
        toast.success("Timetable slot removed successfully!");
        setIsDeleteModalOpen(false);
        loadTimetable();
      } else {
        toast.error(res.error || "Failed to delete timetable slot.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete timetable slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Target day of week for Day Schedule view
  const targetDow = useMemo(() => {
    if (selectedDay === "Today") {
      return todayDow > 6 ? 1 : todayDow;
    }
    const found = DAY_KEYS.find((d) => d.key === selectedDay);
    return found?.dow ?? 1;
  }, [selectedDay, todayDow]);

  // Filtered slots for selected day with Room and Search support
  const daySlots = useMemo(() => {
    let slots = allSlots.filter((s) => s.dayOfWeek === targetDow);
    if (selectedRoomFilter !== "ALL") {
      slots = slots.filter((s) => (s.room || "").toLowerCase() === selectedRoomFilter.toLowerCase());
    }
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
  }, [allSlots, targetDow, searchQuery, selectedRoomFilter]);

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

  // Unique Subjects & Faculty Allocation Summary
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

    const roomsSet = new Set(
      academicSlots
        .map((s) => s.room)
        .filter((r) => r && r !== "-" && !r.toLowerCase().includes("assigned")),
    );

    return {
      totalWeeklyPeriods: academicSlots.length,
      uniqueSubjects: subjectAllocationSummary.length,
      activeFaculty: facultySet.size,
      labSessions: labSlots.length,
      distinctRoomsCount: roomsSet.size,
    };
  }, [allSlots, subjectAllocationSummary]);

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6 pb-16">
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
            description={`Official teaching schedule, slot creation & editing, room allocations, and faculty subject mapping for ${userDept} Department.`}
            breadcrumb={[
              { label: "HOD Portal", to: "/hod/dashboard" },
              { label: "Academic Administration" },
              { label: "Department Timetable" },
            ]}
            actions={
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingPeriodDefs(periodDefs);
                    setIsTimingsModalOpen(true);
                  }}
                  className="gap-2 text-xs font-semibold shadow-2xs border-primary/30 hover:border-primary hover:bg-primary/5"
                >
                  <Clock className="size-3.5 text-primary" />
                  <span>Period Timings</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs font-semibold shadow-2xs"
                  onClick={() => window.print()}
                >
                  <Printer className="size-3.5" />
                  <span>Print Timetable</span>
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 text-xs font-bold shadow-md bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                  onClick={handleOpenAdd}
                >
                  <Plus className="size-3.5" />
                  <span>+ Add / Edit Slot</span>
                </Button>
              </div>
            }
          />

          {/* 1. Year, Semester & Section Selector Card */}
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

              {/* Semester & Section Selector */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Semester Selector */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-primary" />
                    Semester
                  </span>
                  <div className="flex items-center gap-2">
                    {getSemestersForYear(selectedYear).map((sem) => {
                      const isActive = selectedSemester === sem;
                      return (
                        <button
                          key={sem}
                          onClick={() => setSelectedSemester(sem)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 border shadow-2xs",
                            isActive
                              ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20 font-bold"
                              : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60",
                          )}
                        >
                          Sem {sem}
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
                              ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20 font-bold"
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
            </div>

            {/* Active Banner & Quick Actions */}
            <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  {userDept} • {selectedYear} • {selectedSection} • Semester {getSemesterRoman(activeSemester)}
                </span>
                <span className="text-muted-foreground">
                  Default Room: <strong className="text-foreground">{activeRoom}</strong>
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Tip: Click on any period in the grid to instantly add or edit class slots.
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
                <span>Weekly Grid & Management</span>
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

            {/* Search & Room Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Room Filter Dropdown */}
              <div className="w-full sm:w-44">
                <Select value={selectedRoomFilter} onValueChange={(val) => setSelectedRoomFilter(val)}>
                  <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-card border-border shadow-2xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <DoorOpen className="size-3.5 text-primary shrink-0" />
                      <SelectValue placeholder="Filter Room" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs font-bold">
                      🏢 All Allocated Rooms ({stats.distinctRoomsCount})
                    </SelectItem>
                    {availableRoomsInTimetable.map((r) => (
                      <SelectItem key={r.room} value={r.room} className="text-xs font-mono">
                        {r.room} ({r.count} periods)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subject, faculty, or room..."
                  className="pl-9 pr-7 h-9 text-xs rounded-xl bg-card border-border shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
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

                    {/* Period 5 & 6 */}
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted border border-border">
                            {slot.displayStart} - {slot.displayEnd}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const raw = rawSlots.find((r) => r.id === slot.id);
                              if (raw) handleOpenEdit(raw);
                            }}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const raw = rawSlots.find((r) => r.id === slot.id);
                              if (raw) handleOpenDelete(raw);
                            }}
                            className="size-7 text-destructive hover:bg-destructive/10"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        "card-surface p-4 sm:p-5 rounded-2xl border transition-all duration-150 shadow-xs relative overflow-hidden group",
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

                        {/* Faculty Profile Card & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const raw = rawSlots.find((r) => r.id === slot.id);
                                if (raw) handleOpenEdit(raw);
                              }}
                              className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl border-border/70 hover:border-primary/50"
                            >
                              <Pencil className="size-3.5 text-primary" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const raw = rawSlots.find((r) => r.id === slot.id);
                                if (raw) handleOpenDelete(raw);
                              }}
                              className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Delete</span>
                            </Button>
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

        {/* VIEW 3: WEEKLY TIMETABLE MATRIX GRID (INTERACTIVE CRUD) */}
        {viewMode === "grid" && (
          <div className="card-surface p-4 sm:p-5 rounded-2xl border border-border/80 shadow-xs space-y-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span>Weekly Schedule Matrix — {selectedYear} ({selectedSection})</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                    Semester {getSemesterRoman(activeSemester)}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Click any slot to modify course or faculty assignment. Click empty (+) cells to schedule a new period.
                </p>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={handleOpenAdd}
                className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl self-start sm:self-auto shadow-2xs"
              >
                <Plus className="size-3.5" />
                <span>Add Period</span>
              </Button>
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
                                className="p-2 text-center align-middle bg-muted/20 border-r border-border text-muted-foreground text-[10px] font-medium select-none"
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
                                onClick={() => handleCellClick(dow, periodDef)}
                                className="p-2 text-center align-middle border-r border-border text-muted-foreground/40 hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors text-[11px] bg-muted/5 group"
                                title="Click to add timetable slot"
                              >
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary font-semibold">
                                  <Plus className="size-3.5" />
                                  <span className="text-[10px]">Add</span>
                                </div>
                                <span className="group-hover:hidden">—</span>
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
                                onClick={() => handleCellClick(dow, periodDef, slot)}
                                className={cn(
                                  "p-2 rounded-xl border text-xs space-y-1 shadow-2xs transition-all cursor-pointer relative group/slot hover:ring-2 hover:ring-primary/40",
                                  badgeCfg.className,
                                )}
                                title="Click to edit slot"
                              >
                                {/* Quick Edit / Delete Float Badge */}
                                <div className="absolute top-1 right-1 hidden group-hover/slot:flex items-center gap-1 bg-background/95 rounded-lg p-0.5 shadow-md border border-border">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const raw = rawSlots.find((r) => r.id === slot.id);
                                      if (raw) handleOpenEdit(raw);
                                    }}
                                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted"
                                    title="Edit Slot"
                                  >
                                    <Pencil className="size-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const raw = rawSlots.find((r) => r.id === slot.id);
                                      if (raw) handleOpenDelete(raw);
                                    }}
                                    className="p-1 rounded text-destructive hover:bg-destructive/10"
                                    title="Delete Slot"
                                  >
                                    <Trash2 className="size-2.5" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-1 pr-1">
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
                                <div className="text-[9px] text-muted-foreground flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <DoorOpen className="size-2.5 shrink-0" />
                                    <span>{slot.room}</span>
                                  </span>
                                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-70">
                                    {slot.periodType}
                                  </span>
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

        {/* ========================================================================= */}
        {/* ADD TIMETABLE SLOT DIALOG                                                 */}
        {/* ========================================================================= */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-black">
                <Plus className="w-5 h-5 text-primary" />
                Add Department Timetable Slot
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Assign a subject, period type, timing and professor for {userDept} Department.
              </DialogDescription>
            </DialogHeader>

            {serverError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Department</Label>
                  <Input value={formData.department} disabled className="h-9 text-xs font-bold bg-muted/40 mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Academic Year</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(val) => {
                      const sems = getSemestersForYear(val);
                      setFormData((prev) => ({
                        ...prev,
                        year: val,
                        semester: sems[0] ?? 1,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y} className="text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Semester</Label>
                  <Select
                    value={String(formData.semester ?? selectedSemester)}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, semester: parseInt(val, 10) }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getSemestersForYear(formData.year || selectedYear).map((s) => (
                        <SelectItem key={s} value={String(s)} className="text-xs">
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Section</Label>
                  <Select
                    value={formData.section}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, section: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Day of Week</Label>
                  <Select
                    value={String(formData.dayOfWeek)}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, dayOfWeek: parseInt(val, 10) }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { num: 1, label: "Monday" },
                        { num: 2, label: "Tuesday" },
                        { num: 3, label: "Wednesday" },
                        { num: 4, label: "Thursday" },
                        { num: 5, label: "Friday" },
                        { num: 6, label: "Saturday" },
                      ].map((d) => (
                        <SelectItem key={d.num} value={String(d.num)} className="text-xs">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Period Type</Label>
                  <Select
                    value={formData.periodType || "CLASS"}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        periodType: val as PeriodType,
                        subject: ["BREAK", "LUNCH", "NO_CLASS"].includes(val)
                          ? val === "BREAK"
                            ? "Morning Break"
                            : val === "LUNCH"
                              ? "Lunch Break"
                              : "No Class"
                          : prev.subject,
                        facultyName: ["BREAK", "LUNCH"].includes(val) ? "-" : prev.facultyName || "",
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_TYPES.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value} className="text-xs">
                          {pt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Catalog Subject Picker */}
              {!["BREAK", "LUNCH", "NO_CLASS"].includes(formData.periodType || "") && (
                <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pick from Department Course Catalog
                  </Label>
                  <Select
                    onValueChange={(val) => {
                      const found = dynamicSubjects.find((s) => s.courseCode === val);
                      if (found) {
                        setFormData((prev) => ({
                          ...prev,
                          subject: found.title,
                          subjectCode: found.courseCode,
                          facultyName: found.assignedFaculty && found.assignedFaculty !== "Unassigned" ? found.assignedFaculty : prev.facultyName || "",
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                      <SelectValue placeholder="Select from catalog..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicSubjects.map((sub) => (
                        <SelectItem key={sub.courseCode} value={sub.courseCode} className="text-xs">
                          {sub.courseCode} — {sub.title} ({sub.courseType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Subject Name</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g. Operating Systems"
                    required
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Course Code</Label>
                  <Input
                    value={formData.subjectCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subjectCode: e.target.value }))}
                    placeholder="e.g. CS-301"
                    required
                    className="h-9 text-xs mt-1 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Branch-Based Faculty Dropdown */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <UserCheck className="size-3 text-primary" />
                    <span>Assigned Faculty ({formData.department || userDept})</span>
                  </Label>
                  <Select
                    value={formData.facultyName || ""}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, facultyName: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1 bg-background">
                      <SelectValue placeholder="Select faculty member..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {branchFacultyOptions.map((fac) => (
                        <SelectItem key={fac.name} value={fac.name} className="text-xs">
                          {fac.name} {fac.staffCode ? `(${fac.staffCode})` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="-" className="text-xs italic text-muted-foreground">
                        - (None / Break / Free Period)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <DoorOpen className="size-3 text-primary" />
                    <span>Classroom / Lab Room</span>
                  </Label>
                  <div className="mt-1">
                    <SearchableRoomSelect
                      value={formData.room || ""}
                      onChange={(val) => setFormData((prev) => ({ ...prev, room: val }))}
                      roomOptions={allRoomOptions}
                      placeholder="Select or search room..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                    required
                    className="h-9 text-xs mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">End Time</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                    required
                    className="h-9 text-xs mt-1 font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? "Creating Slot..." : "Create Slot"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* EDIT TIMETABLE SLOT DIALOG                                                */}
        {/* ========================================================================= */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-black">
                <Pencil className="w-5 h-5 text-primary" />
                Edit Timetable Slot
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update course information, period timing or faculty assignment.
              </DialogDescription>
            </DialogHeader>

            {serverError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Department</Label>
                  <Input value={formData.department} disabled className="h-9 text-xs font-bold bg-muted/40 mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Academic Year</Label>
                  <Input value={formData.year} disabled className="h-9 text-xs font-bold bg-muted/40 mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Semester</Label>
                  <Input value={`Semester ${formData.semester ?? selectedSemester}`} disabled className="h-9 text-xs font-bold bg-muted/40 mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Section</Label>
                  <Input value={formData.section} disabled className="h-9 text-xs font-bold bg-muted/40 mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Day of Week</Label>
                  <Select
                    value={String(formData.dayOfWeek)}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, dayOfWeek: parseInt(val, 10) }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { num: 1, label: "Monday" },
                        { num: 2, label: "Tuesday" },
                        { num: 3, label: "Wednesday" },
                        { num: 4, label: "Thursday" },
                        { num: 5, label: "Friday" },
                        { num: 6, label: "Saturday" },
                      ].map((d) => (
                        <SelectItem key={d.num} value={String(d.num)} className="text-xs">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Period Type</Label>
                  <Select
                    value={formData.periodType || "CLASS"}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        periodType: val as PeriodType,
                        subject: ["BREAK", "LUNCH", "NO_CLASS"].includes(val)
                          ? val === "BREAK"
                            ? "Morning Break"
                            : val === "LUNCH"
                              ? "Lunch Break"
                              : "No Class"
                          : prev.subject,
                        facultyName: ["BREAK", "LUNCH"].includes(val) ? "-" : prev.facultyName || "",
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_TYPES.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value} className="text-xs">
                          {pt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Catalog Subject Picker */}
              {!["BREAK", "LUNCH", "NO_CLASS"].includes(formData.periodType || "") && (
                <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pick from Department Course Catalog
                  </Label>
                  <Select
                    onValueChange={(val) => {
                      const found = dynamicSubjects.find((s) => s.courseCode === val);
                      if (found) {
                        setFormData((prev) => ({
                          ...prev,
                          subject: found.title,
                          subjectCode: found.courseCode,
                          facultyName: found.assignedFaculty && found.assignedFaculty !== "Unassigned" ? found.assignedFaculty : prev.facultyName || "",
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                      <SelectValue placeholder="Select from catalog..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicSubjects.map((sub) => (
                        <SelectItem key={sub.courseCode} value={sub.courseCode} className="text-xs">
                          {sub.courseCode} — {sub.title} ({sub.courseType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Subject Name</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g. Operating Systems"
                    required
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Course Code</Label>
                  <Input
                    value={formData.subjectCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subjectCode: e.target.value }))}
                    placeholder="e.g. CS-301"
                    required
                    className="h-9 text-xs mt-1 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Branch-Based Faculty Dropdown */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <UserCheck className="size-3 text-primary" />
                    <span>Assigned Faculty ({formData.department || userDept})</span>
                  </Label>
                  <Select
                    value={formData.facultyName || ""}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, facultyName: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold mt-1 bg-background">
                      <SelectValue placeholder="Select faculty member..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {branchFacultyOptions.map((fac) => (
                        <SelectItem key={fac.name} value={fac.name} className="text-xs">
                          {fac.name} {fac.staffCode ? `(${fac.staffCode})` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="-" className="text-xs italic text-muted-foreground">
                        - (None / Break / Free Period)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <DoorOpen className="size-3 text-primary" />
                    <span>Classroom / Lab Room</span>
                  </Label>
                  <div className="mt-1">
                    <SearchableRoomSelect
                      value={formData.room || ""}
                      onChange={(val) => setFormData((prev) => ({ ...prev, room: val }))}
                      roomOptions={allRoomOptions}
                      placeholder="Select or search room..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                    required
                    className="h-9 text-xs mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase">End Time</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                    required
                    className="h-9 text-xs mt-1 font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    if (selectedSlot) setIsDeleteModalOpen(true);
                  }}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Slot
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* DELETE CONFIRMATION DIALOG                                                */}
        {/* ========================================================================= */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-black text-destructive">
                <Trash2 className="w-5 h-5 text-destructive" />
                Remove Timetable Slot?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This will delete the timetable entry for <strong>{selectedSlot?.subject}</strong> (
                {selectedSlot?.code || selectedSlot?.subject_code}) on{" "}
                <strong>
                  {DAY_KEYS.find((d) => d.dow === selectedSlot?.day_of_week)?.label || "Selected Day"}
                </strong>
                .
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Keep Slot
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isSubmitting}
                onClick={handleDeleteSubmit}
                className="rounded-xl text-xs font-bold"
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete Slot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* EDIT PERIOD TIMINGS DIALOG                                                */}
        {/* ========================================================================= */}
        <Dialog open={isTimingsModalOpen} onOpenChange={setIsTimingsModalOpen}>
          <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-black">
                <Clock className="w-5 h-5 text-primary" />
                Edit Department Period Timings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure default institutional period boundaries and break intervals.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                {editingPeriodDefs.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center text-xs shrink-0">
                        {p.period}
                      </span>
                      <div className="min-w-0">
                        <Input
                          value={p.name}
                          onChange={(e) => {
                            const updated = [...editingPeriodDefs];
                            if (updated[idx]) {
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setEditingPeriodDefs(updated);
                            }
                          }}
                          className="h-7 text-xs font-bold bg-card"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground font-bold">Start:</Label>
                        <Input
                          type="time"
                          value={p.start}
                          onChange={(e) => {
                            const updated = [...editingPeriodDefs];
                            if (updated[idx]) {
                              updated[idx] = {
                                ...updated[idx],
                                start: e.target.value,
                                label: `${e.target.value} - ${updated[idx].end}`,
                              };
                              setEditingPeriodDefs(updated);
                            }
                          }}
                          className="h-7 w-24 text-xs font-mono bg-card"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground font-bold">End:</Label>
                        <Input
                          type="time"
                          value={p.end}
                          onChange={(e) => {
                            const updated = [...editingPeriodDefs];
                            if (updated[idx]) {
                              updated[idx] = {
                                ...updated[idx],
                                end: e.target.value,
                                label: `${updated[idx].start} - ${e.target.value}`,
                              };
                              setEditingPeriodDefs(updated);
                            }
                          }}
                          className="h-7 w-24 text-xs font-mono bg-card"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPeriodDefs(DEFAULT_PERIOD_DEFINITIONS)}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTimingsModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setPeriodDefs(editingPeriodDefs);
                      if (typeof window !== "undefined") {
                        localStorage.setItem(
                          "cmadms-hod-period-definitions",
                          JSON.stringify(editingPeriodDefs),
                        );
                      }
                      toast.success("Period timings updated successfully!");
                      setIsTimingsModalOpen(false);
                    }}
                    className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Save Timings
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

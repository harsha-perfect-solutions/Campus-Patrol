import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  Clock,
  DoorOpen,
  Filter,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  X,
  FlaskConical,
  GraduationCap,
  Trophy,
  Coffee,
  Utensils,
  Ban,
  BookMarked,
  ChevronRight,
  Info,
  Dumbbell,
  Palette,
  MinusCircle,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
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
import { EmptyState } from "@/components/empty-state";
import {
  getAdminTimetableApi,
  addTimetableSlotApi,
  updateTimetableSlotApi,
  deleteTimetableSlotApi,
  getDynamicSubjectsApi,
} from "@/lib/api/timetable.server";
import type { DBClassSlot, TimetableSlotInput, PeriodType } from "@/lib/db/timetable.server";

export const Route = createFileRoute("/admin/timetable")({
  head: () => ({ meta: [{ title: "Master Timetable — Admin Console" }] }),
  component: AdminTimetablePage,
});

const DEPARTMENTS = ["CSE", "ECE", "EEE", "AIML", "CIVIL", "IT", "MECH"] as const;
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const SECTIONS = ["Section A", "Section B", "Section C", "Section D"] as const;

function getSemestersForYear(year: string): number[] {
  if (year === "1st Year") return [1, 2];
  if (year === "2nd Year") return [3, 4];
  if (year === "3rd Year") return [5, 6];
  if (year === "4th Year") return [7, 8];
  return [1, 2, 3, 4, 5, 6, 7, 8];
}

const PERIOD_DEFINITIONS = [
  { period: "1", name: "Period 1", start: "09:00", end: "10:00", label: "09:00 - 10:00", isBreak: false },
  { period: "2", name: "Period 2", start: "10:00", end: "11:00", label: "10:00 - 11:00", isBreak: false },
  { period: "--", name: "Morning Break", start: "11:00", end: "11:10", label: "11:00 - 11:10", isBreak: true, breakType: "BREAK", title: "BREAK (10 Minutes)" },
  { period: "3", name: "Period 3", start: "11:10", end: "12:10", label: "11:10 - 12:10", isBreak: false },
  { period: "4", name: "Period 4", start: "12:10", end: "13:10", label: "12:10 - 01:10", isBreak: false },
  { period: "--", name: "Lunch Break", start: "13:10", end: "14:10", label: "01:10 - 02:10", isBreak: true, breakType: "LUNCH", title: "LUNCH BREAK (1 Hour)" },
  { period: "5", name: "Period 5", start: "14:10", end: "15:10", label: "02:10 - 03:10", isBreak: false },
  { period: "6", name: "Period 6", start: "15:10", end: "16:10", label: "03:10 - 04:10", isBreak: false },
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

const DAYS_OF_WEEK = [
  { num: 1, key: "Monday", label: "Monday" },
  { num: 2, key: "Tuesday", label: "Tuesday" },
  { num: 3, key: "Wednesday", label: "Wednesday" },
  { num: 4, key: "Thursday", label: "Thursday" },
  { num: 5, key: "Friday", label: "Friday" },
  { num: 6, key: "Saturday", label: "Saturday" },
];

function AdminTimetablePage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminTimetableContent />
    </RoleGuard>
  );
}

function AdminTimetableContent() {
  // Navigation Drill-Down State (Hierarchy: Year -> Dept -> Semester -> Section -> Grid)
  const [navStep, setNavStep] = useState<"year" | "dept" | "sem" | "section" | "grid">("grid");
  const [selectedYear, setSelectedYear] = useState<string>("1st Year");
  const [selectedDept, setSelectedDept] = useState<string>("CSE");
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedSection, setSelectedSection] = useState<string>("Section A");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");

  // Master Slots Data
  const [slots, setSlots] = useState<DBClassSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DBClassSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Dynamic Subjects List for Modal
  const [dynamicSubjects, setDynamicSubjects] = useState<
    { courseCode: string; title: string; courseType: string; assignedFaculty: string }[]
  >([]);

  // Form State
  const [formData, setFormData] = useState<TimetableSlotInput>({
    subject: "",
    subjectCode: "",
    department: "CSE",
    year: "1st Year",
    semester: 1,
    section: "Section A",
    room: "R-101",
    facultyName: "",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    periodType: "CLASS",
  });

  // Fetch timetable slots for currently selected Dept + Year + Semester + Section
  const fetchTimetable = async () => {
    setIsLoading(true);
    try {
      const filterData: {
        department?: string;
        year?: string;
        semester?: number;
        section?: string;
        dayOfWeek?: string | number;
      } = {
        department: selectedDept,
        year: selectedYear,
        semester: selectedSemester,
        section: selectedSection,
      };

      if (selectedDayFilter !== "ALL") {
        filterData.dayOfWeek = selectedDayFilter;
      }

      const res = await getAdminTimetableApi({ data: filterData });
      if (res.success) {
        setSlots(res.slots);
      } else {
        toast.error(res.error || "Failed to fetch master timetable.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error fetching master timetable.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [selectedDept, selectedYear, selectedSemester, selectedSection, selectedDayFilter]);

  // Load dynamic catalog subjects when opening Add/Edit modal or changing parameters
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await getDynamicSubjectsApi({
          data: {
            department: formData.department,
            year: formData.year,
            semester: formData.semester ?? selectedSemester ?? 1,
            periodType: formData.periodType ?? "CLASS",
          },
        });
        if (res.success && res.subjects) {
          setDynamicSubjects(res.subjects);
        }
      } catch {
        // ignore
      }
    };
    if (isAddModalOpen || isEditModalOpen) {
      loadSubjects();
    }
  }, [
    formData.department,
    formData.year,
    formData.semester,
    formData.periodType,
    selectedSemester,
    isAddModalOpen,
    isEditModalOpen,
  ]);

  // Handle cell click (populated or empty cell)
  const handleCellClick = (dayNum: number, periodDef: typeof PERIOD_DEFINITIONS[0], existingSlot?: DBClassSlot) => {
    setServerError(null);
    if (existingSlot) {
      handleOpenEdit(existingSlot);
    } else {
      let defaultPeriodType: PeriodType = "CLASS";
      if ("breakType" in periodDef && periodDef.breakType === "BREAK") defaultPeriodType = "BREAK";
      if ("breakType" in periodDef && periodDef.breakType === "LUNCH") defaultPeriodType = "LUNCH";

      setFormData({
        subject: "",
        subjectCode: "",
        department: selectedDept,
        year: selectedYear,
        semester: selectedSemester,
        section: selectedSection,
        room: "R-101",
        facultyName: "",
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
    setFormData({
      subject: "",
      subjectCode: "",
      department: selectedDept,
      year: selectedYear,
      semester: selectedSemester,
      section: selectedSection,
      room: "R-101",
      facultyName: "",
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
      department: slot.department,
      year: slot.year,
      semester: slot.semester || selectedSemester || 1,
      section: slot.section,
      room: slot.room || "",
      facultyName: slot.faculty_name || "",
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

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await addTimetableSlotApi({ data: formData });
      if (res.success) {
        toast.success("Timetable slot added successfully!");
        setIsAddModalOpen(false);
        fetchTimetable();
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

  // Submit Edit
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
        fetchTimetable();
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

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);

    try {
      const res = await deleteTimetableSlotApi({
        data: { id: selectedSlot.id },
      });

      if (res.success) {
        toast.success("Timetable slot deleted successfully!");
        setIsDeleteModalOpen(false);
        fetchTimetable();
      } else {
        toast.error(res.error || "Failed to delete timetable slot.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete timetable slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get matching slot for a given day and period start time
  const getSlotForCell = (dayNum: number, periodStart: string, periodEnd: string) => {
    return slots.find(
      (s) =>
        s.day_of_week === dayNum &&
        s.start_time.slice(0, 5) <= periodStart &&
        s.end_time.slice(0, 5) >= periodEnd
    ) || slots.find(
      (s) =>
        s.day_of_week === dayNum &&
        s.start_time.slice(0, 5) === periodStart
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-primary" />
            <span>Data-Driven Master Institutional Schedule</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">Time Table</h1>
        </div>

        {/* Action Button & Navigation Cards Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNavStep("year")}
            className="gap-2 text-xs font-semibold flex-1 sm:flex-initial"
          >
            <Layers className="w-4 h-4 text-primary" />
            <span>Hierarchy Card View</span>
          </Button>

          <Button
            onClick={() => handleOpenAdd()}
            className="gap-2 font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 rounded-xl px-4 sm:px-5 flex-1 sm:flex-initial text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add / Edit Time Table</span>
          </Button>
        </div>
      </div>

      {/* Step Navigation Breadcrumbs */}
      <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/40 p-2 sm:p-2.5 rounded-xl border text-xs font-semibold overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setNavStep("year")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            navStep === "year"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Year: {selectedYear}</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

        <button
          onClick={() => setNavStep("dept")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            navStep === "dept"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Dept: {selectedDept}</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

        <button
          onClick={() => setNavStep("sem")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            navStep === "sem"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Semester: Sem {selectedSemester}</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

        <button
          onClick={() => setNavStep("section")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            navStep === "section"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Section: {selectedSection}</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

        <button
          onClick={() => setNavStep("grid")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            navStep === "grid"
              ? "bg-primary text-primary-foreground font-bold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Timetable Grid</span>
        </button>
      </div>

      {/* DRILL-DOWN CARD NAVIGATION VIEWS */}
      {navStep === "year" && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Step 1: Select Academic Year
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {YEARS.map((year) => (
              <button
                key={year}
                onClick={() => {
                  setSelectedYear(year);
                  const sems = getSemestersForYear(year);
                  setSelectedSemester(sems[0] ?? 1);
                  setNavStep("dept");
                }}
                className="bg-card hover:bg-primary/5 border-2 hover:border-primary rounded-2xl p-6 text-left transition-all group shadow-sm flex flex-col justify-between h-44"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                      {year}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="text-xl font-black mt-3">{year} Timetable</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Semesters {getSemestersForYear(year).join(" & ")}
                  </p>
                </div>
                <div className="text-xs font-bold text-primary flex items-center gap-1 mt-4 pt-3 border-t">
                  <span>Choose Department</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {navStep === "dept" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setNavStep("year")} className="gap-1 text-xs">
              <ArrowLeft className="w-4 h-4" /> Back to Years
            </Button>
            <h2 className="text-base font-bold text-foreground">
              Step 2: Select Department for <span className="text-primary">{selectedYear}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => {
                  setSelectedDept(dept);
                  setNavStep("sem");
                }}
                className="bg-card hover:bg-primary/5 border-2 hover:border-primary rounded-xl p-4 text-center transition-all group shadow-xs space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  {dept.slice(0, 3)}
                </div>
                <div className="font-extrabold text-sm">{dept}</div>
                <div className="text-[11px] text-muted-foreground">Department</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {navStep === "sem" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setNavStep("dept")} className="gap-1 text-xs">
              <ArrowLeft className="w-4 h-4" /> Back to Departments
            </Button>
            <h2 className="text-base font-bold text-foreground">
              Step 3: Select Semester for <span className="text-primary">{selectedDept} • {selectedYear}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 max-w-md">
            {getSemestersForYear(selectedYear).map((sem) => (
              <button
                key={sem}
                onClick={() => {
                  setSelectedSemester(sem);
                  setNavStep("section");
                }}
                className="bg-card hover:bg-primary/5 border-2 hover:border-primary rounded-2xl p-6 text-center transition-all group shadow-sm space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black text-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  Sem {sem}
                </div>
                <div>
                  <div className="font-extrabold text-base">Semester {sem}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Dynamic subject catalog</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {navStep === "section" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setNavStep("sem")} className="gap-1 text-xs">
              <ArrowLeft className="w-4 h-4" /> Back to Semesters
            </Button>
            <h2 className="text-base font-bold text-foreground">
              Step 4: Select Section for <span className="text-primary">{selectedDept} • {selectedYear} (Semester {selectedSemester})</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SECTIONS.map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setSelectedSection(sec);
                  setNavStep("grid");
                }}
                className="bg-card hover:bg-primary/5 border-2 hover:border-primary rounded-2xl p-6 text-center transition-all group shadow-sm space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black text-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  {sec.replace("Section ", "")}
                </div>
                <div>
                  <div className="font-extrabold text-base">{sec}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Click to view timetable grid</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TIMETABLE GRID SCHEDULE VIEW */}
      {navStep === "grid" && (
        <div className="space-y-5">
          {/* Top Filter Bar (Hierarchy: Department -> Year -> Semester -> Section -> Day) */}
          <div className="bg-card border rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase">Department</Label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-10 text-xs font-bold mt-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs font-semibold">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase">Year</Label>
              <Select
                value={selectedYear}
                onValueChange={(val) => {
                  setSelectedYear(val);
                  const sems = getSemestersForYear(val);
                  setSelectedSemester(sems[0] ?? 1);
                }}
              >
                <SelectTrigger className="h-10 text-xs font-bold mt-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y} className="text-xs font-semibold">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase">Semester</Label>
              <Select
                value={String(selectedSemester)}
                onValueChange={(val) => setSelectedSemester(parseInt(val, 10))}
              >
                <SelectTrigger className="h-10 text-xs font-bold mt-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSemestersForYear(selectedYear).map((s) => (
                    <SelectItem key={s} value={String(s)} className="text-xs font-semibold">
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="h-10 text-xs font-bold mt-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs font-semibold">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase">Day</Label>
              <Select value={selectedDayFilter} onValueChange={setSelectedDayFilter}>
                <SelectTrigger className="h-10 text-xs font-bold mt-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-semibold">
                    All Days (Mon - Sat)
                  </SelectItem>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.num} value={String(d.num)} className="text-xs font-semibold">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* MAIN GRID SCHEDULE MATRIX TABLE */}
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                {/* Table Header Days */}
                <thead className="bg-muted/70 text-muted-foreground border-b uppercase font-bold text-[11px]">
                  <tr>
                    <th className="px-3 py-3 w-[70px] text-center border-r">Period</th>
                    <th className="px-3 py-3 w-[110px] text-center border-r">Time</th>
                    {DAYS_OF_WEEK.filter(
                      (d) => selectedDayFilter === "ALL" || selectedDayFilter === String(d.num)
                    ).map((d) => (
                      <th key={d.num} className="px-4 py-3 text-center border-r last:border-r-0">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y text-xs">
                  {PERIOD_DEFINITIONS.map((pDef, pIdx) => {
                    const activeDays = DAYS_OF_WEEK.filter(
                      (d) => selectedDayFilter === "ALL" || selectedDayFilter === String(d.num)
                    );

                    // Break / Lunch Banner Row
                    if (pDef.isBreak) {
                      return (
                        <tr key={`break-${pIdx}`} className="bg-amber-500/10 dark:bg-amber-950/30 border-y border-amber-300/50">
                          <td className="px-2 py-2 text-center font-bold font-mono text-muted-foreground border-r">
                            --
                          </td>
                          <td className="px-2 py-2 text-center font-mono text-[10px] text-muted-foreground border-r whitespace-nowrap">
                            {pDef.label}
                          </td>
                          <td colSpan={activeDays.length} className="px-4 py-2.5 text-center font-bold text-amber-900 dark:text-amber-200">
                            <span className="inline-flex items-center gap-2 bg-amber-500/20 px-4 py-1 rounded-full text-xs border border-amber-300/60 shadow-2xs">
                              {pDef.title}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`period-${pDef.period}`} className="hover:bg-muted/10 transition-colors">
                        {/* Period Number Column */}
                        <td className="px-3 py-3 text-center font-extrabold text-sm border-r bg-muted/20">
                          {pDef.period}
                        </td>

                        {/* Time Window Column */}
                        <td className="px-3 py-3 text-center font-mono text-[11px] text-muted-foreground border-r whitespace-nowrap font-medium bg-muted/20">
                          {pDef.label}
                        </td>

                        {/* Days Cells */}
                        {activeDays.map((d) => {
                          const slot = getSlotForCell(d.num, pDef.start, pDef.end);
                          const periodTypeClean = (slot?.period_type || "CLASS").toUpperCase();

                          return (
                            <td
                              key={d.num}
                              onClick={() => handleCellClick(d.num, pDef, slot)}
                              className="p-2 border-r last:border-r-0 align-top cursor-pointer hover:bg-accent/40 transition-all min-h-[90px] h-[90px]"
                            >
                              {slot ? (
                                <div
                                  className={`h-full w-full rounded-xl p-2.5 border transition-all flex flex-col justify-between relative group shadow-2xs ${
                                    periodTypeClean === "LAB"
                                      ? "bg-emerald-500/15 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100"
                                      : periodTypeClean === "SPORTS"
                                      ? "bg-amber-500/10 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100"
                                      : periodTypeClean === "LIBRARY"
                                      ? "bg-blue-500/10 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100"
                                      : periodTypeClean === "ACTIVITY"
                                      ? "bg-primary/10 dark:bg-primary/20 border-primary/20 text-primary"
                                      : periodTypeClean === "NO_CLASS"
                                      ? "bg-slate-500/10 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                      : "bg-blue-500/10 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="font-extrabold text-xs line-clamp-1">
                                        {slot.subject}
                                      </span>
                                      {periodTypeClean === "LAB" && <FlaskConical className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                      {periodTypeClean === "SPORTS" && <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                                      {periodTypeClean === "LIBRARY" && <BookMarked className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                      {periodTypeClean === "ACTIVITY" && <Palette className="w-3.5 h-3.5 text-primary shrink-0" />}
                                      {periodTypeClean === "NO_CLASS" && <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                    </div>

                                    {slot.faculty_name && (
                                      <div className="text-[11px] opacity-90 truncate mt-0.5 font-medium">
                                        {slot.faculty_name}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] opacity-80 font-mono pt-1">
                                    <span>{slot.room || "-"}</span>
                                    {periodTypeClean === "LAB" && (
                                      <span className="font-bold text-[9px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded">
                                        2 Hours
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full w-full rounded-xl border border-dashed border-border/60 hover:border-primary/50 flex flex-col items-center justify-center text-muted-foreground/50 hover:text-primary transition-all p-2 text-center">
                                  <Plus className="w-4 h-4 mb-0.5 opacity-60" />
                                  <span className="text-[10px] font-medium">+ Add</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Legend Bar */}
            <div className="bg-muted/40 p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-200 text-blue-800 dark:text-blue-200 font-bold text-[11px]">
                  CLASS (1 Hr)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-300 text-emerald-900 dark:text-emerald-100 font-bold text-[11px] flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" /> LAB (2 Hrs)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-200 text-blue-800 dark:text-blue-200 font-bold text-[11px] flex items-center gap-1">
                  <BookMarked className="w-3 h-3" /> LIBRARY
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-200 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> SPORTS
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-[11px]">
                  ACTIVITY
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-300 text-amber-800 dark:text-amber-200 font-bold text-[11px]">
                  BREAK
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-500/15 border border-slate-300 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                  NO CLASS
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Click on any cell in the schedule grid to edit or add period details.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PERIOD MODAL WITH DATA-DRIVEN SUBJECT LOADING */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(val) => {
        if (!val) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[600px] rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditModalOpen ? (
                <>
                  <Pencil className="w-5 h-5 text-primary" />
                  Edit Timetable Period Cell
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-primary" />
                  Add / Configure Timetable Period
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Configure period type, subject, teacher, and room for <span className="font-bold text-foreground">{formData.department} {formData.year} (Sem {formData.semester} • {formData.section})</span>.
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={isEditModalOpen ? handleEditSubmit : handleAddSubmit} className="space-y-4 pt-1">
            {/* Period Type Select */}
            <div>
              <Label className="text-xs font-bold">1. Select Period Type *</Label>
              <Select
                value={formData.periodType as string}
                onValueChange={(val) => {
                  const pt = val as PeriodType;
                  let defaultSub = formData.subject;
                  let defaultCode = formData.subjectCode;
                  let defaultStart = formData.startTime;
                  let defaultEnd = formData.endTime;

                  if (pt === "LAB") {
                    defaultStart = "11:10";
                    defaultEnd = "13:10";
                  } else if (pt === "BREAK") {
                    defaultSub = "Morning Break";
                    defaultCode = "BREAK-10M";
                    defaultStart = "11:00";
                    defaultEnd = "11:10";
                  } else if (pt === "LUNCH") {
                    defaultSub = "Lunch Break";
                    defaultCode = "LUNCH-1H";
                    defaultStart = "13:10";
                    defaultEnd = "14:10";
                  } else if (pt === "LIBRARY") {
                    defaultSub = "Library / Self Study";
                    defaultCode = "LIB-STUDY";
                  } else if (pt === "SPORTS") {
                    defaultSub = "Sports & Physical Education";
                    defaultCode = "SPORTS-1";
                  } else if (pt === "NO_CLASS") {
                    defaultSub = "No Class";
                    defaultCode = "NO-CLASS";
                  }

                  setFormData({
                    ...formData,
                    periodType: pt,
                    subject: defaultSub,
                    subjectCode: defaultCode,
                    startTime: defaultStart,
                    endTime: defaultEnd,
                  });
                }}
              >
                <SelectTrigger className="h-10 text-xs mt-1 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value} className="text-xs font-semibold">
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Semester Select */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Semester *</Label>
                <Select
                  value={String(formData.semester || 1)}
                  onValueChange={(val) =>
                    setFormData({ ...formData, semester: parseInt(val, 10) })
                  }
                >
                  <SelectTrigger className="h-10 text-xs mt-1 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getSemestersForYear(formData.year || selectedYear).map((s) => (
                      <SelectItem key={s} value={String(s)} className="text-xs font-semibold">
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Academic Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                >
                  <SelectTrigger className="h-10 text-xs mt-1 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs font-semibold">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Catalog Subject Picker */}
            {(formData.periodType === "CLASS" || formData.periodType === "LAB") && (
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 space-y-1.5">
                <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  2. Select Subject from Catalog ({formData.department} • Sem {formData.semester})
                </Label>
                <Select
                  onValueChange={(val) => {
                    const sub = dynamicSubjects.find((s) => s.courseCode === val);
                    if (sub) {
                      setFormData({
                        ...formData,
                        subject: sub.title,
                        subjectCode: sub.courseCode,
                        facultyName: sub.assignedFaculty !== "Unassigned" ? sub.assignedFaculty : (formData.facultyName || ""),
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-10 text-xs bg-background font-bold">
                    <SelectValue placeholder={`Select ${formData.periodType === "LAB" ? "Lab" : "Theory"} subject...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicSubjects.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground italic text-center">
                        No active catalog subjects found for Sem {formData.semester}. Enter manually below.
                      </div>
                    ) : (
                      dynamicSubjects.map((s) => (
                        <SelectItem key={s.courseCode} value={s.courseCode} className="text-xs font-semibold">
                          {s.courseCode} — {s.title} ({s.courseType})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Subject / Activity Name *</Label>
                <Input
                  required
                  placeholder="e.g. Data Structures"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="h-10 text-xs mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Subject Code *</Label>
                <Input
                  required
                  placeholder="e.g. CS-301"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                  className="h-10 text-xs mt-1 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Classroom / Lab Room</Label>
                <Input
                  placeholder="e.g. R-101 or Lab-1"
                  value={formData.room || ""}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="h-10 text-xs mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Faculty Name</Label>
                <Input
                  placeholder="e.g. Dr. Ramesh"
                  value={formData.facultyName || ""}
                  onChange={(e) => setFormData({ ...formData, facultyName: e.target.value })}
                  className="h-10 text-xs mt-1 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold">Day of Week *</Label>
                <Select
                  value={String(formData.dayOfWeek)}
                  onValueChange={(val) => setFormData({ ...formData, dayOfWeek: parseInt(val, 10) })}
                >
                  <SelectTrigger className="h-10 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.num} value={String(d.num)} className="text-xs font-semibold">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Start Time *</Label>
                <Input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-10 text-xs mt-1 font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">End Time *</Label>
                <Input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-10 text-xs mt-1 font-mono font-bold"
                />
              </div>
            </div>

            {formData.periodType === "LAB" && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 p-2.5 rounded-xl text-[11px] font-medium flex items-start gap-1.5">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>LAB Start Time Constraint:</strong> LAB periods can ONLY start at <strong>09:00 AM</strong>, <strong>11:10 AM</strong>, or <strong>02:10 PM (14:10)</strong> to avoid break/lunch collisions and ensure a 2-hour session.
                </span>
              </div>
            )}

            <DialogFooter className="pt-3">
              {isEditModalOpen && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    if (selectedSlot) handleOpenDelete(selectedSlot);
                  }}
                  className="mr-auto gap-1 text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4" /> Delete Cell
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-bold">
                {isSubmitting ? "Validating & Saving..." : "Save Timetable Slot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[420px] rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Timetable Period
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove period slot{" "}
              <span className="font-bold text-foreground">
                "{selectedSlot?.subject}" ({selectedSlot?.code})
              </span>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

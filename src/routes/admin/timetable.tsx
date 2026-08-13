import { useState, useMemo } from "react";
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
  X,
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
} from "@/components/ui/dialog";
import { ToneBadge } from "@/components/status-badge";

export const Route = createFileRoute("/admin/timetable")({
  head: () => ({ meta: [{ title: "Master Timetable — Admin Console" }] }),
  component: AdminTimetablePage,
});

export interface MasterTimetableSlot {
  id: string;
  department: "CSE" | "ECE" | "EEE" | "AIML" | "CIVIL" | "IT" | "MECH";
  year: "1st Year" | "2nd Year" | "3rd Year" | "4th Year";
  section: "Section A" | "Section B" | "Section C" | "Section D";
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
  period: number;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  facultyCode: string;
  room: string;
  isLab?: boolean;
}

const DEPARTMENTS = ["ALL", "CSE", "ECE", "EEE", "AIML", "CIVIL", "IT", "MECH"] as const;
const YEARS = ["ALL", "1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const SECTIONS = ["ALL", "Section A", "Section B", "Section C", "Section D"] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Initial Institutional Master Timetable Dataset
const INITIAL_SCHEDULE_DATA: MasterTimetableSlot[] = [
  // --- CSE 3rd Year Section A ---
  {
    id: "CSE-3A-MON-1",
    department: "CSE",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 1,
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    subjectCode: "CS301",
    subjectName: "Data Structures & Algorithms",
    facultyName: "Prof. Ravi Kumar",
    facultyCode: "FAC-CSE-114",
    room: "Room C-204",
  },
  {
    id: "CSE-3A-MON-2",
    department: "CSE",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 2,
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    subjectCode: "CS302",
    subjectName: "Database Management Systems",
    facultyName: "Dr. Anjali Rao",
    facultyCode: "HOD-CSE-001",
    room: "Room C-204",
  },
  {
    id: "CSE-3A-MON-3",
    department: "CSE",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 3,
    startTime: "11:15 AM",
    endTime: "12:15 PM",
    subjectCode: "CS303",
    subjectName: "Operating Systems Lab",
    facultyName: "Prof. S. Mahesh",
    facultyCode: "FAC-CSE-202",
    room: "Computer Lab 3",
    isLab: true,
  },
  {
    id: "CSE-3A-MON-4",
    department: "CSE",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 4,
    startTime: "01:00 PM",
    endTime: "02:00 PM",
    subjectCode: "CS304",
    subjectName: "Computer Networks",
    facultyName: "Prof. Ravi Kumar",
    facultyCode: "FAC-CSE-114",
    room: "Room C-204",
  },
  {
    id: "CSE-3A-MON-5",
    department: "CSE",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 5,
    startTime: "02:00 PM",
    endTime: "03:00 PM",
    subjectCode: "CS305",
    subjectName: "Seminar & Technical Writing",
    facultyName: "Dr. Anjali Rao",
    facultyCode: "HOD-CSE-001",
    room: "Seminar Hall SH-1",
  },

  // --- CSE 3rd Year Section B ---
  {
    id: "CSE-3B-MON-1",
    department: "CSE",
    year: "3rd Year",
    section: "Section B",
    day: "Mon",
    period: 1,
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    subjectCode: "CS302",
    subjectName: "Database Management Systems",
    facultyName: "Dr. Anjali Rao",
    facultyCode: "HOD-CSE-001",
    room: "Room C-205",
  },
  {
    id: "CSE-3B-MON-2",
    department: "CSE",
    year: "3rd Year",
    section: "Section B",
    day: "Mon",
    period: 2,
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    subjectCode: "CS301",
    subjectName: "Data Structures & Algorithms",
    facultyName: "Prof. Ravi Kumar",
    facultyCode: "FAC-CSE-114",
    room: "Room C-205",
  },

  // --- ECE 3rd Year Section A ---
  {
    id: "ECE-3A-MON-1",
    department: "ECE",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 1,
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    subjectCode: "EC301",
    subjectName: "Digital Signal Processing",
    facultyName: "Dr. S. Venkat",
    facultyCode: "HOD-ECE-001",
    room: "Room E-102",
  },
  {
    id: "ECE-3A-MON-2",
    department: "ECE",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 2,
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    subjectCode: "EC302",
    subjectName: "VLSI Design & Architecture",
    facultyName: "Prof. K. Swathi",
    facultyCode: "FAC-ECE-108",
    room: "Room E-102",
  },
  {
    id: "ECE-3A-MON-3",
    department: "ECE",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 3,
    startTime: "11:15 AM",
    endTime: "12:15 PM",
    subjectCode: "EC303",
    subjectName: "Microcontrollers Lab",
    facultyName: "Dr. S. Venkat",
    facultyCode: "HOD-ECE-001",
    room: "Microcontroller Lab 2",
    isLab: true,
  },

  // --- EEE 2nd Year Section A ---
  {
    id: "EEE-2A-MON-1",
    department: "EEE",
    year: "2nd Year",
    section: "Section A",
    day: "Mon",
    period: 1,
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    subjectCode: "EE201",
    subjectName: "Electrical Machines - I",
    facultyName: "Dr. R. Ramakrishnan",
    facultyCode: "HOD-EEE-001",
    room: "Room B-101",
  },

  // --- AIML 3rd Year Section A ---
  {
    id: "AIML-3A-MON-1",
    department: "AIML",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 1,
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    subjectCode: "AI301",
    subjectName: "Deep Learning & Neural Nets",
    facultyName: "Dr. K. V. Sharma",
    facultyCode: "HOD-AIML-001",
    room: "AI Supercomputing Lab",
    isLab: true,
  },

  // --- CIVIL 4th Year Section A ---
  {
    id: "CIVIL-4A-MON-1",
    department: "CIVIL",
    year: "4th Year",
    section: "Section A",
    day: "Mon",
    period: 1,
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    subjectCode: "CE401",
    subjectName: "Structural Analysis & Steel Design",
    facultyName: "Dr. M. K. Varma",
    facultyCode: "HOD-CIVIL-001",
    room: "Room V-201",
  },

  // --- IT 3rd Year Section A ---
  {
    id: "IT-3A-MON-1",
    department: "IT",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 1,
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    subjectCode: "IT301",
    subjectName: "Cloud Computing & AWS",
    facultyName: "Dr. N. Swaminathan",
    facultyCode: "HOD-IT-001",
    room: "IT Lab 1",
    isLab: true,
  },

  // --- MECH 3rd Year Section A ---
  {
    id: "MECH-3A-MON-1",
    department: "MECH",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 1,
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    subjectCode: "ME301",
    subjectName: "Applied Thermodynamics",
    facultyName: "Dr. P. K. Sharma",
    facultyCode: "HOD-MECH-001",
    room: "Room M-104",
  },
  {
    id: "MECH-3A-MON-2",
    department: "MECH",
    year: "3rd Year",
    section: "Section A",
    day: "Mon",
    period: 2,
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    subjectCode: "ME302",
    subjectName: "Kinematics of Machinery",
    facultyName: "Prof. V. Rajesh",
    facultyCode: "FAC-MECH-201",
    room: "Room M-104",
  },
];

function AdminTimetablePage() {
  // Master slots state for real-time CRUD mutations
  const [slotsList, setSlotsList] = useState<MasterTimetableSlot[]>(INITIAL_SCHEDULE_DATA);

  // Filters state
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedDay, setSelectedDay] = useState<(typeof DAYS)[number]>("Mon");
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit Modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<MasterTimetableSlot | null>(null);

  // Form inputs state
  const [formDept, setFormDept] = useState<MasterTimetableSlot["department"]>("CSE");
  const [formYear, setFormYear] = useState<MasterTimetableSlot["year"]>("3rd Year");
  const [formSection, setFormSection] = useState<MasterTimetableSlot["section"]>("Section A");
  const [formDay, setFormDay] = useState<MasterTimetableSlot["day"]>("Mon");
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formStartTime, setFormStartTime] = useState("09:00 AM");
  const [formEndTime, setFormEndTime] = useState("10:00 AM");
  const [formSubjectCode, setFormSubjectCode] = useState("");
  const [formSubjectName, setFormSubjectName] = useState("");
  const [formFacultyName, setFormFacultyName] = useState("");
  const [formFacultyCode, setFormFacultyCode] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formIsLab, setFormIsLab] = useState(false);

  // Delete Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSlot, setDeletingSlot] = useState<MasterTimetableSlot | null>(null);

  const handleResetFilters = () => {
    setSelectedDept("ALL");
    setSelectedYear("ALL");
    setSelectedSection("ALL");
    setSelectedDay("Mon");
    setSearchQuery("");
  };

  // Filtered timetable slots based on department, year, section, day & search query
  const filteredSlots = useMemo(() => {
    return slotsList.filter((slot) => {
      if (selectedDept !== "ALL" && slot.department !== selectedDept) return false;
      if (selectedYear !== "ALL" && slot.year !== selectedYear) return false;
      if (selectedSection !== "ALL" && slot.section !== selectedSection) return false;
      if (slot.day !== selectedDay) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSubject =
          slot.subjectName.toLowerCase().includes(q) || slot.subjectCode.toLowerCase().includes(q);
        const matchesFaculty =
          slot.facultyName.toLowerCase().includes(q) || slot.facultyCode.toLowerCase().includes(q);
        const matchesRoom = slot.room.toLowerCase().includes(q);
        if (!matchesSubject && !matchesFaculty && !matchesRoom) return false;
      }

      return true;
    });
  }, [slotsList, selectedDept, selectedYear, selectedSection, selectedDay, searchQuery]);

  // Dynamic Metrics
  const metrics = useMemo(() => {
    const uniqueRooms = new Set(filteredSlots.map((s) => s.room)).size;
    const uniqueFaculty = new Set(filteredSlots.map((s) => s.facultyName)).size;
    return {
      totalClasses: filteredSlots.length,
      activeRooms: uniqueRooms,
      facultyTeaching: uniqueFaculty,
    };
  }, [filteredSlots]);

  // Open modal for Adding new period slot
  const handleOpenAddModal = () => {
    setEditingSlot(null);
    setFormDept(selectedDept !== "ALL" ? (selectedDept as any) : "CSE");
    setFormYear(selectedYear !== "ALL" ? (selectedYear as any) : "3rd Year");
    setFormSection(selectedSection !== "ALL" ? (selectedSection as any) : "Section A");
    setFormDay(selectedDay);
    setFormPeriod(1);
    setFormStartTime("09:00 AM");
    setFormEndTime("10:00 AM");
    setFormSubjectCode("");
    setFormSubjectName("");
    setFormFacultyName("");
    setFormFacultyCode("");
    setFormRoom("");
    setFormIsLab(false);
    setFormModalOpen(true);
  };

  // Open modal for Editing existing period slot
  const handleOpenEditModal = (slot: MasterTimetableSlot) => {
    setEditingSlot(slot);
    setFormDept(slot.department);
    setFormYear(slot.year);
    setFormSection(slot.section);
    setFormDay(slot.day);
    setFormPeriod(slot.period);
    setFormStartTime(slot.startTime);
    setFormEndTime(slot.endTime);
    setFormSubjectCode(slot.subjectCode);
    setFormSubjectName(slot.subjectName);
    setFormFacultyName(slot.facultyName);
    setFormFacultyCode(slot.facultyCode);
    setFormRoom(slot.room);
    setFormIsLab(Boolean(slot.isLab));
    setFormModalOpen(true);
  };

  // Save (Add / Update) Slot with Schedule Conflict Validations
  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formSubjectCode.trim() ||
      !formSubjectName.trim() ||
      !formFacultyName.trim() ||
      !formRoom.trim()
    ) {
      toast.error("Please fill in all required period details.");
      return;
    }

    // 1. Check Class Section Schedule Conflict (Same Dept, Year, Section, Day, and Period Number or Start Time)
    const sectionConflict = slotsList.find(
      (s) =>
        s.id !== editingSlot?.id &&
        s.department === formDept &&
        s.year === formYear &&
        s.section === formSection &&
        s.day === formDay &&
        (s.period === formPeriod || s.startTime.trim() === formStartTime.trim()),
    );

    if (sectionConflict) {
      toast.error("Schedule Conflict Blocked!", {
        description: `Period ${formPeriod} (${formStartTime}) is ALREADY assigned to ${sectionConflict.subjectCode} (${sectionConflict.subjectName}) for ${formDept} ${formYear} ${formSection} on ${formDay}.`,
      });
      return;
    }

    // 2. Check Room Allocation Conflict (Same Room, Day, and Period Number or Start Time)
    const roomConflict = slotsList.find(
      (s) =>
        s.id !== editingSlot?.id &&
        s.day === formDay &&
        s.room.trim().toLowerCase() === formRoom.trim().toLowerCase() &&
        (s.period === formPeriod || s.startTime.trim() === formStartTime.trim()),
    );

    if (roomConflict) {
      toast.error("Room Allocation Conflict Blocked!", {
        description: `${formRoom} is ALREADY booked for ${roomConflict.department} ${roomConflict.year} ${roomConflict.section} (${roomConflict.subjectCode}) during Period ${formPeriod} on ${formDay}.`,
      });
      return;
    }

    // 3. Check Faculty Overbooking Conflict (Same Faculty, Day, and Period Number or Start Time)
    const facultyConflict = slotsList.find(
      (s) =>
        s.id !== editingSlot?.id &&
        s.day === formDay &&
        s.facultyName.trim().toLowerCase() === formFacultyName.trim().toLowerCase() &&
        (s.period === formPeriod || s.startTime.trim() === formStartTime.trim()),
    );

    if (facultyConflict) {
      toast.error("Faculty Overbooking Conflict Blocked!", {
        description: `${formFacultyName} is ALREADY scheduled to teach ${facultyConflict.department} ${facultyConflict.year} ${facultyConflict.section} during Period ${formPeriod} on ${formDay}.`,
      });
      return;
    }

    if (editingSlot) {
      // Update existing slot
      const updatedSlot: MasterTimetableSlot = {
        ...editingSlot,
        department: formDept,
        year: formYear,
        section: formSection,
        day: formDay,
        period: formPeriod,
        startTime: formStartTime,
        endTime: formEndTime,
        subjectCode: formSubjectCode.trim().toUpperCase(),
        subjectName: formSubjectName.trim(),
        facultyName: formFacultyName.trim(),
        facultyCode: formFacultyCode.trim().toUpperCase() || "FAC-GEN-001",
        room: formRoom.trim(),
        isLab: formIsLab,
      };

      setSlotsList((prev) => prev.map((s) => (s.id === editingSlot.id ? updatedSlot : s)));
      toast.success(`Period ${formPeriod} Updated!`, {
        description: `${formSubjectCode} (${formDept} ${formYear} ${formSection}) updated successfully.`,
      });
    } else {
      // Create new slot
      const newSlot: MasterTimetableSlot = {
        id: `SLOT-${Date.now()}`,
        department: formDept,
        year: formYear,
        section: formSection,
        day: formDay,
        period: formPeriod,
        startTime: formStartTime,
        endTime: formEndTime,
        subjectCode: formSubjectCode.trim().toUpperCase(),
        subjectName: formSubjectName.trim(),
        facultyName: formFacultyName.trim(),
        facultyCode: formFacultyCode.trim().toUpperCase() || "FAC-GEN-001",
        room: formRoom.trim(),
        isLab: formIsLab,
      };

      setSlotsList((prev) => [newSlot, ...prev]);
      toast.success(`New Timetable Period Added!`, {
        description: `${formSubjectCode} scheduled for ${formDept} ${formYear} ${formSection} on ${formDay}.`,
      });
    }

    setFormModalOpen(false);
  };

  // Open Delete Confirmation
  const handleOpenDeleteModal = (slot: MasterTimetableSlot) => {
    setDeletingSlot(slot);
    setDeleteModalOpen(true);
  };

  // Confirm Delete Slot
  const handleConfirmDelete = () => {
    if (!deletingSlot) return;
    setSlotsList((prev) => prev.filter((s) => s.id !== deletingSlot.id));
    toast.success(`Timetable Slot Deleted!`, {
      description: `Removed ${deletingSlot.subjectCode} from ${deletingSlot.department} ${deletingSlot.year} timetable.`,
    });
    setDeleteModalOpen(false);
    setDeletingSlot(null);
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Page Header with Add Slot Action Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Institutional Master Timetable"
            description="Filter, inspect, add, edit, and manage period schedules across all academic departments, years, and sections."
            breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Master Timetable" }]}
          />
          <Button
            onClick={handleOpenAddModal}
            className="h-10 px-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs shrink-0 self-start sm:self-auto gap-2"
          >
            <Plus className="size-4" />
            <span>Add New Period Slot</span>
          </Button>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Filter Timetables</h3>
            </div>
            {(selectedDept !== "ALL" ||
              selectedYear !== "ALL" ||
              selectedSection !== "ALL" ||
              searchQuery.trim()) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-8 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <RotateCcw className="size-3.5 mr-1" /> Clear Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Department Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Department</Label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-border">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept} className="text-xs">
                      {dept === "ALL"
                        ? "All Departments (CSE, ECE, MECH...)"
                        : `${dept} Department`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Academic Year Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-border">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((yr) => (
                    <SelectItem key={yr} value={yr} className="text-xs">
                      {yr === "ALL" ? "All Years (1st - 4th Year)" : yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-border">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((sec) => (
                    <SelectItem key={sec} value={sec} className="text-xs">
                      {sec === "ALL" ? "All Sections (Sec A - D)" : sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Keyword Search */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Search Subject / Room / Faculty
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search CS301, Room C-204..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-border"
                />
              </div>
            </div>
          </div>

          {/* Day Selector Tabs */}
          <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0">Day:</span>
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  selectedDay === d
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Live Filter Summary & Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-surface p-4 rounded-xl border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Scheduled Classes</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.totalClasses}</p>
            </div>
            <BookOpen className="size-6 text-primary opacity-80" />
          </div>

          <div className="card-surface p-4 rounded-xl border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Classrooms</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.activeRooms}</p>
            </div>
            <DoorOpen className="size-6 text-blue-600 dark:text-blue-400 opacity-80" />
          </div>

          <div className="card-surface p-4 rounded-xl border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Faculty Members Teaching</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.facultyTeaching}</p>
            </div>
            <Users className="size-6 text-emerald-600 dark:text-emerald-400 opacity-80" />
          </div>
        </div>

        {/* Master Timetable Schedule Display */}
        <section className="card-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <span>{selectedDay} Schedule</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({selectedDept} &bull; {selectedYear} &bull; {selectedSection})
              </span>
            </h3>
            <ToneBadge tone="info">{filteredSlots.length} Classes Found</ToneBadge>
          </div>

          {filteredSlots.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">
                No timetable slots match the selected filters.
              </p>
              <p>Try switching Department, Year, Section or Day, or add a new period slot.</p>
              <div className="pt-2 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="rounded-xl text-xs"
                >
                  Reset Filters
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenAddModal}
                  className="rounded-xl text-xs bg-primary text-primary-foreground"
                >
                  <Plus className="size-3.5 mr-1" /> Add Period Slot
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-divider">
              {filteredSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Period Badge */}
                    <div className="w-24 shrink-0 p-2.5 rounded-xl border border-primary/20 bg-primary/5 text-center">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-primary">
                        PERIOD {slot.period}
                      </span>
                      <span className="block text-xs font-bold text-foreground mt-0.5">
                        {slot.startTime}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {slot.endTime}
                      </span>
                    </div>

                    {/* Class Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{slot.subjectName}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-semibold text-muted-foreground">
                          {slot.subjectCode}
                        </span>
                        {slot.isLab && <ToneBadge tone="warning">Lab Session</ToneBadge>}
                      </div>

                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>
                          Faculty: <strong className="text-foreground">{slot.facultyName}</strong> (
                          {slot.facultyCode})
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                        <span className="px-2 py-0.5 rounded-md border border-border bg-card font-semibold text-foreground">
                          {slot.department}
                        </span>
                        <span className="px-2 py-0.5 rounded-md border border-border bg-card font-medium text-muted-foreground">
                          {slot.year} &bull; {slot.section}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DoorOpen className="size-3 text-primary" /> {slot.room}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(slot)}
                      className="rounded-xl text-xs h-8 font-medium gap-1"
                    >
                      <Pencil className="size-3.5 text-primary" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDeleteModal(slot)}
                      className="rounded-xl text-xs h-8 text-destructive hover:bg-destructive/10 gap-1"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add / Edit Timetable Period Modal */}
        <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                {editingSlot ? (
                  <Pencil className="size-4 text-primary" />
                ) : (
                  <Plus className="size-4 text-primary" />
                )}
                <span>{editingSlot ? "Edit Timetable Period" : "Add New Timetable Period"}</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveSlot} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                {/* Department */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Department</Label>
                  <Select value={formDept} onValueChange={(val) => setFormDept(val as any)}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.filter((d) => d !== "ALL").map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {d} Department
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Academic Year */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Academic Year</Label>
                  <Select value={formYear} onValueChange={(val) => setFormYear(val as any)}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.filter((y) => y !== "ALL").map((y) => (
                        <SelectItem key={y} value={y} className="text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Section */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Section</Label>
                  <Select value={formSection} onValueChange={(val) => setFormSection(val as any)}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.filter((s) => s !== "ALL").map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Day */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Schedule Day</Label>
                  <Select value={formDay} onValueChange={(val) => setFormDay(val as any)}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Period Number */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Period #</Label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(Number(e.target.value))}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Start Time */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Start Time</Label>
                  <Input
                    type="text"
                    required
                    placeholder="09:00 AM"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">End Time</Label>
                  <Input
                    type="text"
                    required
                    placeholder="10:00 AM"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Subject Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Subject Code</Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. CS301"
                    value={formSubjectCode}
                    onChange={(e) => setFormSubjectCode(e.target.value)}
                    className="h-9 text-xs rounded-xl uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Subject Name</Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Data Structures"
                    value={formSubjectName}
                    onChange={(e) => setFormSubjectName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Faculty Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Assigned Faculty Name</Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Prof. Ravi Kumar"
                    value={formFacultyName}
                    onChange={(e) => setFormFacultyName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Faculty Staff Code</Label>
                  <Input
                    type="text"
                    placeholder="e.g. FAC-CSE-114"
                    value={formFacultyCode}
                    onChange={(e) => setFormFacultyCode(e.target.value)}
                    className="h-9 text-xs rounded-xl uppercase font-mono"
                  />
                </div>
              </div>

              {/* Room & Lab Checkbox */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Room / Lab Location</Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Room C-204"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1 flex items-center pt-5 gap-2">
                  <input
                    type="checkbox"
                    id="isLab"
                    checked={formIsLab}
                    onChange={(e) => setFormIsLab(e.target.checked)}
                    className="size-4 rounded border-border text-primary"
                  />
                  <Label htmlFor="isLab" className="text-xs font-semibold cursor-pointer">
                    Practical Lab Session
                  </Label>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-divider">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  {editingSlot ? "Save Period Changes" : "Add Period to Timetable"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                <Trash2 className="size-5" /> Delete Timetable Period?
              </DialogTitle>
            </DialogHeader>

            {deletingSlot && (
              <div className="space-y-3 pt-2 text-xs text-muted-foreground">
                <p>
                  Are you sure you want to delete period slot{" "}
                  <strong>
                    Period {deletingSlot.period} ({deletingSlot.subjectName})
                  </strong>
                  ?
                </p>
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1 font-mono text-[11px] text-foreground">
                  <p>
                    Department: {deletingSlot.department} &bull; {deletingSlot.year} &bull;{" "}
                    {deletingSlot.section}
                  </p>
                  <p>
                    Time: {deletingSlot.startTime} – {deletingSlot.endTime} on {deletingSlot.day}
                  </p>
                  <p>
                    Faculty: {deletingSlot.facultyName} | Room: {deletingSlot.room}
                  </p>
                </div>
                <p className="text-destructive font-medium">This action cannot be undone.</p>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-divider">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                variant="destructive"
                className="rounded-xl text-xs font-semibold"
              >
                Delete Period Slot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

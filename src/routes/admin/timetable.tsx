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
import { ToneBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  getAdminTimetableApi,
  addTimetableSlotApi,
  updateTimetableSlotApi,
  deleteTimetableSlotApi,
} from "@/lib/api/timetable.server";
import type { DBClassSlot, TimetableSlotInput } from "@/lib/db/timetable.server";

export const Route = createFileRoute("/admin/timetable")({
  head: () => ({ meta: [{ title: "Master Timetable — Admin Console" }] }),
  component: AdminTimetablePage,
});

const DEPARTMENTS = ["ALL", "CSE", "ECE", "EEE", "AIML", "CIVIL", "IT", "MECH"] as const;
const YEARS = ["ALL", "1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const SECTIONS = ["ALL", "Section A", "Section B", "Section C", "Section D"] as const;
const DAYS_OF_WEEK = [
  { value: "ALL", label: "All Days" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

function dayNumberToName(num: number): string {
  const map: Record<number, string> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };
  return map[num] ?? "Monday";
}

function AdminTimetablePage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminTimetableContent />
    </RoleGuard>
  );
}

function AdminTimetableContent() {
  // State
  const [slots, setSlots] = useState<DBClassSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedDay, setSelectedDay] = useState<string>("ALL");
  const [facultyFilter, setFacultyFilter] = useState<string>("");
  const [roomFilter, setRoomFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DBClassSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<TimetableSlotInput>({
    subject: "",
    subjectCode: "",
    department: "CSE",
    year: "3rd Year",
    section: "Section A",
    room: "Room C-204",
    facultyName: "",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
  });

  // Fetch data
  const fetchTimetable = async () => {
    setIsLoading(true);
    try {
      const filterData: {
        department?: string;
        year?: string;
        section?: string;
        dayOfWeek?: string | number;
        facultyName?: string;
        room?: string;
        search?: string;
      } = {};

      if (selectedDept !== "ALL") filterData.department = selectedDept;
      if (selectedYear !== "ALL") filterData.year = selectedYear;
      if (selectedSection !== "ALL") filterData.section = selectedSection;
      if (selectedDay !== "ALL") filterData.dayOfWeek = selectedDay;
      if (facultyFilter.trim()) filterData.facultyName = facultyFilter.trim();
      if (roomFilter.trim()) filterData.room = roomFilter.trim();
      if (searchQuery.trim()) filterData.search = searchQuery.trim();

      const res = await getAdminTimetableApi({ data: filterData });

      if (res.success) {
        setSlots(res.slots);
      } else {
        toast.error(res.error || "Failed to load master timetable.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to query timetable.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [selectedDept, selectedYear, selectedSection, selectedDay, facultyFilter, roomFilter, searchQuery]);

  const handleClearFilters = () => {
    setSelectedDept("ALL");
    setSelectedYear("ALL");
    setSelectedSection("ALL");
    setSelectedDay("ALL");
    setFacultyFilter("");
    setRoomFilter("");
    setSearchQuery("");
  };

  const handleOpenAdd = () => {
    setServerError(null);
    setFormData({
      subject: "",
      subjectCode: "",
      department: selectedDept !== "ALL" ? selectedDept : "CSE",
      year: selectedYear !== "ALL" ? selectedYear : "3rd Year",
      section: selectedSection !== "ALL" ? selectedSection : "Section A",
      room: "Room C-204",
      facultyName: "",
      dayOfWeek: selectedDay !== "ALL" ? parseInt(selectedDay, 10) : 1,
      startTime: "09:00",
      endTime: "10:00",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (slot: DBClassSlot) => {
    setServerError(null);
    setSelectedSlot(slot);
    setFormData({
      subject: slot.subject,
      subjectCode: slot.code || slot.subject_code || "",
      department: slot.department,
      year: slot.year,
      section: slot.section,
      room: slot.room,
      facultyName: slot.faculty_name,
      dayOfWeek: slot.day_of_week,
      startTime: slot.start_time.slice(0, 5),
      endTime: slot.end_time.slice(0, 5),
    });
    setIsEditModalOpen(true);
  };

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
        toast.success("Timetable slot created successfully!");
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

  // Compute Grid Data
  const gridDays = [1, 2, 3, 4, 5, 6]; // Mon to Sat
  const filteredSlots = slots;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Master Timetable Management"
        description="Authoritative institutional schedule and class conflict prevention engine. All student spot-checks and movement verifications resolve against this data."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted p-1 rounded-lg border">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="gap-2 text-xs"
              >
                <LayoutGrid className="w-4 h-4" />
                Weekly Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="gap-2 text-xs"
              >
                <List className="w-4 h-4" />
                Table View
              </Button>
            </div>

            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Class Slot
            </Button>
          </div>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Active Slots
            </span>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-2">{slots.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Across all departments</p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Departments
            </span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {new Set(slots.map((s) => s.department)).size}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Synchronized schedules</p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Unique Rooms
            </span>
            <DoorOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {new Set(slots.map((s) => s.room)).size}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Zero-collision allocations</p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Faculty
            </span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {new Set(slots.map((s) => s.faculty_name)).size}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Double-booking protected</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="w-4 h-4 text-primary" />
            <span>Timetable Filters & Search</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs text-muted-foreground gap-1 hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Department */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Department</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-9 text-xs mt-1">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d === "ALL" ? "All Depts" : d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 text-xs mt-1">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y === "ALL" ? "All Years" : y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="h-9 text-xs mt-1">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s === "ALL" ? "All Sections" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Day of Week</Label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="h-9 text-xs mt-1">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((d) => (
                  <SelectItem key={d.value} value={d.value} className="text-xs">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Faculty Filter */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Faculty</Label>
            <Input
              placeholder="e.g. Dr. Rao"
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="h-9 text-xs mt-1"
            />
          </div>

          {/* Room Filter */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Room / Lab</Label>
            <Input
              placeholder="e.g. C-204"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="h-9 text-xs mt-1"
            />
          </div>

          {/* Global Search */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Keyword Search</Label>
            <div className="relative mt-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
              <Input
                placeholder="Search subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs pl-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Views */}
      {isLoading ? (
        <div className="border rounded-xl p-12 text-center bg-card">
          <Clock className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-medium">Loading authoritative master schedule...</p>
        </div>
      ) : filteredSlots.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Timetable Slots Found"
          description="No class slots match the selected criteria. Try adjusting your filters or click below to create a new slot."
          action={
            <Button onClick={handleOpenAdd} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Class Slot
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        /* WEEKLY MATRIX GRID VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {gridDays.map((dayNum) => {
              const daySlots = filteredSlots
                .filter((s) => s.day_of_week === dayNum)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

              return (
                <div
                  key={dayNum}
                  className="bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden"
                >
                  {/* Day Header */}
                  <div className="bg-muted/60 px-3 py-2.5 border-b flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {dayNumberToName(dayNum)}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono font-medium">
                      {daySlots.length} {daySlots.length === 1 ? "class" : "classes"}
                    </span>
                  </div>

                  {/* Day Cards */}
                  <div className="p-2.5 space-y-2.5 flex-1 min-h-[300px]">
                    {daySlots.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-6 text-center italic">
                        No scheduled classes
                      </div>
                    ) : (
                      daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="bg-background border rounded-lg p-3 hover:shadow-md transition-shadow group relative flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-xs leading-tight line-clamp-2">
                                {slot.subject}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded font-semibold whitespace-nowrap">
                                {slot.code || slot.subject_code}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                              <Clock className="w-3 h-3 text-primary shrink-0" />
                              <span>
                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <DoorOpen className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate">{slot.room}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Users className="w-3 h-3 text-purple-500 shrink-0" />
                              <span className="truncate">{slot.faculty_name}</span>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold pt-1 border-t">
                              <span className="text-primary font-bold">{slot.department}</span>
                              <span>•</span>
                              <span>{slot.year}</span>
                              <span>•</span>
                              <span>{slot.section}</span>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t opacity-90 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(slot)}
                              className="h-6 w-6 hover:text-primary"
                              title="Edit Slot"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(slot)}
                              className="h-6 w-6 hover:text-destructive text-muted-foreground"
                              title="Delete Slot"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABULAR LIST VIEW */
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground border-b uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Time Window</th>
                  <th className="px-4 py-3">Subject & Code</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Year & Section</th>
                  <th className="px-4 py-3">Room / Lab</th>
                  <th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSlots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold">
                      {dayNumberToName(slot.day_of_week)}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{slot.subject}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {slot.code || slot.subject_code}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-primary">{slot.department}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span>{slot.year}</span>
                      <span className="text-muted-foreground ml-1">({slot.section})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <DoorOpen className="w-3 h-3 text-emerald-500" />
                        {slot.room}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3 text-purple-500" />
                        {slot.faculty_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(slot)}
                          className="h-7 px-2 text-xs gap-1 hover:text-primary"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(slot)}
                          className="h-7 px-2 text-xs gap-1 hover:text-destructive text-muted-foreground"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add Master Timetable Slot
            </DialogTitle>
            <DialogDescription>
              Create a new class slot in the institutional master schedule. The 3-way conflict engine will verify classroom, faculty, and batch availability.
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Subject Name *</Label>
                <Input
                  required
                  placeholder="e.g. Data Structures"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Subject Code *</Label>
                <Input
                  required
                  placeholder="e.g. CS-304"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.filter((d) => d !== "ALL").map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Year *</Label>
                <Select
                  value={formData.year}
                  onValueChange={(val) => setFormData({ ...formData, year: val })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
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

              <div>
                <Label className="text-xs">Section *</Label>
                <Select
                  value={formData.section}
                  onValueChange={(val) => setFormData({ ...formData, section: val })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Classroom / Lab *</Label>
                <Input
                  required
                  placeholder="e.g. Room C-204"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Assigned Faculty Name *</Label>
                <Input
                  required
                  placeholder="e.g. Prof. Ravi Kumar"
                  value={formData.facultyName}
                  onChange={(e) => setFormData({ ...formData, facultyName: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Day of Week *</Label>
                <Select
                  value={String(formData.dayOfWeek)}
                  onValueChange={(val) =>
                    setFormData({ ...formData, dayOfWeek: parseInt(val, 10) })
                  }
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.filter((d) => d.value !== "ALL").map((d) => (
                      <SelectItem key={d.value} value={d.value} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Start Time (24h) *</Label>
                <Input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">End Time (24h) *</Label>
                <Input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Validating & Adding..." : "Save Timetable Slot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Master Timetable Slot
            </DialogTitle>
            <DialogDescription>
              Update class details. Overlap validation will exclude the current slot.
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Subject Name *</Label>
                <Input
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Subject Code *</Label>
                <Input
                  required
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.filter((d) => d !== "ALL").map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Year *</Label>
                <Select
                  value={formData.year}
                  onValueChange={(val) => setFormData({ ...formData, year: val })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
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

              <div>
                <Label className="text-xs">Section *</Label>
                <Select
                  value={formData.section}
                  onValueChange={(val) => setFormData({ ...formData, section: val })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Classroom / Lab *</Label>
                <Input
                  required
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Faculty Name *</Label>
                <Input
                  required
                  value={formData.facultyName}
                  onChange={(e) => setFormData({ ...formData, facultyName: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Day of Week *</Label>
                <Select
                  value={String(formData.dayOfWeek)}
                  onValueChange={(val) =>
                    setFormData({ ...formData, dayOfWeek: parseInt(val, 10) })
                  }
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.filter((d) => d.value !== "ALL").map((d) => (
                      <SelectItem key={d.value} value={d.value} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Start Time *</Label>
                <Input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">End Time *</Label>
                <Input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Timetable Slot
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this class slot? This action cannot be undone and will immediately update the authoritative schedule.
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="bg-muted/50 border rounded-lg p-3 space-y-1 text-xs">
              <div className="font-bold text-sm">{selectedSlot.subject}</div>
              <div className="text-muted-foreground">
                {selectedSlot.department} • {selectedSlot.year} • {selectedSlot.section}
              </div>
              <div className="font-mono text-primary font-semibold">
                {dayNumberToName(selectedSlot.day_of_week)}: {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
              </div>
              <div className="text-muted-foreground">
                Room: {selectedSlot.room} | Faculty: {selectedSlot.faculty_name}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

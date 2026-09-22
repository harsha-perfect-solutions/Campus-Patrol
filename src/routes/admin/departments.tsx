import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Building2,
  DoorOpen,
  Filter,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  RefreshCw,
  Power,
  Users,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Layers,
  FlaskConical,
  GraduationCap,
  MapPin,
  Coffee,
  Car,
  Trophy,
  BookOpen,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import {
  getDepartmentsApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
} from "@/lib/api/departments.server";
import {
  getCampusRoomsApi,
  createRoomApi,
  updateRoomApi,
  deleteRoomApi,
} from "@/lib/api/rooms.server";
import type { DepartmentItem } from "@/lib/db/departments.server";
import type { CampusRoom } from "@/lib/db/rooms.server";

interface SearchParams {
  dept?: string;
  tab?: "departments" | "campus-areas";
}

export const Route = createFileRoute("/admin/departments")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      dept: typeof search.dept === "string" ? search.dept : undefined,
      tab: search.tab === "campus-areas" ? "campus-areas" : "departments",
    };
  },
  head: () => ({ meta: [{ title: "Departments & Rooms — Admin Console" }] }),
  component: AdminDepartmentsAndRoomsPage,
});

const DEFAULT_ROAMING_LOCATIONS = [
  { id: "LOC-01", name: "Canteen & Cafeteria", category: "Food & Dining", desc: "Main student cafeteria and food court area", icon: Coffee },
  { id: "LOC-02", name: "Campus Parking Area", category: "Parking Zone", desc: "Student & staff vehicle parking grounds", icon: Car },
  { id: "LOC-03", name: "Sports & Athletics Ground", category: "Sports Field", desc: "Outdoor sports field, track & playground", icon: Trophy },
  { id: "LOC-04", name: "Library Corridor & Reading Foyer", category: "Common Foyer", desc: "Central library main entrance and reading foyer", icon: BookOpen },
  { id: "LOC-05", name: "Main Entrance Gate", category: "Gate & Exit", desc: "Campus main security gate and exit turnstiles", icon: MapPin },
  { id: "LOC-06", name: "Hostel Quadrangle & Gate", category: "Hostel Zone", desc: "Residential hostel main entrance quadrangle", icon: MapPin },
  { id: "LOC-07", name: "Administrative Block Corridor", category: "Admin Zone", desc: "Main administrative office corridor", icon: Building2 },
];

const ROOM_TYPES = ["ALL", "Classroom", "Laboratory", "Seminar Hall", "Auditorium"] as const;

export function AdminDepartmentsAndRoomsPage({ initialDept }: { initialDept?: string }) {
  const searchParams = useSearch({ strict: false }) as SearchParams;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"departments" | "campus-areas">(
    searchParams?.tab || "departments"
  );

  // Selected Department for Room Drill-Down (null = Overview Grid)
  const [selectedDeptCode, setSelectedDeptCode] = useState<string | null>(
    initialDept || searchParams?.dept || null
  );

  // Data State
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [roomsList, setRoomsList] = useState<CampusRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Common Areas
  const [roamingLocations, setRoamingLocations] = useState(DEFAULT_ROAMING_LOCATIONS);
  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCategory, setNewLocationCategory] = useState("Common Area");
  const [newLocationDesc, setNewLocationDesc] = useState("");

  // Filters for Departments Overview
  const [deptSearch, setDeptSearch] = useState("");
  const [deptStatusFilter, setDeptStatusFilter] = useState("ALL");

  // Filters for Rooms View
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("ALL");
  const [roomSearch, setRoomSearch] = useState("");

  // Department Modal State
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [formDeptCode, setFormDeptCode] = useState("");
  const [formDeptName, setFormDeptName] = useState("");
  const [formDeptDesc, setFormDeptDesc] = useState("");

  // Delete Department Modal State
  const [deleteDeptModalOpen, setDeleteDeptModalOpen] = useState(false);
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null);

  // Room Modal State
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<CampusRoom | null>(null);
  const [formRoomCode, setFormRoomCode] = useState("");
  const [formRoomBuilding, setFormRoomBuilding] = useState("");
  const [formRoomFloor, setFormRoomFloor] = useState("1st Floor");
  const [formRoomType, setFormRoomType] = useState<CampusRoom["roomType"]>("Classroom");
  const [formRoomCapacity, setFormRoomCapacity] = useState<number>(60);
  const [formRoomFacilities, setFormRoomFacilities] = useState("Projector, AC, Smartboard");
  const [formRoomStatus, setFormRoomStatus] = useState<"Active" | "Maintenance">("Active");

  // Delete Room Modal State
  const [deleteRoomModalOpen, setDeleteRoomModalOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<CampusRoom | null>(null);

  // Fetch All Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, roomRes] = await Promise.all([
        getDepartmentsApi({
          data: {
            status: "ALL",
            search: "",
          },
        }),
        getCampusRoomsApi({
          data: {
            buildingBlock: "ALL",
            roomType: "ALL",
            search: "",
          },
        }),
      ]);

      if (deptRes.success) {
        setDepartments(deptRes.departments);
      }
      if (roomRes.success && roomRes.rooms) {
        setRoomsList(roomRes.rooms);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load departments and rooms data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helpers to match rooms to a department
  const getRoomsForDept = useCallback(
    (deptCode: string) => {
      const normalizedCode = deptCode.toUpperCase();
      return roomsList.filter((r) => {
        const b = r.buildingBlock.toUpperCase();
        return (
          b.includes(`(${normalizedCode})`) ||
          b.includes(normalizedCode) ||
          r.roomCode.toUpperCase().includes(normalizedCode)
        );
      });
    },
    [roomsList]
  );

  // Selected Department Object
  const selectedDeptObj = useMemo(() => {
    if (!selectedDeptCode) return null;
    return (
      departments.find(
        (d) => d.departmentCode.toUpperCase() === selectedDeptCode.toUpperCase()
      ) || null
    );
  }, [departments, selectedDeptCode]);

  // Filtered Rooms for Current Selected Department
  const filteredDeptRooms = useMemo(() => {
    if (!selectedDeptCode) return [];
    const deptRooms = getRoomsForDept(selectedDeptCode);
    return deptRooms.filter((r) => {
      if (roomTypeFilter !== "ALL" && r.roomType !== roomTypeFilter) return false;
      if (roomSearch.trim()) {
        const q = roomSearch.toLowerCase().trim();
        const matchesCode = r.roomCode.toLowerCase().includes(q);
        const matchesType = r.roomType.toLowerCase().includes(q);
        const matchesFloor = r.floor.toLowerCase().includes(q);
        const matchesFac = r.facilities?.some((f) => f.toLowerCase().includes(q));
        if (!matchesCode && !matchesType && !matchesFloor && !matchesFac) return false;
      }
      return true;
    });
  }, [selectedDeptCode, getRoomsForDept, roomTypeFilter, roomSearch]);

  // Filtered Departments Overview
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (deptStatusFilter !== "ALL" && d.status !== deptStatusFilter) return false;
      if (deptSearch.trim()) {
        const q = deptSearch.toLowerCase().trim();
        const matchesCode = d.departmentCode.toLowerCase().includes(q);
        const matchesName = d.departmentName.toLowerCase().includes(q);
        const matchesDesc = (d.description || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [departments, deptStatusFilter, deptSearch]);

  // Stats
  const globalStats = useMemo(() => {
    const totalDepts = departments.length;
    const totalRooms = roomsList.length;
    const totalClassrooms = roomsList.filter((r) => r.roomType === "Classroom").length;
    const totalLabs = roomsList.filter((r) => r.roomType === "Laboratory").length;
    return { totalDepts, totalRooms, totalClassrooms, totalLabs };
  }, [departments, roomsList]);

  // Navigation handlers
  const handleSelectDepartment = (deptCode: string) => {
    setSelectedDeptCode(deptCode);
    setRoomTypeFilter("ALL");
    setRoomSearch("");
    navigate({
      to: "/admin/departments",
      search: { dept: deptCode, tab: "departments" },
      replace: true,
    });
  };

  const handleBackToOverview = () => {
    setSelectedDeptCode(null);
    setRoomTypeFilter("ALL");
    setRoomSearch("");
    navigate({
      to: "/admin/departments",
      search: { dept: undefined, tab: "departments" },
      replace: true,
    });
  };

  // Department CRUD Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setFormDeptCode("");
    setFormDeptName("");
    setFormDeptDesc("");
    setDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setFormDeptCode(dept.departmentCode);
    setFormDeptName(dept.departmentName);
    setFormDeptDesc(dept.description);
    setDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeptCode.trim() || !formDeptName.trim()) {
      toast.error("Please enter both Department Code and Name.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingDept) {
        const res = await updateDepartmentApi({
          data: {
            id: editingDept.id,
            input: {
              departmentCode: formDeptCode.trim().toUpperCase(),
              departmentName: formDeptName.trim(),
              description: formDeptDesc.trim(),
            },
          },
        });

        if (res.success && res.department) {
          toast.success(`Department ${res.department.departmentCode} updated.`);
          setDeptModalOpen(false);
          fetchData();
        } else {
          toast.error(res.error || "Failed to update department.");
        }
      } else {
        const res = await createDepartmentApi({
          data: {
            input: {
              departmentCode: formDeptCode.trim().toUpperCase(),
              departmentName: formDeptName.trim(),
              description: formDeptDesc.trim(),
              status: "Active",
            },
          },
        });

        if (res.success && res.department) {
          toast.success(`Department ${res.department.departmentCode} created.`);
          setDeptModalOpen(false);
          fetchData();
        } else {
          toast.error(res.error || "Failed to create department.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving department.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteDept = async () => {
    if (!deletingDept) return;
    setSubmitting(true);
    try {
      const res = await deleteDepartmentApi({
        data: { id: deletingDept.id },
      });

      if (res.success) {
        toast.success(`Department ${deletingDept.departmentCode} removed.`);
        setDeleteDeptModalOpen(false);
        setDeletingDept(null);
        if (selectedDeptCode === deletingDept.departmentCode) {
          setSelectedDeptCode(null);
        }
        fetchData();
      } else {
        toast.error(res.error || "Failed to remove department.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to remove department.");
    } finally {
      setSubmitting(false);
    }
  };

  // Room CRUD Handlers
  const handleOpenAddRoom = (deptCode?: string) => {
    const targetDept = deptCode || selectedDeptCode || "CSE";
    setEditingRoom(null);
    setFormRoomCode(`Room ${targetDept}-`);
    setFormRoomBuilding(`${targetDept}-Block (${targetDept})`);
    setFormRoomFloor("1st Floor");
    setFormRoomType("Classroom");
    setFormRoomCapacity(60);
    setFormRoomFacilities("Projector, AC, Smartboard");
    setFormRoomStatus("Active");
    setRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: CampusRoom) => {
    setEditingRoom(room);
    setFormRoomCode(room.roomCode);
    setFormRoomBuilding(room.buildingBlock);
    setFormRoomFloor(room.floor);
    setFormRoomType(room.roomType);
    setFormRoomCapacity(room.capacity || 60);
    setFormRoomFacilities((room.facilities || []).join(", "));
    setFormRoomStatus(room.status || "Active");
    setRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoomCode.trim() || !formRoomBuilding.trim()) {
      toast.error("Please provide Room Code and Department/Building.");
      return;
    }

    const facilitiesArray = formRoomFacilities
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      if (editingRoom) {
        const res = await updateRoomApi({
          data: {
            id: editingRoom.id,
            input: {
              roomCode: formRoomCode.trim(),
              buildingBlock: formRoomBuilding.trim(),
              floor: formRoomFloor.trim(),
              roomType: formRoomType,
              capacity: Number(formRoomCapacity) || 60,
              facilities: facilitiesArray,
              status: formRoomStatus,
            },
          },
        });

        if (res.success && res.room) {
          toast.success(`Room ${res.room.roomCode} updated.`);
          setRoomModalOpen(false);
          fetchData();
        } else {
          toast.error(res.error || "Failed to update room.");
        }
      } else {
        const res = await createRoomApi({
          data: {
            input: {
              roomCode: formRoomCode.trim(),
              buildingBlock: formRoomBuilding.trim(),
              floor: formRoomFloor.trim(),
              roomType: formRoomType,
              capacity: Number(formRoomCapacity) || 60,
              facilities: facilitiesArray,
              status: formRoomStatus,
            },
          },
        });

        if (res.success && res.room) {
          toast.success(`Room ${res.room.roomCode} created.`);
          setRoomModalOpen(false);
          fetchData();
        } else {
          toast.error(res.error || "Failed to create room.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save room.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteRoom = async () => {
    if (!deletingRoom) return;
    setSubmitting(true);
    try {
      const res = await deleteRoomApi({
        data: { id: deletingRoom.id },
      });

      if (res.success) {
        toast.success(`Room ${deletingRoom.roomCode} deleted.`);
        setDeleteRoomModalOpen(false);
        setDeletingRoom(null);
        fetchData();
      } else {
        toast.error(res.error || "Failed to delete room.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete room.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) {
      toast.error("Please provide Location Name.");
      return;
    }
    const newLoc = {
      id: `LOC-${Date.now().toString().slice(-4)}`,
      name: newLocationName.trim(),
      category: newLocationCategory.trim() || "Common Area",
      desc: newLocationDesc.trim() || "Campus open roaming zone",
      icon: MapPin,
    };
    setRoamingLocations((prev) => [...prev, newLoc]);
    toast.success(`Campus Area "${newLoc.name}" Added!`);
    setAddLocationModalOpen(false);
    setNewLocationName("");
    setNewLocationDesc("");
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Departments & Rooms"
            description="Manage academic department structures, classrooms, specialized laboratories, and campus facilities."
            breadcrumb={[
              { label: "Admin", to: "/admin/dashboard" },
              { label: "Departments & Rooms" },
              ...(selectedDeptCode ? [{ label: `${selectedDeptCode} Rooms` }] : []),
            ]}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="rounded-xl text-xs h-9 gap-1.5 font-semibold"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
            }
          />
          <div className="flex items-center gap-2">
            {activeTab === "departments" && !selectedDeptCode && (
              <Button
                onClick={handleOpenCreateDept}
                className="h-10 px-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs shrink-0 w-full sm:w-auto gap-2"
              >
                <Plus className="size-4" />
                <span>Add Department</span>
              </Button>
            )}
            {activeTab === "departments" && selectedDeptCode && (
              <Button
                onClick={() => handleOpenAddRoom(selectedDeptCode)}
                className="h-10 px-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs shrink-0 w-full sm:w-auto gap-2"
              >
                <Plus className="size-4" />
                <span>Add Room to {selectedDeptCode}</span>
              </Button>
            )}
            {activeTab === "campus-areas" && (
              <Button
                onClick={() => setAddLocationModalOpen(true)}
                className="h-10 px-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs shrink-0 w-full sm:w-auto gap-2"
              >
                <Plus className="size-4" />
                <span>Add Campus Area</span>
              </Button>
            )}
          </div>
        </div>

        {/* Global KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Departments
              </p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{globalStats.totalDepts}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-4.5" />
            </span>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Rooms
              </p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{globalStats.totalRooms}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
              <DoorOpen className="size-4.5" />
            </span>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Classrooms
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {globalStats.totalClassrooms}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              <GraduationCap className="size-4.5" />
            </span>
          </div>

          <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Specialized Labs
              </p>
              <p className="mt-1 text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                {globalStats.totalLabs}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
              <FlaskConical className="size-4.5" />
            </span>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-divider pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("departments");
              navigate({
                to: "/admin/departments",
                search: { dept: selectedDeptCode || undefined, tab: "departments" },
                replace: true,
              });
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer",
              activeTab === "departments"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Building2 className="size-4" />
            <span>Academic Departments & Rooms</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("campus-areas");
              navigate({
                to: "/admin/departments",
                search: { dept: undefined, tab: "campus-areas" },
                replace: true,
              });
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer",
              activeTab === "campus-areas"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <MapPin className="size-4" />
            <span>Campus Common Areas ({roamingLocations.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: ACADEMIC DEPARTMENTS & ROOMS ================= */}
        {activeTab === "departments" && (
          <div className="space-y-6">
            {/* VIEW MODE 1: ALL DEPARTMENTS OVERVIEW */}
            {!selectedDeptCode ? (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Filter Toolbar */}
                <div className="card-surface p-4 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      placeholder="Search department by code, name or description..."
                      className="pl-9 text-xs h-9 rounded-xl border-border w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={deptStatusFilter} onValueChange={setDeptStatusFilter}>
                      <SelectTrigger className="text-xs h-9 rounded-xl border-border w-full sm:w-36">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">
                          All Statuses
                        </SelectItem>
                        <SelectItem value="Active" className="text-xs">
                          Active Only
                        </SelectItem>
                        <SelectItem value="Inactive" className="text-xs">
                          Inactive Only
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {(deptSearch || deptStatusFilter !== "ALL") && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setDeptSearch("");
                          setDeptStatusFilter("ALL");
                        }}
                        title="Reset Filters"
                        className="h-9 w-9 shrink-0 rounded-lg"
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Departments Grid */}
                {loading ? (
                  <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
                    <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
                    <p>Loading departments...</p>
                  </div>
                ) : filteredDepartments.length === 0 ? (
                  <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
                    <Building2 className="size-8 mx-auto text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No departments found.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDepartments.map((dept) => {
                      const deptRooms = getRoomsForDept(dept.departmentCode);
                      const classrooms = deptRooms.filter((r) => r.roomType === "Classroom").length;
                      const labs = deptRooms.filter((r) => r.roomType === "Laboratory").length;

                      return (
                        <div
                          key={dept.id}
                          className="card-surface p-5 rounded-2xl border border-border text-xs space-y-4 flex flex-col justify-between hover:border-primary/50 transition-all shadow-xs group"
                        >
                          <div className="space-y-3">
                            {/* Header & Badges */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="size-10 rounded-xl bg-primary/10 text-primary font-black grid place-items-center text-sm">
                                  {dept.departmentCode}
                                </div>
                                <div>
                                  <h3 className="font-bold text-foreground text-sm leading-tight">
                                    {dept.departmentName}
                                  </h3>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    Code: {dept.departmentCode}
                                  </span>
                                </div>
                              </div>
                              <ToneBadge tone={dept.status === "Active" ? "success" : "neutral"}>
                                {dept.status}
                              </ToneBadge>
                            </div>

                            {/* Description */}
                            {dept.description && (
                              <p className="text-muted-foreground text-[11px] line-clamp-2">
                                {dept.description}
                              </p>
                            )}

                            {/* Allocated Rooms Summary */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                                <DoorOpen className="size-3" />
                                {deptRooms.length} Total Rooms
                              </span>
                              {classrooms > 0 && (
                                <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                                  <GraduationCap className="size-3" />
                                  {classrooms} Classrooms
                                </span>
                              )}
                              {labs > 0 && (
                                <span className="rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                                  <FlaskConical className="size-3" />
                                  {labs} Labs
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Footer */}
                          <div className="pt-3 border-t border-divider flex items-center justify-between gap-2">
                            <Button
                              onClick={() => handleSelectDepartment(dept.departmentCode)}
                              className="h-8 px-3 rounded-xl text-xs font-semibold bg-primary text-primary-foreground flex-1 justify-between group-hover:bg-primary/90"
                            >
                              <span>View {dept.departmentCode} Rooms</span>
                              <ChevronRight className="size-3.5" />
                            </Button>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleOpenEditDept(dept)}
                                title="Edit Department"
                                className="h-8 w-8 rounded-lg"
                              >
                                <Pencil className="size-3.5 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setDeletingDept(dept);
                                  setDeleteDeptModalOpen(true);
                                }}
                                title="Remove Department"
                                className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* VIEW MODE 2: DEPARTMENT ROOMS DRILL-DOWN */
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Department Drilldown Header & Navigation */}
                <div className="card-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider pb-4">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToOverview}
                        className="rounded-xl text-xs h-9 gap-1.5 font-semibold"
                      >
                        <ArrowLeft className="size-4" />
                        <span>All Departments</span>
                      </Button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-foreground">
                            {selectedDeptObj?.departmentName || `${selectedDeptCode} Department`}
                          </h2>
                          <span className="rounded-lg bg-primary/10 text-primary font-mono text-xs px-2 py-0.5 font-bold">
                            {selectedDeptCode}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Showing {filteredDeptRooms.length} allocated classrooms and laboratories
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedDeptObj && handleOpenEditDept(selectedDeptObj)}
                        className="rounded-xl text-xs h-9 gap-1.5 font-semibold"
                      >
                        <Pencil className="size-3.5 text-primary" />
                        Edit Dept
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenAddRoom(selectedDeptCode)}
                        className="rounded-xl text-xs h-9 gap-1.5 font-semibold bg-primary text-primary-foreground"
                      >
                        <Plus className="size-3.5" />
                        Add Room
                      </Button>
                    </div>
                  </div>

                  {/* Quick Department Switcher Pill Strip */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                      Switch:
                    </span>
                    {departments.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDepartment(d.departmentCode)}
                        className={cn(
                          "px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                          d.departmentCode.toUpperCase() === selectedDeptCode.toUpperCase()
                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {d.departmentCode}
                      </button>
                    ))}
                  </div>

                  {/* Rooms Filters Inside Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="relative sm:col-span-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        placeholder={`Search ${selectedDeptCode} rooms by code, floor or facilities...`}
                        className="pl-9 text-xs h-9 rounded-xl border-border"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                        <SelectTrigger className="text-xs h-9 rounded-xl border-border flex-1">
                          <SelectValue placeholder="Room Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t === "ALL" ? "All Room Types" : t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(roomSearch || roomTypeFilter !== "ALL") && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setRoomSearch("");
                            setRoomTypeFilter("ALL");
                          }}
                          title="Reset Filters"
                          className="h-9 w-9 shrink-0 rounded-lg"
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rooms Grid for Current Department */}
                {filteredDeptRooms.length === 0 ? (
                  <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-3">
                    <DoorOpen className="size-10 mx-auto text-muted-foreground/40" />
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        No rooms found for {selectedDeptCode} Department.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add classrooms or specialized labs allocated to {selectedDeptCode}.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenAddRoom(selectedDeptCode)}
                      className="rounded-xl text-xs bg-primary text-primary-foreground gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      Add First Room to {selectedDeptCode}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDeptRooms.map((room) => (
                      <div
                        key={room.id}
                        className="card-surface p-4 sm:p-5 rounded-2xl border border-border text-xs space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground text-sm block">
                              {room.roomCode}
                            </span>
                            <ToneBadge
                              tone={room.status === "Active" ? "success" : "warning"}
                            >
                              {room.status}
                            </ToneBadge>
                          </div>

                          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                            <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
                              {room.roomType}
                            </span>
                            <span>&bull;</span>
                            <span>{room.floor}</span>
                            <span>&bull;</span>
                            <span>Cap: {room.capacity} seats</span>
                          </div>

                          {/* Facilities Tags */}
                          {room.facilities && room.facilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {room.facilities.map((fac, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-md bg-primary/5 text-primary dark:bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium"
                                >
                                  {fac}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Room Actions */}
                        <div className="pt-3 border-t border-divider flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground truncate">
                            {room.buildingBlock}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenEditRoom(room)}
                              title="Edit Room"
                              className="h-7 w-7 rounded-lg"
                            >
                              <Pencil className="size-3.5 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setDeletingRoom(room);
                                setDeleteRoomModalOpen(true);
                              }}
                              title="Delete Room"
                              className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: CAMPUS COMMON AREAS ================= */}
        {activeTab === "campus-areas" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="card-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Campus Common & Outdoor Roaming Zones
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  General non-departmental areas monitored for student patrol and gate movement.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setAddLocationModalOpen(true)}
                className="rounded-xl text-xs bg-primary text-primary-foreground gap-1.5 font-semibold"
              >
                <Plus className="size-3.5" />
                Add Area
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roamingLocations.map((loc) => {
                const IconComponent = loc.icon || MapPin;
                return (
                  <div
                    key={loc.id}
                    className="card-surface p-5 rounded-2xl border border-border text-xs space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <IconComponent className="size-5" />
                        </span>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{loc.name}</h4>
                          <span className="text-[11px] font-semibold text-primary">
                            {loc.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-[11px] pt-1">{loc.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-divider flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono">{loc.id}</span>
                      <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                        Monitored
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= MODALS ================= */}

        {/* Add / Edit Department Modal */}
        <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                {editingDept ? (
                  <Pencil className="size-4 text-primary" />
                ) : (
                  <Plus className="size-4 text-primary" />
                )}
                <span>{editingDept ? "Edit Department" : "Add New Department"}</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveDepartment} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Department Code *</Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. CSE, ECE, MECH"
                  value={formDeptCode}
                  onChange={(e) => setFormDeptCode(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Department Full Name *</Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Computer Science & Engineering"
                  value={formDeptName}
                  onChange={(e) => setFormDeptName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Description / Block Info</Label>
                <Textarea
                  placeholder="e.g. C-Block Central Campus"
                  value={formDeptDesc}
                  onChange={(e) => setFormDeptDesc(e.target.value)}
                  className="text-xs rounded-xl min-h-20"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-divider">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeptModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  {submitting ? "Saving..." : editingDept ? "Save Changes" : "Create Department"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Department Confirmation Modal */}
        <Dialog open={deleteDeptModalOpen} onOpenChange={setDeleteDeptModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                <Trash2 className="size-5" /> Remove Department?
              </DialogTitle>
            </DialogHeader>

            {deletingDept && (
              <div className="space-y-3 pt-2 text-xs text-muted-foreground">
                <p>
                  Are you sure you want to remove{" "}
                  <strong>
                    {deletingDept.departmentName} ({deletingDept.departmentCode})
                  </strong>
                  ?
                </p>
                <p className="text-[11px] text-amber-600 font-semibold">
                  Note: Allocated rooms will remain preserved in the database.
                </p>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-divider">
              <Button
                variant="outline"
                onClick={() => setDeleteDeptModalOpen(false)}
                disabled={submitting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteDept}
                disabled={submitting}
                variant="destructive"
                className="rounded-xl text-xs font-semibold"
              >
                {submitting ? "Removing..." : "Remove Department"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add / Edit Room Modal */}
        <Dialog open={roomModalOpen} onOpenChange={setRoomModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                {editingRoom ? (
                  <Pencil className="size-4 text-primary" />
                ) : (
                  <Plus className="size-4 text-primary" />
                )}
                <span>{editingRoom ? "Edit Room Details" : "Add Room / Lab"}</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveRoom} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Room / Lab Code *</Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Room C-204 or Computer Lab 3"
                  value={formRoomCode}
                  onChange={(e) => setFormRoomCode(e.target.value)}
                  className="h-9 text-xs rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Department / Building *</Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. C-Block (CSE)"
                    value={formRoomBuilding}
                    onChange={(e) => setFormRoomBuilding(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Floor Level</Label>
                  <Select value={formRoomFloor} onValueChange={setFormRoomFloor}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"].map(
                        (f) => (
                          <SelectItem key={f} value={f} className="text-xs">
                            {f}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Room Classification</Label>
                  <Select
                    value={formRoomType}
                    onValueChange={(val) => setFormRoomType(val as CampusRoom["roomType"])}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Classroom", "Laboratory", "Seminar Hall", "Auditorium"].map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Seating Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={formRoomCapacity}
                    onChange={(e) => setFormRoomCapacity(Number(e.target.value))}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Equipment & Facilities (comma-separated)</Label>
                <Input
                  type="text"
                  placeholder="e.g. Projector, AC, Smartboard, High-speed LAN"
                  value={formRoomFacilities}
                  onChange={(e) => setFormRoomFacilities(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Operational Status</Label>
                <Select
                  value={formRoomStatus}
                  onValueChange={(val) => setFormRoomStatus(val as "Active" | "Maintenance")}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active" className="text-xs">
                      Active (Available for classes)
                    </SelectItem>
                    <SelectItem value="Maintenance" className="text-xs">
                      Maintenance / Under Repair
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-3 border-t border-divider">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoomModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  {submitting ? "Saving..." : editingRoom ? "Save Room Changes" : "Create Room"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Room Confirmation Modal */}
        <Dialog open={deleteRoomModalOpen} onOpenChange={setDeleteRoomModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                <Trash2 className="size-5" /> Delete Room?
              </DialogTitle>
            </DialogHeader>

            {deletingRoom && (
              <div className="space-y-3 pt-2 text-xs text-muted-foreground">
                <p>
                  Are you sure you want to delete{" "}
                  <strong>
                    {deletingRoom.roomCode} ({deletingRoom.buildingBlock})
                  </strong>
                  ?
                </p>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-divider">
              <Button
                variant="outline"
                onClick={() => setDeleteRoomModalOpen(false)}
                disabled={submitting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteRoom}
                disabled={submitting}
                variant="destructive"
                className="rounded-xl text-xs font-semibold"
              >
                {submitting ? "Deleting..." : "Delete Room"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Common Area Modal */}
        <Dialog open={addLocationModalOpen} onOpenChange={setAddLocationModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Plus className="size-4 text-primary" />
                <span>Add Common Campus Area</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateLocation} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Area Name *</Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. North Gate & Turnstiles"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Category</Label>
                <Input
                  type="text"
                  placeholder="e.g. Gate & Exit, Dining, Sports"
                  value={newLocationCategory}
                  onChange={(e) => setNewLocationCategory(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea
                  placeholder="Describe location and patrolling checkpoint..."
                  value={newLocationDesc}
                  onChange={(e) => setNewLocationDesc(e.target.value)}
                  className="text-xs rounded-xl min-h-20"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-divider">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddLocationModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  Add Area
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

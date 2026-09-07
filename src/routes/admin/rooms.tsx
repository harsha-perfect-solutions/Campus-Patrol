import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  DoorOpen,
  Filter,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  Monitor,
  RefreshCw,
  ArrowLeft,
  Layers,
  LayoutGrid,
  FlaskConical,
  GraduationCap,
  Info,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Coffee,
  Car,
  Trophy,
  BookOpen,
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
import { cn } from "@/lib/utils";
import {
  getCampusRoomsApi,
  createRoomApi,
  updateRoomApi,
  deleteRoomApi,
} from "@/lib/api/rooms.server";
import type { CampusRoom } from "@/lib/db/rooms.server";

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({ meta: [{ title: "Buildings & Campus Locations — Admin Console" }] }),
  component: AdminRoomsPage,
});

const ACADEMIC_BUILDINGS = [
  "C-Block (CSE)",
  "E-Block (ECE)",
  "B-Block (EEE)",
  "A-Block (AIML)",
  "V-Block (CIVIL)",
  "M-Block (MECH)",
  "SH-Block (Seminar)",
];

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

function AdminRoomsPage() {
  const [roomsList, setRoomsList] = useState<CampusRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Top Section Switcher: "BUILDINGS" (Academic Blocks & Rooms) | "ROAMING_LOCATIONS" (Outdoor & Common Areas)
  const [mainTab, setMainTab] = useState<"BUILDINGS" | "ROAMING_LOCATIONS">("BUILDINGS");

  // Level 2 Drill-down State for Academic Buildings: "BUILDINGS_LIST" | "BUILDING_DETAIL"
  const [viewMode, setViewMode] = useState<"BUILDINGS_LIST" | "BUILDING_DETAIL">("BUILDINGS_LIST");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("C-Block (CSE)");

  // Academic Building Blocks Master List
  const [customBuildings, setCustomBuildings] = useState<string[]>(ACADEMIC_BUILDINGS);

  // Campus Roaming Locations Master List
  const [roamingLocations, setRoamingLocations] = useState(DEFAULT_ROAMING_LOCATIONS);

  // Room Filters (Inside Building Detail)
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Add/Edit Room inside Academic Building
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<CampusRoom | null>(null);

  // Modal State for Add New Academic Building
  const [addBuildingModalOpen, setAddBuildingModalOpen] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");

  // Modal State for Add New Roaming Location
  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCategory, setNewLocationCategory] = useState("Common Area");
  const [newLocationDesc, setNewLocationDesc] = useState("");

  // Form Fields State for Room
  const [formRoomCode, setFormRoomCode] = useState("");
  const [formBuilding, setFormBuilding] = useState<string>("C-Block (CSE)");
  const [formFloor, setFormFloor] = useState("1st Floor");
  const [formType, setFormType] = useState<CampusRoom["roomType"]>("Classroom");
  const [formCapacity, setFormCapacity] = useState<number>(60);
  const [formFacilities, setFormFacilities] = useState("Projector, AC, Smartboard");

  // Delete Room Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<CampusRoom | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCampusRoomsApi({
        data: {
          buildingBlock: "ALL",
          roomType: "ALL",
          search: "",
        },
      });

      if (res.success && res.rooms) {
        setRoomsList(res.rooms);

        // Separate db common roaming areas vs academic building rooms
        const dbRoaming = res.rooms
          .filter((r) => r.roomType === "Common Area" || r.buildingBlock === "Common Roaming Area")
          .map((r) => ({
            id: r.id,
            name: r.roomCode,
            category: r.facilities[0] || "Common Area",
            desc: `Admin registered campus roaming location (${r.floor})`,
            icon: MapPin,
          }));

        const combinedRoaming = Array.from(
          new Map(
            [...DEFAULT_ROAMING_LOCATIONS, ...dbRoaming].map((item) => [item.name.toLowerCase(), item])
          ).values()
        );
        setRoamingLocations(combinedRoaming);

        // Academic building blocks
        const dbBuildings = res.rooms
          .map((r) => r.buildingBlock)
          .filter((b) => b !== "Common Roaming Area");
        const combinedBuildings = Array.from(new Set([...ACADEMIC_BUILDINGS, ...dbBuildings]));
        setCustomBuildings(combinedBuildings);
      } else {
        toast.error(res.error || "Failed to load campus inventory.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to connect to rooms server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Aggregate Metrics per Academic Building Block
  const buildingSummaries = useMemo(() => {
    return customBuildings.map((bName) => {
      const roomsInBuilding = roomsList.filter(
        (r) => r.buildingBlock.toLowerCase() === bName.toLowerCase()
      );
      const totalCapacity = roomsInBuilding.reduce((sum, r) => sum + r.capacity, 0);
      const labsCount = roomsInBuilding.filter((r) => r.roomType === "Laboratory").length;
      const classroomsCount = roomsInBuilding.filter((r) => r.roomType === "Classroom").length;

      return {
        name: bName,
        totalRooms: roomsInBuilding.length,
        totalCapacity,
        labsCount,
        classroomsCount,
        rooms: roomsInBuilding,
      };
    });
  }, [customBuildings, roomsList]);

  // Filtered Rooms for Selected Academic Building
  const filteredBuildingRooms = useMemo(() => {
    return roomsList.filter((r) => {
      const matchesBuilding = r.buildingBlock.toLowerCase() === selectedBuilding.toLowerCase();
      const matchesType = selectedType === "ALL" || r.roomType === selectedType;
      const matchesSearch =
        !searchQuery ||
        r.roomCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.facilities.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesBuilding && matchesType && matchesSearch;
    });
  }, [roomsList, selectedBuilding, selectedType, searchQuery]);

  // Metrics for currently selected academic building
  const selectedBuildingMetrics = useMemo(() => {
    const bRooms = roomsList.filter(
      (r) => r.buildingBlock.toLowerCase() === selectedBuilding.toLowerCase()
    );
    const totalCap = bRooms.reduce((acc, r) => acc + r.capacity, 0);
    const labsCount = bRooms.filter((r) => r.roomType === "Laboratory").length;
    const classroomsCount = bRooms.filter((r) => r.roomType === "Classroom").length;

    return {
      totalRooms: bRooms.length,
      totalCapacity: totalCap,
      labsCount,
      classroomsCount,
    };
  }, [roomsList, selectedBuilding]);

  // Save New Building Block
  const handleSaveBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newBuildingName.trim();
    if (!cleanName) {
      toast.error("Please enter a valid building block name.");
      return;
    }
    if (customBuildings.some((b) => b.toLowerCase() === cleanName.toLowerCase())) {
      toast.error("An academic building block with this name already exists.");
      return;
    }

    setCustomBuildings([...customBuildings, cleanName]);
    setSelectedBuilding(cleanName);
    setViewMode("BUILDING_DETAIL");
    setAddBuildingModalOpen(false);
    toast.success("Academic Building Added!", {
      description: `${cleanName} created. Now add classrooms and labs inside this building.`,
    });
  };

  // Save New Roaming Location to Database
  const handleSaveRoamingLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newLocationName.trim();
    if (!cleanName) {
      toast.error("Please enter a valid location name.");
      return;
    }
    if (roamingLocations.some((l) => l.name.toLowerCase() === cleanName.toLowerCase())) {
      toast.error("A campus roaming location with this name already exists.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createRoomApi({
        data: {
          roomCode: cleanName,
          buildingBlock: "Common Roaming Area",
          floor: "Ground Level",
          roomType: "Common Area",
          capacity: 100,
          facilities: [newLocationCategory],
          status: "Active",
        },
      });

      if (res.success) {
        toast.success("Campus Roaming Location Created!", {
          description: `"${cleanName}" saved to database. Faculty can now select this location when filing reports.`,
        });
        setAddLocationModalOpen(false);
        fetchRooms();
      } else {
        toast.error(res.error || "Failed to save location.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save location.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Add Room Modal
  const handleOpenAddRoom = (bName?: string) => {
    const targetBuilding = bName || selectedBuilding;
    setEditingRoom(null);
    setFormRoomCode("");
    setFormBuilding(targetBuilding);
    setFormFloor("1st Floor");
    setFormType("Classroom");
    setFormCapacity(60);
    setFormFacilities("Projector, AC, Smartboard");
    setFormModalOpen(true);
  };

  // Open Edit Room Modal
  const handleOpenEditRoom = (room: CampusRoom) => {
    setEditingRoom(room);
    setFormRoomCode(room.roomCode);
    setFormBuilding(room.buildingBlock);
    setFormFloor(room.floor);
    setFormType(room.roomType);
    setFormCapacity(room.capacity);
    setFormFacilities(room.facilities.join(", "));
    setFormModalOpen(true);
  };

  // Save Room (Add / Edit)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoomCode.trim() || !formBuilding.trim() || !formFloor.trim()) {
      toast.error("Please enter valid Room Code, Building Block, and Floor.");
      return;
    }

    const parsedFacilities = formFacilities
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
              buildingBlock: formBuilding,
              floor: formFloor.trim(),
              roomType: formType,
              capacity: formCapacity,
              facilities: parsedFacilities.length ? parsedFacilities : ["Projector", "AC"],
            },
          },
        });

        if (res.success && res.room) {
          toast.success("Room Updated!", {
            description: `${res.room.roomCode} in ${res.room.buildingBlock} updated successfully.`,
          });
          setFormModalOpen(false);
          fetchRooms();
        } else {
          toast.error(res.error || "Failed to update room.");
        }
      } else {
        const res = await createRoomApi({
          data: {
            roomCode: formRoomCode.trim(),
            buildingBlock: formBuilding,
            floor: formFloor.trim(),
            roomType: formType,
            capacity: formCapacity,
            facilities: parsedFacilities.length ? parsedFacilities : ["Projector", "AC"],
            status: "Active",
          },
        });

        if (res.success && res.room) {
          toast.success("New Room Added!", {
            description: `${res.room.roomCode} registered under ${res.room.buildingBlock}.`,
          });
          setFormModalOpen(false);
          fetchRooms();
        } else {
          toast.error(res.error || "Failed to add room.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving room.");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete Room
  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;
    setSubmitting(true);
    try {
      const res = await deleteRoomApi({
        data: { id: deletingRoom.id },
      });

      if (res.success) {
        toast.success("Room Removed!", {
          description: `${deletingRoom.roomCode} removed from campus registry.`,
        });
        setDeleteModalOpen(false);
        setDeletingRoom(null);
        fetchRooms();
      } else {
        toast.error(res.error || "Failed to remove room.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while removing room.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6 pb-16">
        {/* Page Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card border rounded-2xl p-4 sm:p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Campus Infrastructure Console</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">Buildings & Campus Locations</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {mainTab === "BUILDINGS" ? (
              <>
                <Button
                  onClick={() => setAddBuildingModalOpen(true)}
                  variant="outline"
                  className="gap-2 font-bold text-xs rounded-xl border-primary/40 hover:bg-primary/5 flex-1 sm:flex-initial"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span>+ Add Academic Building</span>
                </Button>

                <Button
                  onClick={() => handleOpenAddRoom(selectedBuilding)}
                  className="gap-2 font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 rounded-xl px-4 flex-1 sm:flex-initial text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Room to Building</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setAddLocationModalOpen(true)}
                className="gap-2 font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 rounded-xl px-4 sm:px-5 w-full sm:w-auto text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Campus Roaming Location</span>
              </Button>
            )}
          </div>
        </div>

        {/* Primary Master Navigation Tabs - High Contrast Premium Redesign */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-muted/60 p-2 rounded-2xl border border-border/80 shadow-inner">
          <button
            onClick={() => {
              setMainTab("BUILDINGS");
              setViewMode("BUILDINGS_LIST");
            }}
            className={`flex items-center gap-3.5 p-4 rounded-xl text-left transition-all duration-200 ${
              mainTab === "BUILDINGS"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/40 font-black"
                : "bg-card text-foreground hover:bg-card/80 border border-border shadow-xs font-semibold"
            }`}
          >
            <div className={`p-2.5 rounded-xl ${mainTab === "BUILDINGS" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black">1. Academic Buildings & Classrooms</p>
              <p className={`text-xs mt-0.5 ${mainTab === "BUILDINGS" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                Block-by-block classrooms, labs, capacities & faculty allocations
              </p>
            </div>
          </button>

          <button
            onClick={() => setMainTab("ROAMING_LOCATIONS")}
            className={`flex items-center gap-3.5 p-4 rounded-xl text-left transition-all duration-200 ${
              mainTab === "ROAMING_LOCATIONS"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/40 font-black"
                : "bg-card text-foreground hover:bg-card/80 border border-border shadow-xs font-semibold"
            }`}
          >
            <div className={`p-2.5 rounded-xl ${mainTab === "ROAMING_LOCATIONS" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black">2. Campus Roaming Locations</p>
              <p className={`text-xs mt-0.5 ${mainTab === "ROAMING_LOCATIONS" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                Canteen, Parking, Sports Ground & common roaming areas
              </p>
            </div>
          </button>
        </div>

        {/* TAB 1: ACADEMIC BUILDINGS & CLASSROOMS / LABS */}
        {mainTab === "BUILDINGS" && (
          <div className="space-y-6">
            {/* View Mode Breadcrumb Switcher */}
            <div className="flex items-center gap-2 bg-muted/40 p-2 sm:p-2.5 rounded-xl border text-xs font-semibold overflow-x-auto no-scrollbar scroll-smooth">
              <button
                onClick={() => setViewMode("BUILDINGS_LIST")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shrink-0 whitespace-nowrap ${
                  viewMode === "BUILDINGS_LIST"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Academic Buildings Overview ({customBuildings.length})</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

              <button
                onClick={() => setViewMode("BUILDING_DETAIL")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shrink-0 whitespace-nowrap ${
                  viewMode === "BUILDING_DETAIL"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <DoorOpen className="w-4 h-4" />
                <span>Rooms inside {selectedBuilding}</span>
              </button>
            </div>

            {/* LEVEL 1: ACADEMIC BUILDINGS OVERVIEW */}
            {viewMode === "BUILDINGS_LIST" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Academic Building Blocks Directory
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select an academic block to view classrooms, laboratories, and seating capacities.
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchRooms}
                    disabled={loading}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    Refresh Directory
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {buildingSummaries.map((b) => (
                    <div
                      key={b.name}
                      className="bg-card hover:bg-primary/5 border-2 hover:border-primary rounded-2xl p-6 transition-all group shadow-sm flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-base group-hover:scale-110 transition-transform">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <span className="bg-primary/10 text-primary text-xs font-black px-3 py-1 rounded-full border border-primary/20">
                            {b.totalRooms} Rooms
                          </span>
                        </div>

                        <h3 className="text-xl font-black mt-4 text-foreground">{b.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          Academic Teaching & Practical Laboratories Block
                        </p>

                        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t text-center">
                          <div className="bg-muted/50 p-2.5 rounded-xl border">
                            <div className="text-xs font-bold text-muted-foreground">Capacity</div>
                            <div className="text-sm font-black text-foreground mt-0.5">
                              {b.totalCapacity}
                            </div>
                          </div>

                          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-300/40">
                            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Labs</div>
                            <div className="text-sm font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
                              {b.labsCount}
                            </div>
                          </div>

                          <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-300/40">
                            <div className="text-xs font-bold text-blue-800 dark:text-blue-200">Classrooms</div>
                            <div className="text-sm font-black text-blue-900 dark:text-blue-100 mt-0.5">
                              {b.classroomsCount}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAddRoom(b.name)}
                          className="text-xs font-bold rounded-xl gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Room
                        </Button>

                        <Button
                          onClick={() => {
                            setSelectedBuilding(b.name);
                            setViewMode("BUILDING_DETAIL");
                          }}
                          className="text-xs font-bold rounded-xl gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <span>View Rooms & Details</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEVEL 2: ROOMS INSIDE SELECTED BUILDING */}
            {viewMode === "BUILDING_DETAIL" && (
              <div className="space-y-5">
                {/* Header Toolbar for Selected Academic Building */}
                <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("BUILDINGS_LIST")}
                        className="p-0 h-auto text-xs font-bold text-primary hover:underline gap-1 mb-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> All Academic Buildings
                      </Button>
                      <h2 className="text-2xl font-black tracking-tight text-foreground">
                        {selectedBuilding} — Rooms Directory
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Classrooms, laboratories, seating capacities, and equipment inside {selectedBuilding}.
                      </p>
                    </div>

                    <Button
                      onClick={() => handleOpenAddRoom(selectedBuilding)}
                      className="gap-2 font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 rounded-xl px-4 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Room to {selectedBuilding.split(" ")[0]}</span>
                    </Button>
                  </div>

                  {/* Building Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Building Rooms</div>
                        <div className="text-xl font-black text-foreground mt-0.5">
                          {selectedBuildingMetrics.totalRooms} Rooms
                        </div>
                      </div>
                      <DoorOpen className="w-8 h-8 text-primary opacity-60" />
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Total Seating Capacity</div>
                        <div className="text-xl font-black text-foreground mt-0.5">
                          {selectedBuildingMetrics.totalCapacity} Students
                        </div>
                      </div>
                      <Users className="w-8 h-8 text-primary opacity-60" />
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-300/30 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase">Practical Labs</div>
                        <div className="text-xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
                          {selectedBuildingMetrics.labsCount} Labs
                        </div>
                      </div>
                      <FlaskConical className="w-8 h-8 text-emerald-600 opacity-60" />
                    </div>

                    <div className="bg-blue-500/10 border border-blue-300/30 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-blue-800 dark:text-blue-200 uppercase">Lecture Classrooms</div>
                        <div className="text-xl font-black text-blue-900 dark:text-blue-100 mt-0.5">
                          {selectedBuildingMetrics.classroomsCount} Classrooms
                        </div>
                      </div>
                      <GraduationCap className="w-8 h-8 text-blue-600 opacity-60" />
                    </div>
                  </div>

                  {/* Filters for Rooms inside Building */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Academic Building Switcher</Label>
                      <Select
                        value={selectedBuilding}
                        onValueChange={(val) => setSelectedBuilding(val)}
                      >
                        <SelectTrigger className="h-10 text-xs font-bold mt-1 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {customBuildings.map((b) => (
                            <SelectItem key={b} value={b} className="text-xs font-semibold">
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Room Type</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="h-10 text-xs font-bold mt-1 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs font-semibold">
                              {t === "ALL" ? "All Room Types (Classrooms, Labs...)" : t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Search Room Code</Label>
                      <div className="relative mt-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="e.g. R-101, Projector..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-10 pl-9 text-xs font-medium bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rooms Grid Cards */}
                {filteredBuildingRooms.length === 0 ? (
                  <div className="bg-card border rounded-2xl p-12 text-center space-y-3">
                    <DoorOpen className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                    <h3 className="text-base font-bold">No Rooms Registered in {selectedBuilding}</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Click the button below to add classrooms, laboratories, or seminar halls to this building block.
                    </p>
                    <Button
                      onClick={() => handleOpenAddRoom(selectedBuilding)}
                      className="font-bold text-xs rounded-xl gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" /> + Add First Room to {selectedBuilding}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBuildingRooms.map((room) => (
                      <div
                        key={room.id}
                        className="bg-card border rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                {room.floor}
                              </span>
                              <h3 className="text-lg font-black mt-1 text-foreground">{room.roomCode}</h3>
                            </div>

                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                room.roomType === "Laboratory"
                                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-300/50"
                                  : room.roomType === "Seminar Hall"
                                  ? "bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-300/50"
                                  : "bg-blue-500/15 text-blue-800 dark:text-blue-200 border border-blue-300/50"
                              }`}
                            >
                              {room.roomType}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs mt-3 pt-3 border-t text-muted-foreground font-medium">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-primary" />
                              <span>
                                Capacity: <strong className="text-foreground">{room.capacity} Students</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-700 dark:text-emerald-300 font-bold">{room.status}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2">
                            {room.facilities.map((fac, fIdx) => (
                              <span
                                key={fIdx}
                                className="text-[10px] font-semibold bg-muted/60 text-foreground px-2 py-0.5 rounded-md border"
                              >
                                {fac}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditRoom(room)}
                            className="text-xs font-semibold rounded-xl gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setDeletingRoom(room);
                              setDeleteModalOpen(true);
                            }}
                            className="text-xs font-semibold rounded-xl gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMMON CAMPUS ROAMING LOCATIONS */}
        {mainTab === "ROAMING_LOCATIONS" && (
          <div className="space-y-5">
            <div className="bg-card border p-5 rounded-2xl shadow-xs">
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Master Campus Roaming & Common Observation Locations
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                These common locations appear directly in the Faculty & Security verification report dropdown when checking roaming students.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roamingLocations.map((loc) => {
                const IconComp = loc.icon || MapPin;
                return (
                  <div
                    key={loc.id}
                    className="bg-card border-2 hover:border-primary rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                          {loc.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-black mt-3 text-foreground">{loc.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{loc.desc}</p>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Active Faculty Dropdown Sync
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRoamingLocations(roamingLocations.filter((l) => l.id !== loc.id));
                          toast.success("Location Removed", { description: `${loc.name} removed.` });
                        }}
                        className="text-destructive text-xs h-7 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL 1: ADD NEW ACADEMIC BUILDING */}
        <Dialog open={addBuildingModalOpen} onOpenChange={setAddBuildingModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-[440px] rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Add Academic Building Block
              </DialogTitle>
              <DialogDescription>
                Register a new academic building block into the campus directory.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveBuilding} className="space-y-4 pt-1">
              <div>
                <Label className="text-xs font-bold">Academic Building Name *</Label>
                <Input
                  required
                  placeholder="e.g. H-Block (Hostel & Admin) or R-Block (Robotics)"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  className="h-10 text-xs mt-1 font-semibold"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setAddBuildingModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="font-bold">
                  Create Building Block
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: ADD NEW CAMPUS ROAMING LOCATION */}
        <Dialog open={addLocationModalOpen} onOpenChange={setAddLocationModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-[460px] rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Add Campus Roaming Location
              </DialogTitle>
              <DialogDescription>
                Add a common campus roaming area (e.g. Canteen, Parking, Sports Ground) for Faculty report drop-down selection.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveRoamingLocation} className="space-y-4 pt-1">
              <div>
                <Label className="text-xs font-bold">Location Name *</Label>
                <Input
                  required
                  placeholder="e.g. Juice Bar Corner or Auditorium Quadrangle"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="h-10 text-xs mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Location Category *</Label>
                <Input
                  required
                  placeholder="e.g. Food & Dining or Parking Zone or Outdoor Field"
                  value={newLocationCategory}
                  onChange={(e) => setNewLocationCategory(e.target.value)}
                  className="h-10 text-xs mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Description</Label>
                <Input
                  placeholder="Brief description of this campus roaming area"
                  value={newLocationDesc}
                  onChange={(e) => setNewLocationDesc(e.target.value)}
                  className="h-10 text-xs mt-1"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setAddLocationModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="font-bold">
                  Save Roaming Location
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: ADD / EDIT ROOM IN ACADEMIC BUILDING */}
        <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingRoom ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                {editingRoom ? "Edit Room Details" : "Add Room to Academic Building"}
              </DialogTitle>
              <DialogDescription>
                Configure room code, floor, type, and seating capacity for <span className="font-bold text-foreground">{formBuilding}</span>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveRoom} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Academic Building Block *</Label>
                  <Select value={formBuilding} onValueChange={(val) => setFormBuilding(val)}>
                    <SelectTrigger className="h-10 text-xs mt-1 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customBuildings.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs font-semibold">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-bold">Room Code / Number *</Label>
                  <Input
                    required
                    placeholder="e.g. R-101 or Lab-2"
                    value={formRoomCode}
                    onChange={(e) => setFormRoomCode(e.target.value)}
                    className="h-10 text-xs mt-1 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Floor Level *</Label>
                  <Input
                    required
                    placeholder="e.g. Ground Floor or 2nd Floor"
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    className="h-10 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold">Room Type *</Label>
                  <Select
                    value={formType}
                    onValueChange={(val) => setFormType(val as CampusRoom["roomType"])}
                  >
                    <SelectTrigger className="h-10 text-xs mt-1 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Classroom" className="text-xs font-semibold">
                        Classroom (Lecture Hall)
                      </SelectItem>
                      <SelectItem value="Laboratory" className="text-xs font-semibold">
                        Laboratory (Practical Lab)
                      </SelectItem>
                      <SelectItem value="Seminar Hall" className="text-xs font-semibold">
                        Seminar Hall
                      </SelectItem>
                      <SelectItem value="Auditorium" className="text-xs font-semibold">
                        Auditorium
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Seating Capacity (Students) *</Label>
                <Input
                  type="number"
                  required
                  min={10}
                  max={500}
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(parseInt(e.target.value, 10) || 60)}
                  className="h-10 text-xs mt-1 font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Equipment & Facilities (Comma Separated)</Label>
                <Input
                  placeholder="e.g. Projector, AC, Smartboard, LAN Ports"
                  value={formFacilities}
                  onChange={(e) => setFormFacilities(e.target.value)}
                  className="h-10 text-xs mt-1"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="font-bold">
                  {submitting ? "Saving Room..." : "Save Room"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL 4: CONFIRM DELETE ROOM */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-[420px] rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Remove Room from Building
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <span className="font-bold text-foreground">
                  "{deletingRoom?.roomCode}" ({deletingRoom?.buildingBlock})
                </span>{" "}
                from campus registry?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={submitting}
              >
                {submitting ? "Removing..." : "Remove Room"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

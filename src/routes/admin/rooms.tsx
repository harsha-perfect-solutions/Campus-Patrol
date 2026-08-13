import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  DoorOpen,
  Filter,
  Layers,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  Monitor,
  Wifi,
  Wind,
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

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({ meta: [{ title: "Rooms & Buildings — Admin Console" }] }),
  component: AdminRoomsPage,
});

export interface CampusRoom {
  id: string;
  roomCode: string;
  buildingBlock: string;
  floor: string;
  roomType: "Classroom" | "Laboratory" | "Seminar Hall" | "Auditorium";
  capacity: number;
  facilities: string[];
  status: "Active" | "Maintenance";
}

const BUILDINGS = [
  "ALL",
  "C-Block (CSE)",
  "E-Block (ECE)",
  "B-Block (EEE)",
  "A-Block (AIML)",
  "V-Block (CIVIL)",
  "M-Block (MECH)",
  "SH-Block (Seminar)",
] as const;

const ROOM_TYPES = ["ALL", "Classroom", "Laboratory", "Seminar Hall", "Auditorium"] as const;

const INITIAL_ROOMS_DATA: CampusRoom[] = [
  {
    id: "RM-101",
    roomCode: "Room C-204",
    buildingBlock: "C-Block (CSE)",
    floor: "2nd Floor",
    roomType: "Classroom",
    capacity: 60,
    facilities: ["Smartboard", "Projector", "AC", "High-speed LAN"],
    status: "Active",
  },
  {
    id: "RM-102",
    roomCode: "Room C-205",
    buildingBlock: "C-Block (CSE)",
    floor: "2nd Floor",
    roomType: "Classroom",
    capacity: 60,
    facilities: ["Projector", "AC"],
    status: "Active",
  },
  {
    id: "RM-103",
    roomCode: "Computer Lab 3",
    buildingBlock: "C-Block (CSE)",
    floor: "3rd Floor",
    roomType: "Laboratory",
    capacity: 45,
    facilities: ["High-Performance Workstations", "AC", "Smartboard", "Gigabit LAN"],
    status: "Active",
  },
  {
    id: "RM-104",
    roomCode: "Room E-102",
    buildingBlock: "E-Block (ECE)",
    floor: "1st Floor",
    roomType: "Classroom",
    capacity: 60,
    facilities: ["Projector", "AC"],
    status: "Active",
  },
  {
    id: "RM-105",
    roomCode: "Microcontroller Lab 2",
    buildingBlock: "E-Block (ECE)",
    floor: "1st Floor",
    roomType: "Laboratory",
    capacity: 40,
    facilities: ["Embedded Kits", "Oscilloscopes", "AC", "Projector"],
    status: "Active",
  },
  {
    id: "RM-106",
    roomCode: "Room B-101",
    buildingBlock: "B-Block (EEE)",
    floor: "1st Floor",
    roomType: "Classroom",
    capacity: 65,
    facilities: ["Projector", "AC"],
    status: "Active",
  },
  {
    id: "RM-107",
    roomCode: "AI Supercomputing Lab",
    buildingBlock: "A-Block (AIML)",
    floor: "3rd Floor",
    roomType: "Laboratory",
    capacity: 50,
    facilities: ["NVIDIA GPU Workstations", "Smartboard", "AC", "10Gbps Fiber Network"],
    status: "Active",
  },
  {
    id: "RM-108",
    roomCode: "Room A-301",
    buildingBlock: "A-Block (AIML)",
    floor: "3rd Floor",
    roomType: "Classroom",
    capacity: 60,
    facilities: ["Projector", "AC"],
    status: "Active",
  },
  {
    id: "RM-109",
    roomCode: "Room V-201",
    buildingBlock: "V-Block (CIVIL)",
    floor: "2nd Floor",
    roomType: "Classroom",
    capacity: 60,
    facilities: ["Projector", "AC"],
    status: "Active",
  },
  {
    id: "RM-110",
    roomCode: "Room M-104",
    buildingBlock: "M-Block (MECH)",
    floor: "1st Floor",
    roomType: "Classroom",
    capacity: 60,
    facilities: ["Projector", "AC"],
    status: "Active",
  },
  {
    id: "RM-111",
    roomCode: "Mechanical Workshop Lab",
    buildingBlock: "M-Block (MECH)",
    floor: "Ground Floor",
    roomType: "Laboratory",
    capacity: 50,
    facilities: ["CNC Lathes", "3D Printers", "Safety Gear"],
    status: "Active",
  },
  {
    id: "RM-112",
    roomCode: "Seminar Hall SH-1",
    buildingBlock: "SH-Block (Seminar)",
    floor: "Ground Floor",
    roomType: "Seminar Hall",
    capacity: 180,
    facilities: ["Dual Projectors", "Surround Sound Audio", "Podium System", "Central AC"],
    status: "Active",
  },
];

function AdminRoomsPage() {
  const [roomsList, setRoomsList] = useState<CampusRoom[]>(INITIAL_ROOMS_DATA);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<CampusRoom | null>(null);

  // Form Fields State
  const [formRoomCode, setFormRoomCode] = useState("");
  const [formBuilding, setFormBuilding] = useState<string>("C-Block (CSE)");
  const [formFloor, setFormFloor] = useState("2nd Floor");
  const [formType, setFormType] = useState<CampusRoom["roomType"]>("Classroom");
  const [formCapacity, setFormCapacity] = useState<number>(60);
  const [formFacilities, setFormFacilities] = useState("Projector, AC, Smartboard");

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<CampusRoom | null>(null);

  const handleResetFilters = () => {
    setSelectedBuilding("ALL");
    setSelectedType("ALL");
    setSearchQuery("");
  };

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    return roomsList.filter((r) => {
      if (selectedBuilding !== "ALL" && r.buildingBlock !== selectedBuilding) return false;
      if (selectedType !== "ALL" && r.roomType !== selectedType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = r.roomCode.toLowerCase().includes(q);
        const matchesBuilding = r.buildingBlock.toLowerCase().includes(q);
        const matchesFacility = r.facilities.some((f) => f.toLowerCase().includes(q));
        if (!matchesCode && !matchesBuilding && !matchesFacility) return false;
      }

      return true;
    });
  }, [roomsList, selectedBuilding, selectedType, searchQuery]);

  // Dynamic Metrics
  const metrics = useMemo(() => {
    const totalCap = filteredRooms.reduce((acc, r) => acc + r.capacity, 0);
    const labsCount = filteredRooms.filter((r) => r.roomType === "Laboratory").length;
    return {
      totalRooms: filteredRooms.length,
      totalCapacity: totalCap,
      labsCount,
    };
  }, [filteredRooms]);

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setFormRoomCode("");
    setFormBuilding("C-Block (CSE)");
    setFormFloor("2nd Floor");
    setFormType("Classroom");
    setFormCapacity(60);
    setFormFacilities("Projector, AC, Smartboard");
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (room: CampusRoom) => {
    setEditingRoom(room);
    setFormRoomCode(room.roomCode);
    setFormBuilding(room.buildingBlock);
    setFormFloor(room.floor);
    setFormType(room.roomType);
    setFormCapacity(room.capacity);
    setFormFacilities(room.facilities.join(", "));
    setFormModalOpen(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoomCode.trim() || !formBuilding.trim()) {
      toast.error("Please enter a valid Room Code and Building Block.");
      return;
    }

    const parsedFacilities = formFacilities
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    if (editingRoom) {
      const updated: CampusRoom = {
        ...editingRoom,
        roomCode: formRoomCode.trim(),
        buildingBlock: formBuilding,
        floor: formFloor.trim(),
        roomType: formType,
        capacity: formCapacity,
        facilities: parsedFacilities.length ? parsedFacilities : ["Projector", "AC"],
      };

      setRoomsList((prev) => prev.map((r) => (r.id === editingRoom.id ? updated : r)));
      toast.success(`Room Updated!`, {
        description: `${formRoomCode} in ${formBuilding} updated successfully.`,
      });
    } else {
      const newRoom: CampusRoom = {
        id: `RM-${Date.now()}`,
        roomCode: formRoomCode.trim(),
        buildingBlock: formBuilding,
        floor: formFloor.trim(),
        roomType: formType,
        capacity: formCapacity,
        facilities: parsedFacilities.length ? parsedFacilities : ["Projector", "AC"],
        status: "Active",
      };

      setRoomsList((prev) => [newRoom, ...prev]);
      toast.success(`New Room Added!`, {
        description: `${formRoomCode} registered under ${formBuilding}.`,
      });
    }

    setFormModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingRoom) return;
    setRoomsList((prev) => prev.filter((r) => r.id !== deletingRoom.id));
    toast.success(`Room Removed!`, {
      description: `${deletingRoom.roomCode} removed from campus registry.`,
    });
    setDeleteModalOpen(false);
    setDeletingRoom(null);
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Rooms & Campus Buildings"
            description="Inspect classroom inventory, laboratory spaces, seating capacities, and campus building allocations."
            breadcrumb={[
              { label: "Admin", to: "/admin/dashboard" },
              { label: "Rooms & Buildings" },
            ]}
          />
          <Button
            onClick={handleOpenAddModal}
            className="h-10 px-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs shrink-0 self-start sm:self-auto gap-2"
          >
            <Plus className="size-4" />
            <span>Add New Room / Building</span>
          </Button>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Filter Campus Facilities</h3>
            </div>
            {(selectedBuilding !== "ALL" || selectedType !== "ALL" || searchQuery.trim()) && (
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Building Block Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Building Block</Label>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-border">
                  <SelectValue placeholder="Select Building" />
                </SelectTrigger>
                <SelectContent>
                  {BUILDINGS.map((b) => (
                    <SelectItem key={b} value={b} className="text-xs">
                      {b === "ALL" ? "All Building Blocks" : b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Room Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-border">
                  <SelectValue placeholder="Select Room Type" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t === "ALL" ? "All Room Types (Classrooms, Labs...)" : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Search Room Code / Facilities
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search Room C-204, Projector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-surface p-4 rounded-xl border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Campus Rooms</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.totalRooms}</p>
            </div>
            <DoorOpen className="size-6 text-primary opacity-80" />
          </div>

          <div className="card-surface p-4 rounded-xl border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Seating Capacity</p>
              <p className="text-xl font-bold text-foreground mt-0.5">
                {metrics.totalCapacity.toLocaleString()} Students
              </p>
            </div>
            <Users className="size-6 text-blue-600 dark:text-blue-400 opacity-80" />
          </div>

          <div className="card-surface p-4 rounded-xl border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Practical Laboratories</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.labsCount}</p>
            </div>
            <Monitor className="size-6 text-emerald-600 dark:text-emerald-400 opacity-80" />
          </div>
        </div>

        {/* Room Inventory List */}
        <section className="card-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <span>Campus Rooms Directory</span>
            </h3>
            <ToneBadge tone="info">{filteredRooms.length} Facilities Listed</ToneBadge>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">
                No rooms match the selected building or type filters.
              </p>
              <p>Try switching Building Block or Room Type filters, or add a new room.</p>
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
                  <Plus className="size-3.5 mr-1" /> Add Room
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <DoorOpen className="size-4 text-primary shrink-0" />
                        <span>{room.roomCode}</span>
                      </h4>
                      <ToneBadge
                        tone={
                          room.roomType === "Laboratory"
                            ? "warning"
                            : room.roomType === "Seminar Hall"
                              ? "info"
                              : "neutral"
                        }
                      >
                        {room.roomType}
                      </ToneBadge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Location: <strong className="text-foreground">{room.buildingBlock}</strong>{" "}
                      &bull; {room.floor}
                    </p>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-foreground">
                        {room.capacity} Student Capacity
                      </span>
                      <span className="text-muted-foreground">&bull;</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 className="size-3" /> {room.status}
                      </span>
                    </div>

                    {/* Facilities Chips */}
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {room.facilities.map((fac) => (
                        <span
                          key={fac}
                          className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground"
                        >
                          {fac}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-divider flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(room)}
                      className="rounded-xl text-xs h-8 font-medium gap-1"
                    >
                      <Pencil className="size-3.5 text-primary" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingRoom(room);
                        setDeleteModalOpen(true);
                      }}
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

        {/* Add / Edit Room Modal */}
        <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                {editingRoom ? (
                  <Pencil className="size-4 text-primary" />
                ) : (
                  <Plus className="size-4 text-primary" />
                )}
                <span>{editingRoom ? "Edit Campus Room" : "Add New Campus Room"}</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveRoom} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Room Code / Number</Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Room C-204, Computer Lab 3"
                  value={formRoomCode}
                  onChange={(e) => setFormRoomCode(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Building Block</Label>
                  <Select value={formBuilding} onValueChange={setFormBuilding}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDINGS.filter((b) => b !== "ALL").map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Floor Number</Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. 2nd Floor"
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Room Type</Label>
                  <Select value={formType} onValueChange={(val) => setFormType(val as any)}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.filter((t) => t !== "ALL").map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Student Capacity</Label>
                  <Input
                    type="number"
                    min={10}
                    max={500}
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Facilities (comma-separated)</Label>
                <Input
                  type="text"
                  placeholder="e.g. Projector, AC, Smartboard, High-speed LAN"
                  value={formFacilities}
                  onChange={(e) => setFormFacilities(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
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
                  {editingRoom ? "Save Room Changes" : "Register Campus Room"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                <Trash2 className="size-5" /> Remove Campus Room?
              </DialogTitle>
            </DialogHeader>

            {deletingRoom && (
              <div className="space-y-3 pt-2 text-xs text-muted-foreground">
                <p>
                  Are you sure you want to remove <strong>{deletingRoom.roomCode}</strong> from the
                  campus registry?
                </p>
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1 font-mono text-[11px] text-foreground">
                  <p>
                    Location: {deletingRoom.buildingBlock} &bull; {deletingRoom.floor}
                  </p>
                  <p>
                    Type: {deletingRoom.roomType} | Capacity: {deletingRoom.capacity} Students
                  </p>
                </div>
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
                Remove Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

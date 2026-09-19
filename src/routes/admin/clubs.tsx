import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building,
  Plus,
  Search,
  UserPlus,
  RefreshCw,
  Users,
  ShieldCheck,
  UserCheck,
  Edit2,
  Power,
  X,
  UserMinus,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Ticket,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Activity,
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
  getAllClubsApi,
  createClubApi,
  updateClubApi,
  deactivateClubApi,
  activateClubApi,
  assignClubCoordinatorApi,
  removeClubCoordinatorApi,
  getClubMembersApi,
  getClubEventsApi,
  getEventParticipantsApi,
} from "@/lib/api/clubs.server";
import type {
  DBClub,
  DBClubCoordinator,
  DBClubMember,
  DBClubEvent,
  DBEventParticipantReportItem,
} from "@/lib/db/clubs.server";

export const Route = createFileRoute("/admin/clubs")({
  head: () => ({ meta: [{ title: "Club Management — Admin Console" }] }),
  component: AdminClubsPage,
});

type DetailedClub = DBClub & {
  member_count: number;
  event_count?: number;
  total_attendees?: number;
  coordinators: DBClubCoordinator[];
};

const CLUB_TYPES = [
  "NSS",
  "NCC",
  "ISTE",
  "CODING_CLUB",
  "SPORTS",
  "CULTURAL",
  "ROBOTICS",
  "LITERARY",
  "OTHER",
];

function AdminClubsPage() {
  const [clubs, setClubs] = useState<DetailedClub[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Club Modal State
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<DetailedClub | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("NSS");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Assign Coordinator Modal State
  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false);
  const [selectedClubForCoord, setSelectedClubForCoord] = useState<DetailedClub | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");

  // Members View Modal State
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedClubForMembers, setSelectedClubForMembers] = useState<DetailedClub | null>(null);
  const [clubMembersList, setClubMembersList] = useState<DBClubMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Events & Attendance Modal State
  const [eventsModalOpen, setEventsModalOpen] = useState(false);
  const [selectedClubForEvents, setSelectedClubForEvents] = useState<DetailedClub | null>(null);
  const [clubEventsList, setClubEventsList] = useState<DBClubEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");

  // Event Attendees Drilldown State
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<DBClubEvent | null>(null);
  const [eventAttendeesList, setEventAttendeesList] = useState<DBEventParticipantReportItem[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState("");

  const fetchFacultyList = async () => {
    try {
      const { getAdminFacultyListApi } = await import("@/lib/api/faculty.server");
      const res = await getAdminFacultyListApi();
      if (res.success && res.facultyList) {
        const unique = new Map<string, any>();
        for (const f of res.facultyList) {
          if (!f.email || f.email.toLowerCase().startsWith("admin")) continue;
          if (!unique.has(f.id) && !unique.has(f.email.toLowerCase())) {
            unique.set(f.id, {
              id: f.id,
              full_name: f.name || (f as any).full_name || "Faculty Member",
              email: f.email,
              staff_code: f.staffCode || (f as any).staff_code || "",
              department: f.department || "General",
            });
          }
        }
        setFacultyList(Array.from(unique.values()));
      }
    } catch (e) {
      console.warn("Failed to load faculty list:", e);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllClubsApi();
      setClubs(data);
      await fetchFacultyList();
    } catch (err: any) {
      toast.error(err.message || "Failed to load club data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Clubs
  const filteredClubs = useMemo(() => {
    return clubs.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.club_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ? true : c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clubs, searchQuery, statusFilter]);

  // Handlers for Add/Edit Club
  const handleOpenCreateModal = () => {
    setEditingClub(null);
    setFormName("");
    setFormType("NSS");
    setFormDescription("");
    setFormLocation("");
    setFormStatus("ACTIVE");
    setClubModalOpen(true);
  };

  const handleOpenEditModal = (club: DetailedClub) => {
    setEditingClub(club);
    setFormName(club.name);
    setFormType(club.club_type);
    setFormDescription(club.description || "");
    setFormLocation(club.location || "");
    setFormStatus(club.status);
    setClubModalOpen(true);
  };

  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Club Name is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingClub) {
        await updateClubApi({
          data: {
            clubId: editingClub.club_id,
            name: formName,
            club_type: formType,
            description: formDescription,
            location: formLocation,
            status: formStatus,
          },
        });
        toast.success(`Club "${formName}" updated successfully`);
      } else {
        await createClubApi({
          data: {
            name: formName,
            club_type: formType,
            description: formDescription,
            location: formLocation,
            status: formStatus,
          },
        });
        toast.success(`Club "${formName}" created successfully`);
      }
      setClubModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save club");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (club: DetailedClub) => {
    try {
      if (club.status === "ACTIVE") {
        await deactivateClubApi({ data: { clubId: club.club_id } });
        toast.success(`Club "${club.name}" deactivated`);
      } else {
        await activateClubApi({ data: { clubId: club.club_id } });
        toast.success(`Club "${club.name}" activated`);
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  // Handlers for Coordinator Assignment
  const handleOpenAssignModal = (club: DetailedClub) => {
    setSelectedClubForCoord(club);
    setSelectedFacultyId("");
    setCoordinatorModalOpen(true);
  };

  const handleAssignCoordinatorSubmit = async () => {
    if (!selectedClubForCoord || !selectedFacultyId) {
      toast.error("Please select a faculty member");
      return;
    }

    setSubmitting(true);
    try {
      await assignClubCoordinatorApi({
        data: { clubId: selectedClubForCoord.club_id, facultyId: selectedFacultyId },
      });
      toast.success("Faculty Coordinator assigned successfully");
      setCoordinatorModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign coordinator");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCoordinator = async (clubId: string, facultyId: string, facultyName: string) => {
    try {
      await removeClubCoordinatorApi({ data: { clubId, facultyId } });
      toast.success(`Removed ${facultyName} from coordinator list`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove coordinator");
    }
  };

  // Handlers for Viewing Members
  const handleOpenMembersModal = async (club: DetailedClub) => {
    setSelectedClubForMembers(club);
    setMembersModalOpen(true);
    setLoadingMembers(true);
    try {
      const members = await getClubMembersApi({ data: { clubId: club.club_id } });
      setClubMembersList(members);
    } catch (err: any) {
      toast.error(err.message || "Failed to load club members");
    } finally {
      setLoadingMembers(false);
    }
  };

  // Handlers for Viewing Events & Attendance
  const handleOpenEventsModal = async (club: DetailedClub) => {
    setSelectedClubForEvents(club);
    setSelectedEventForAttendees(null);
    setEventSearchQuery("");
    setEventsModalOpen(true);
    setLoadingEvents(true);
    try {
      const events = await getClubEventsApi({ data: { clubId: club.club_id } });
      setClubEventsList(events);
    } catch (err: any) {
      toast.error(err.message || "Failed to load club events");
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleOpenAttendees = async (event: DBClubEvent) => {
    setSelectedEventForAttendees(event);
    setAttendeeSearchQuery("");
    setLoadingAttendees(true);
    try {
      const attendees = await getEventParticipantsApi({ data: { eventId: event.event_id } });
      setEventAttendeesList(attendees);
    } catch (err: any) {
      toast.error(err.message || "Failed to load event attendees");
    } finally {
      setLoadingAttendees(false);
    }
  };

  const filteredEvents = useMemo(() => {
    if (!eventSearchQuery.trim()) return clubEventsList;
    const q = eventSearchQuery.toLowerCase();
    return clubEventsList.filter(
      (e) =>
        e.event_name.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.coordinator_name && e.coordinator_name.toLowerCase().includes(q)) ||
        e.event_type.toLowerCase().includes(q)
    );
  }, [clubEventsList, eventSearchQuery]);

  const filteredAttendees = useMemo(() => {
    if (!attendeeSearchQuery.trim()) return eventAttendeesList;
    const q = attendeeSearchQuery.toLowerCase();
    return eventAttendeesList.filter(
      (a) =>
        a.student_name.toLowerCase().includes(q) ||
        a.student_code.toLowerCase().includes(q) ||
        a.permission_code.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q)
    );
  }, [eventAttendeesList, attendeeSearchQuery]);

  const activeCount = useMemo(() => clubs.filter((c) => c.status === "ACTIVE").length, [clubs]);
  const totalEventsConducted = useMemo(() => clubs.reduce((acc, c) => acc + (c.event_count || 0), 0), [clubs]);
  const totalAttendeesCount = useMemo(() => clubs.reduce((acc, c) => acc + (c.total_attendees || 0), 0), [clubs]);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Club Management"
          description="Create and manage student clubs, assign faculty coordinators, and view members."
          actions={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="gap-2 font-bold flex-1 sm:flex-initial"
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button onClick={handleOpenCreateModal} size="sm" className="gap-2 font-bold shadow-xs flex-1 sm:flex-initial">
                <Plus className="size-4" />
                Add Club
              </Button>
            </div>
          }
        />

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Building className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Total Clubs</p>
                <p className="text-xl sm:text-2xl font-black text-foreground">{clubs.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Active Clubs</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
                <UserCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Coordinators</p>
                <p className="text-xl sm:text-2xl font-black text-foreground">
                  {clubs.reduce((acc, c) => acc + c.coordinators.length, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Events Conducted</p>
                <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                  {totalEventsConducted}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Event Attendees</p>
                <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                  {totalAttendeesCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search club by name, type or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background h-9 text-xs w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-36 bg-background h-9 text-xs">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active Only</SelectItem>
              <SelectItem value="INACTIVE">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Club Grid */}
        {filteredClubs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            <Building className="size-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-semibold">No clubs found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClubs.map((club) => (
              <div
                key={club.club_id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-primary/40 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider mb-1">
                        {club.club_type}
                      </span>
                      <h3 className="text-base font-bold text-foreground">{club.name}</h3>
                    </div>
                    <ToneBadge tone={club.status === "ACTIVE" ? "success" : "neutral"}>
                      {club.status}
                    </ToneBadge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {club.description || "No description provided."}
                  </p>

                  {/* Club Metrics Bar: Members, Events Conducted, Attendees */}
                  <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 rounded-xl bg-muted/40 border border-border text-center">
                    <div>
                      <p className="text-sm font-extrabold text-foreground tabular-nums">{club.member_count}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">Members</p>
                    </div>
                    <div className="border-x border-border/80">
                      <p className="text-sm font-extrabold text-primary tabular-nums">{club.event_count || 0}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">Events</p>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{club.total_attendees || 0}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">Attended</p>
                    </div>
                  </div>

                  {/* Coordinators Section */}
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Coordinators ({club.coordinators.length}):
                    </span>
                    {club.coordinators.length === 0 ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium italic">No coordinator assigned</p>
                    ) : (
                      <div className="space-y-1">
                        {club.coordinators.map((coord) => (
                          <div
                            key={coord.id}
                            className="flex items-center justify-between text-xs bg-muted/40 px-2.5 py-1 rounded-lg border border-border"
                          >
                            <span className="font-semibold text-foreground truncate">{coord.faculty_name} ({coord.department})</span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveCoordinator(club.club_id, coord.faculty_id, coord.faculty_name || "Faculty")}
                              className="size-5 p-0 text-destructive hover:bg-destructive/10"
                              title="Remove Coordinator"
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEventsModal(club)}
                      className="gap-1 font-bold h-7 text-xs text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <Calendar className="size-3.5" />
                      {club.event_count || 0} Events
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenMembersModal(club)}
                      className="gap-1 font-semibold h-7 text-xs"
                    >
                      <Users className="size-3.5" />
                      Members
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignModal(club)}
                      className="gap-1 font-semibold h-7 text-xs"
                    >
                      <UserPlus className="size-3.5" />
                      Assign
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenEditModal(club)}
                      className="size-7 text-muted-foreground hover:text-foreground"
                      title="Edit Club"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleToggleStatus(club)}
                      className={cn("size-7", club.status === "ACTIVE" ? "text-destructive hover:bg-destructive/10" : "text-emerald-600 hover:bg-emerald-500/10")}
                      title={club.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    >
                      <Power className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Club Modal */}
        <Dialog open={clubModalOpen} onOpenChange={setClubModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClub ? `Edit Club — ${editingClub.name}` : "Create New Student Club"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveClub} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Club Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. NSS (National Service Scheme)"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Club Category *</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLUB_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={formStatus} onValueChange={(v: any) => setFormStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Campus Venue / Room</Label>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Block B - Room 102"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Club objectives and description..."
                  className="h-20"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setClubModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="font-bold">
                  {submitting ? "Saving..." : editingClub ? "Update Club" : "Create Club"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assign Coordinator Modal */}
        <Dialog open={coordinatorModalOpen} onOpenChange={setCoordinatorModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Assign Faculty Coordinator</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground font-medium">
                Assign a Faculty member to coordinate <strong className="text-foreground">{selectedClubForCoord?.name}</strong>.
              </p>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Select Faculty Member *</Label>
                <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="-- Select Faculty Member --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 rounded-xl">
                    {facultyList.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No active faculty members available
                      </div>
                    ) : (
                      facultyList.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="cursor-pointer py-2 text-xs">
                          <span className="font-semibold text-foreground">{f.full_name}</span>{" "}
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ({f.department}) &bull; {f.email}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCoordinatorModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignCoordinatorSubmit} disabled={submitting || !selectedFacultyId} className="font-bold">
                  {submitting ? "Assigning..." : "Assign Coordinator"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Roster Modal */}
        <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-xl rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Club Members — {selectedClubForMembers?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {loadingMembers ? (
                <div className="py-8 text-center text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mx-auto mb-1 text-primary" />
                  Loading members...
                </div>
              ) : clubMembersList.length === 0 ? (
                <p className="text-center py-6 text-xs text-muted-foreground font-medium">
                  No members found in this club.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {/* Mobile Roster List (< 640px) */}
                  <div className="block sm:hidden space-y-2">
                    {clubMembersList.map((m) => (
                      <div key={m.id} className="p-3 rounded-xl border border-border bg-card space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-primary">{m.student_id}</span>
                          <span className="text-[11px] font-semibold text-muted-foreground">{m.department}</span>
                        </div>
                        <h4 className="font-bold text-foreground">{m.student_name}</h4>
                        <p className="text-[11px] text-muted-foreground">{m.year} &bull; Section {m.section}</p>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Roster Table (>= 640px) */}
                  <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Roll Number</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Department</th>
                          <th className="px-3 py-2">Year & Section</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {clubMembersList.map((m) => (
                          <tr key={m.id} className="hover:bg-muted/40">
                            <td className="px-3 py-2 font-mono font-bold text-primary">{m.student_id}</td>
                            <td className="px-3 py-2 font-medium text-foreground">{m.student_name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{m.department}</td>
                            <td className="px-3 py-2 text-muted-foreground">{m.year} &bull; {m.section}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════
            MODAL: CLUB EVENTS & ATTENDANCE DRILL-DOWN
            ══════════════════════════════════════════════════ */}
        <Dialog open={eventsModalOpen} onOpenChange={setEventsModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            {selectedEventForAttendees ? (
              /* ── SUB-VIEW: EVENT ATTENDEES LIST ── */
              <div className="space-y-4">
                <DialogHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEventForAttendees(null)}
                      className="gap-1 h-8 text-xs font-semibold px-2 cursor-pointer"
                    >
                      <ArrowLeft className="size-4" /> Back to Events
                    </Button>
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-bold">
                      {selectedEventForAttendees.event_name}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                      <span>📅 {selectedEventForAttendees.event_date}</span>
                      <span>⏰ {selectedEventForAttendees.start_time} - {selectedEventForAttendees.end_time}</span>
                      <span>📍 {selectedEventForAttendees.location}</span>
                    </p>
                  </div>
                </DialogHeader>

                {/* Summary bar */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span className="font-bold text-foreground">
                      {eventAttendeesList.length} Attending Students
                    </span>
                  </div>
                  <ToneBadge tone={selectedEventForAttendees.status === "COMPLETED" ? "neutral" : "success"}>
                    {selectedEventForAttendees.status}
                  </ToneBadge>
                </div>

                {/* Search attendee */}
                <div className="relative">
                  <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search attendee by name, roll no, department..."
                    value={attendeeSearchQuery}
                    onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                    className="pl-8 bg-background h-8 text-xs"
                  />
                </div>

                {loadingAttendees ? (
                  <div className="py-10 text-center text-muted-foreground space-y-2">
                    <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs">Loading attending students...</p>
                  </div>
                ) : filteredAttendees.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <Users className="size-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs font-medium">
                      {attendeeSearchQuery ? "No students match your search." : "No students attended or registered for this event yet."}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {/* Mobile list */}
                    <div className="block sm:hidden space-y-2">
                      {filteredAttendees.map((a) => (
                        <div key={a.id} className="p-3 rounded-xl border border-border bg-card space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-primary">{a.student_code}</span>
                            <ToneBadge tone="success">{a.permission_status}</ToneBadge>
                          </div>
                          <h4 className="font-bold text-foreground">{a.student_name}</h4>
                          <p className="text-[11px] text-muted-foreground">{a.department} &bull; {a.year} &bull; {a.section}</p>
                          <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span>Code: {a.permission_code}</span>
                            {(a.exit_at || a.entry_at) && (
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                {a.exit_at ? `Out: ${a.exit_at.slice(11, 16)}` : ""} {a.entry_at ? `In: ${a.entry_at.slice(11, 16)}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border sticky top-0">
                          <tr>
                            <th className="px-3 py-2.5">Roll Number</th>
                            <th className="px-3 py-2.5">Student Name</th>
                            <th className="px-3 py-2.5">Dept & Class</th>
                            <th className="px-3 py-2.5">Permission Code</th>
                            <th className="px-3 py-2.5">Attendance State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredAttendees.map((a) => (
                            <tr key={a.id} className="hover:bg-muted/40">
                              <td className="px-3 py-2 font-mono font-bold text-primary">{a.student_code}</td>
                              <td className="px-3 py-2 font-medium text-foreground">{a.student_name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{a.department} &bull; {a.year}</td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{a.permission_code}</td>
                              <td className="px-3 py-2">
                                <div className="space-y-0.5">
                                  <ToneBadge tone="success">{a.permission_status}</ToneBadge>
                                  {(a.exit_at || a.entry_at) && (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold">
                                      {a.exit_at ? `Exit: ${a.exit_at.slice(11, 16)}` : ""} {a.entry_at ? `Entry: ${a.entry_at.slice(11, 16)}` : ""}
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── MAIN VIEW: EVENTS LIST ── */
              <div className="space-y-4">
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <DialogTitle className="text-base sm:text-lg font-bold">
                        Events Conducted — {selectedClubForEvents?.name}
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Category: <strong className="text-foreground">{selectedClubForEvents?.club_type}</strong> &bull; Venue: {selectedClubForEvents?.location || "Campus"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shrink-0">
                      <Calendar className="size-3.5" /> {clubEventsList.length} Events
                    </span>
                  </div>
                </DialogHeader>

                {/* Search Event bar */}
                <div className="relative">
                  <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search events by name, location, coordinator, type..."
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    className="pl-8 bg-background h-8 text-xs"
                  />
                </div>

                {/* Event list */}
                {loadingEvents ? (
                  <div className="py-10 text-center text-muted-foreground space-y-2">
                    <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs">Loading club events...</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <Calendar className="size-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs font-medium">
                      {eventSearchQuery
                        ? "No events match your search."
                        : "No events conducted or scheduled yet for this club."}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                    {filteredEvents.map((evt) => (
                      <div
                        key={evt.event_id}
                        className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-all"
                      >
                        {/* Event title & Status */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border uppercase tracking-wider">
                                {evt.event_type}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {evt.location_type === "INSIDE_CAMPUS" ? "Inside Campus" : "Outside Campus"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground">{evt.event_name}</h4>
                            {evt.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{evt.description}</p>
                            )}
                          </div>
                          <ToneBadge tone={evt.status === "COMPLETED" ? "neutral" : evt.status === "CANCELLED" ? "danger" : "success"}>
                            {evt.status}
                          </ToneBadge>
                        </div>

                        {/* Event Details Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border">
                          <div className="space-y-1">
                            <p className="text-foreground font-medium flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                              <span>{evt.event_date}</span>
                              <span className="text-muted-foreground">({evt.start_time} - {evt.end_time})</span>
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{evt.location}</span>
                            </p>
                          </div>

                          <div className="space-y-1 sm:text-right">
                            <p className="text-xs font-semibold text-foreground truncate">
                              Coordinator: {evt.coordinator_name || "Faculty Coordinator"}
                            </p>
                            <div className="flex sm:justify-end items-center gap-2 text-[11px]">
                              <span className="inline-flex items-center gap-1 font-bold text-primary">
                                <Ticket className="size-3" /> {evt.participant_count || 0} Registered
                              </span>
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3" /> {evt.attended_count || 0} Attended
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action to View Attending Students */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {evt.participant_count || 0} total students attended/registered
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleOpenAttendees(evt)}
                            className="h-8 rounded-xl text-xs font-bold gap-1 shadow-xs"
                          >
                            <Users className="size-3.5" />
                            View Attending Students ({evt.participant_count || 0}) &rarr;
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

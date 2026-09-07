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
} from "@/lib/api/clubs.server";
import type { DBClub, DBClubCoordinator, DBClubMember } from "@/lib/db/clubs.server";

export const Route = createFileRoute("/admin/clubs")({
  head: () => ({ meta: [{ title: "Club Management — Admin Console" }] }),
  component: AdminClubsPage,
});

type DetailedClub = DBClub & {
  member_count: number;
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

  const fetchFacultyList = async () => {
    try {
      const { getAdminFacultyListApi } = await import("@/lib/api/faculty.server");
      const res = await getAdminFacultyListApi();
      if (res.success && res.facultyList) {
        setFacultyList(res.facultyList.map((f: any) => ({
          id: f.id,
          full_name: f.full_name || f.name || "Faculty",
          email: f.email,
          staff_code: f.staff_code || "",
          department: f.department || "",
        })));
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

  const activeCount = useMemo(() => clubs.filter((c) => c.status === "ACTIVE").length, [clubs]);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Club Management"
          description="Create and manage student clubs, assign faculty coordinators, and oversee member rosters."
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
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
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
                <p className="text-xs font-semibold text-muted-foreground">Faculty Coordinators</p>
                <p className="text-xl sm:text-2xl font-black text-foreground">
                  {clubs.reduce((acc, c) => acc + c.coordinators.length, 0)}
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

                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenMembersModal(club)}
                      className="gap-1 font-semibold h-7 text-xs"
                    >
                      <Users className="size-3.5" />
                      {club.member_count} Members
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignModal(club)}
                      className="gap-1 text-primary border-primary/30 font-semibold h-7 text-xs"
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
                <Label>Select Faculty Member *</Label>
                <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select Faculty Member --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {facultyList.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.full_name} ({f.department}) &bull; {f.email}
                      </SelectItem>
                    ))}
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
              <DialogTitle>Roster Members — {selectedClubForMembers?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {loadingMembers ? (
                <div className="py-8 text-center text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mx-auto mb-1 text-primary" />
                  Loading members...
                </div>
              ) : clubMembersList.length === 0 ? (
                <p className="text-center py-6 text-xs text-muted-foreground font-medium">
                  No registered members found in this club roster.
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
      </div>
    </RoleGuard>
  );
}

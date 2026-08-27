import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Building,
  Plus,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  UserPlus,
  UserMinus,
  FileCheck,
  Send,
  XCircle,
  Ticket,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  Download,
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
import { useAuth } from "@/lib/auth";
import {
  getMyCoordinatedClubsApi,
  getClubMembersApi,
  addClubMemberApi,
  removeClubMemberApi,
  createClubEventApi,
  getClubEventsApi,
  cancelClubEventApi,
  validateEventParticipantsPreflightApi,
  grantEventPermissionsAtomicApi,
  getEventParticipantsApi,
} from "@/lib/api/clubs.server";
import type {
  DBClub,
  DBClubMember,
  DBClubEvent,
  ParticipantPreflightReport,
  DBEventParticipantReportItem,
  LocationType,
  EventType,
} from "@/lib/db/clubs.server";

export const Route = createFileRoute("/faculty/clubs")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search["tab"] as "members" | "events" | "permissions") || "members",
    };
  },
  head: () => ({ meta: [{ title: "My Coordinated Clubs & Events — Faculty Portal" }] }),
  component: FacultyClubsPage,
});

const EVENT_TYPES: EventType[] = [
  "WORKSHOP",
  "COMPETITION",
  "CAMP",
  "MEETING",
  "SPORTS_EVENT",
  "CULTURAL_EVENT",
  "OTHER",
];

function FacultyClubsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [myClubs, setMyClubs] = useState<DBClub[]>([]);
  const [selectedClub, setSelectedClub] = useState<DBClub | null>(null);
  const [members, setMembers] = useState<DBClubMember[]>([]);
  const [events, setEvents] = useState<DBClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Active Sub-Section Tab: "members" | "events" | "permissions"
  const [activeTab, setActiveTab] = useState<"members" | "events" | "permissions">(search.tab || "members");

  useEffect(() => {
    if (search.tab && search.tab !== activeTab) {
      setActiveTab(search.tab);
    }
  }, [search.tab]);

  const handleTabChange = (tab: "members" | "events" | "permissions") => {
    setActiveTab(tab);
    navigate({ search: (old: any) => ({ ...old, tab }), replace: true });
  };

  // Member Filter & Search
  const [memberSearch, setMemberSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");

  // Inline Add Member Form State
  const [newMemberRoll, setNewMemberRoll] = useState("");
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);

  // Create Event Form State
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [locationType, setLocationType] = useState<LocationType>("INSIDE_CAMPUS");
  const [location, setLocation] = useState("College Auditorium");
  const [eventType, setEventType] = useState<EventType>("WORKSHOP");

  // Issue Permission Sub-Section State
  const [targetEventId, setTargetEventId] = useState<string>("");
  const [selectedRollNumbers, setSelectedRollNumbers] = useState<Set<string>>(new Set());
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("ALL");
  const [permissionStudentSearch, setPermissionStudentSearch] = useState("");
  const [customRollInput, setCustomRollInput] = useState("");
  const [preflightReport, setPreflightReport] = useState<ParticipantPreflightReport | null>(null);
  const [validatingPreflight, setValidatingPreflight] = useState(false);

  // Granted Event Participants Report State
  const [grantedParticipants, setGrantedParticipants] = useState<DBEventParticipantReportItem[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const loadEventParticipants = useCallback(async (eventId: string) => {
    setLoadingParticipants(true);
    try {
      const res = await getEventParticipantsApi({ data: { eventId } });
      setGrantedParticipants(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load event permissions history");
    } finally {
      setLoadingParticipants(false);
    }
  }, []);

  const handleExportToCSV = () => {
    if (!activeTargetEvent || grantedParticipants.length === 0) {
      toast.error("No granted permission records available to export.");
      return;
    }

    const headers = [
      "Pass Code",
      "Roll Number",
      "Student Name",
      "Department",
      "Year & Section",
      "Status",
      "Issued Timestamp",
      "Gate Verification",
    ];

    const rows = grantedParticipants.map((p) => [
      p.permission_code,
      p.student_code,
      `"${p.student_name.replace(/"/g, '""')}"`,
      p.department,
      `"${p.year} ${p.section}"`,
      p.permission_status,
      p.created_at ? new Date(p.created_at).toLocaleString() : "N/A",
      p.exit_at ? `Exited: ${new Date(p.exit_at).toLocaleTimeString()}` : "Not Verified at Gate",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${activeTargetEvent.event_name.replace(/\s+/g, "_")}_Granted_Passes.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${grantedParticipants.length} student pass records to Excel CSV!`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const { profile } = useAuth();

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const clubs = await getMyCoordinatedClubsApi();
      setMyClubs(clubs);
      if (clubs.length > 0 && !selectedClub && clubs[0]) {
        setSelectedClub(clubs[0]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load faculty clubs");
    } finally {
      setLoading(false);
    }
  }, [selectedClub]);

  useEffect(() => {
    initData();
  }, [initData]);

  const loadClubDetails = useCallback(async (club: DBClub) => {
    setLoading(true);
    try {
      const [membersData, eventsData] = await Promise.all([
        getClubMembersApi({ data: { clubId: club.club_id } }),
        getClubEventsApi({ data: { clubId: club.club_id } }),
      ]);
      setMembers(membersData);
      setEvents(eventsData);

      // Auto select first scheduled event for permissions tab if available
      const scheduled = eventsData.filter((e) => e.status === "SCHEDULED");
      if (scheduled.length > 0 && scheduled[0] && (!targetEventId || !eventsData.some((e) => e.event_id === targetEventId))) {
        setTargetEventId(scheduled[0].event_id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load club details");
    } finally {
      setLoading(false);
    }
  }, [targetEventId]);

  useEffect(() => {
    if (selectedClub) {
      loadClubDetails(selectedClub);
    }
  }, [selectedClub, loadClubDetails]);

  // Selected target event for issue permissions
  const activeTargetEvent = useMemo(() => {
    return events.find((e) => e.event_id === targetEventId) || null;
  }, [events, targetEventId]);

  useEffect(() => {
    if (activeTargetEvent) {
      loadEventParticipants(activeTargetEvent.event_id);
    } else {
      setGrantedParticipants([]);
    }
  }, [activeTargetEvent, loadEventParticipants]);

  // Year breakdown stats
  const yearStats = useMemo(() => {
    const counts: Record<string, number> = { "1st Year": 0, "2nd Year": 0, "3rd Year": 0, "4th Year": 0 };
    members.forEach((m) => {
      const y = m.year || "Other";
      counts[y] = (counts[y] || 0) + 1;
    });
    return counts;
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        (m.student_name && m.student_name.toLowerCase().includes(memberSearch.toLowerCase())) ||
        m.student_id.toLowerCase().includes(memberSearch.toLowerCase());

      const matchesYear = yearFilter === "ALL" ? true : m.year === yearFilter;
      const matchesSec = sectionFilter === "ALL" ? true : m.section === sectionFilter;

      return matchesSearch && matchesYear && matchesSec;
    });
  }, [members, memberSearch, yearFilter, sectionFilter]);

  // Handlers for Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub || !newMemberRoll.trim()) return;

    setSubmitting(true);
    try {
      await addClubMemberApi({ data: { clubId: selectedClub.club_id, studentCode: newMemberRoll.trim() } });
      toast.success(`Student ${newMemberRoll.toUpperCase()} added to ${selectedClub.name}`);
      setNewMemberRoll("");
      setShowAddMemberForm(false);
      await loadClubDetails(selectedClub);
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (studentCode: string, studentName?: string) => {
    if (!selectedClub) return;
    try {
      await removeClubMemberApi({ data: { clubId: selectedClub.club_id, studentCode } });
      toast.success(`Removed ${studentName || studentCode} from club`);
      await loadClubDetails(selectedClub);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  // Handlers for Event Creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClub = selectedClub;
    if (!targetClub) return;

    setSubmitting(true);
    try {
      const newEv = await createClubEventApi({
        data: {
          club_id: targetClub.club_id,
          event_name: eventName.trim() || "Club Event",
          description: eventDesc.trim() || null,
          event_date: eventDate || (new Date().toISOString().split("T")[0] as string),
          start_time: startTime || "10:00:00",
          end_time: endTime || "13:00:00",
          location_type: locationType || "INSIDE_CAMPUS",
          location: location.trim() || "College Auditorium",
          event_type: eventType || "WORKSHOP",
        },
      });
      toast.success(`Event "${eventName}" created successfully!`);
      setCreateEventModalOpen(false);
      setEventName("");
      setEventDesc("");
      await loadClubDetails(targetClub);
      if (newEv && newEv.event_id) {
        setTargetEventId(newEv.event_id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Issue Permission Sub-Section
  const handleSelectAllMembers = () => {
    setSelectedYearFilter("ALL");
    const allCodes = new Set(members.map((m) => m.student_id));
    setSelectedRollNumbers(allCodes);
  };

  const handleSelectByYear = (year: string) => {
    setSelectedYearFilter(year);
    if (year === "ALL") {
      const allCodes = new Set(members.map((m) => m.student_id));
      setSelectedRollNumbers(allCodes);
    } else {
      const yearCodes = members.filter((m) => m.year === year).map((m) => m.student_id);
      setSelectedRollNumbers(new Set(yearCodes));
    }
  };

  const handleClearSelection = () => {
    setSelectedYearFilter("ALL");
    setSelectedRollNumbers(new Set());
  };

  const displayedChecklistMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesYear = selectedYearFilter === "ALL" ? true : m.year === selectedYearFilter;
      const query = permissionStudentSearch.trim().toLowerCase();
      const matchesSearch =
        query === ""
          ? true
          : m.student_id.toLowerCase().includes(query) ||
            (m.student_name && m.student_name.toLowerCase().includes(query));
      return matchesYear && matchesSearch;
    });
  }, [members, selectedYearFilter, permissionStudentSearch]);

  const handleToggleStudentSelection = (code: string) => {
    setSelectedRollNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const parsedCustomRolls = useMemo(() => {
    return customRollInput
      .split(/[\n,;\s]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  }, [customRollInput]);

  const totalSelectedCount = useMemo(() => {
    const combined = new Set([...selectedRollNumbers, ...parsedCustomRolls]);
    return combined.size;
  }, [selectedRollNumbers, parsedCustomRolls]);

  const handleExecuteGrantPermission = async () => {
    if (!activeTargetEvent) {
      toast.error("Please select an active event first.");
      return;
    }

    const combined = Array.from(new Set([...selectedRollNumbers, ...parsedCustomRolls]));

    if (combined.length === 0) {
      toast.error("Please select at least one student participant.");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Automatic Pre-flight validation
      const report = await validateEventParticipantsPreflightApi({
        data: { eventId: activeTargetEvent.event_id, studentCodes: combined },
      });
      setPreflightReport(report);

      if (report.invalid.length > 0) {
        toast.error(`Invalid student roll numbers detected: ${report.invalid.join(", ")}. Please resolve invalid records first.`);
        return;
      }

      const validCodes = report.valid.map((v) => v.student_code);

      // Step 2: Grant permissions atomically
      const res = await grantEventPermissionsAtomicApi({
        data: { eventId: activeTargetEvent.event_id, studentCodes: validCodes },
      });

      toast.success(
        `Permissions Granted! ${res.grantedCount} student(s) automatically received digital event pass (EP-xxxx).`
      );
      setPreflightReport(null);
      setSelectedRollNumbers(new Set());
      setCustomRollInput("");
      if (selectedClub) {
        await loadClubDetails(selectedClub);
      }
      await loadEventParticipants(activeTargetEvent.event_id);
    } catch (err: any) {
      toast.error(err.message || "Failed to grant event permissions");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEvent = async (ev: DBClubEvent) => {
    if (!confirm(`Are you sure you want to cancel "${ev.event_name}"? All participant permissions will be revoked.`)) return;

    try {
      await cancelClubEventApi({ data: { eventId: ev.event_id, reason: "Cancelled by Coordinator" } });
      toast.success(`Event "${ev.event_name}" cancelled.`);
      if (selectedClub) {
        await loadClubDetails(selectedClub);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel event");
    }
  };

  return (
    <RoleGuard allowedRoles={["faculty"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Coordinated Clubs & Workspace"
          description="Manage assigned student clubs, roster members, schedule official events, and issue bulk digital event permissions."
        />

        {/* Club Selector Tabs */}
        {loading && myClubs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm">Loading your assigned clubs...</p>
          </div>
        ) : myClubs.length === 0 ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-8 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-bold">No Club Assignments Found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              You are currently not assigned as a Coordinator for any club. Please contact the Admin Console to be assigned.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Club Selection Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
              {myClubs.map((club) => {
                const isSelected = selectedClub?.club_id === club.club_id;
                return (
                  <button
                    key={club.club_id}
                    onClick={() => setSelectedClub(club)}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Building className="size-4" />
                    <span>{club.name}</span>
                    <span className={cn(
                      "ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                      isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {club.club_type}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedClub && (
              <div className="space-y-6">
                {/* Active Club Overview Header */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-extrabold text-foreground">{selectedClub.name}</h2>
                        <ToneBadge tone="info">{selectedClub.club_type}</ToneBadge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        {selectedClub.description || "Official Student Organization"} &bull; {selectedClub.location || "Campus Venue"}
                      </p>
                    </div>

                    {/* Quick Section Shortcuts */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => { setActiveTab("members"); setShowAddMemberForm(true); }}
                        variant="outline"
                        size="sm"
                        className="gap-2 font-bold"
                      >
                        <UserPlus className="size-4" />
                        Add Member
                      </Button>
                      <Button
                        onClick={() => setCreateEventModalOpen(true)}
                        size="sm"
                        className="gap-2 font-bold shadow-xs"
                      >
                        <Plus className="size-4" />
                        Create Event
                      </Button>
                    </div>
                  </div>

                  {/* Roster & Event Quick Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-border">
                    <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-center">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Total Roster</span>
                      <span className="text-xl font-black text-primary">{members.length}</span>
                    </div>
                    {Object.entries(yearStats).map(([yr, cnt]) => (
                      <div key={yr} className="bg-muted/40 border border-border rounded-xl p-3 text-center">
                        <span className="text-[11px] font-semibold text-muted-foreground block">{yr}</span>
                        <span className="text-lg font-bold text-foreground">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* SUB-SECTION 1: ROSTER & ADD MEMBERS                        */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTab === "members" && (
                  <div className="space-y-4">
                    {/* Inline Add Member Panel toggle */}
                    {showAddMemberForm ? (
                      <form onSubmit={handleAddMember} className="bg-card p-4 rounded-2xl border border-primary/30 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <UserPlus className="size-4 text-primary" /> Add New Student to {selectedClub.name}
                          </h4>
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowAddMemberForm(false)}>
                            &times;
                          </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="space-y-1.5 flex-1">
                            <Label className="text-xs">Student Roll Number / Code *</Label>
                            <Input
                              value={newMemberRoll}
                              onChange={(e) => setNewMemberRoll(e.target.value)}
                              placeholder="e.g. 23CSE1012"
                              className="font-mono uppercase h-9"
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" disabled={submitting} size="sm" className="font-bold">
                              {submitting ? "Adding..." : "Add to Roster"}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddMemberForm(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-end">
                        <Button onClick={() => setShowAddMemberForm(true)} size="sm" variant="outline" className="gap-2 font-bold">
                          <UserPlus className="size-4" /> + Add Member to Roster
                        </Button>
                      </div>
                    )}

                    {/* Member Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-2xl border border-border shadow-2xs">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search member by roll number or name..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="pl-9 bg-background h-9 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                          <SelectTrigger className="w-32 bg-background h-9 text-xs">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Years</SelectItem>
                            <SelectItem value="1st Year">1st Year</SelectItem>
                            <SelectItem value="2nd Year">2nd Year</SelectItem>
                            <SelectItem value="3rd Year">3rd Year</SelectItem>
                            <SelectItem value="4th Year">4th Year</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={sectionFilter} onValueChange={setSectionFilter}>
                          <SelectTrigger className="w-28 bg-background h-9 text-xs">
                            <SelectValue placeholder="Section" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Secs</SelectItem>
                            <SelectItem value="A">Sec A</SelectItem>
                            <SelectItem value="B">Sec B</SelectItem>
                            <SelectItem value="C">Sec C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Roster Table */}
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                          <tr>
                            <th className="px-4 py-3">Roll Number</th>
                            <th className="px-4 py-3">Student Name</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Year & Section</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredMembers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                No club members match the selected criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredMembers.map((m) => (
                              <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3.5 font-mono font-bold text-primary">{m.student_id}</td>
                                <td className="px-4 py-3.5 font-semibold text-foreground">{m.student_name}</td>
                                <td className="px-4 py-3.5 text-muted-foreground font-medium">{m.department}</td>
                                <td className="px-4 py-3.5 text-muted-foreground font-medium">{m.year} &bull; {m.section}</td>
                                <td className="px-4 py-3.5 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleRemoveMember(m.student_id, m.student_name)}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    title="Remove Member"
                                  >
                                    <UserMinus className="size-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* SUB-SECTION 2: CLUB EVENTS                                */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTab === "events" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground">Scheduled & Past Events</h3>
                      <Button onClick={() => setCreateEventModalOpen(true)} size="sm" className="gap-2 font-bold shadow-xs">
                        <Plus className="size-4" /> Create New Event
                      </Button>
                    </div>

                    {events.length === 0 ? (
                      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
                        <Calendar className="size-10 mx-auto text-primary/60" />
                        <div>
                          <h3 className="text-base font-bold text-foreground">No Events Created Yet</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Create an official club event to grant bulk digital event permissions (`EP-xxxx`) to members.
                          </p>
                        </div>
                        <Button onClick={() => setCreateEventModalOpen(true)} size="sm" className="font-bold">
                          <Plus className="size-4 mr-2" /> Create First Event
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {events.map((ev) => (
                          <div
                            key={ev.event_id}
                            className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs hover:border-primary/40 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider mb-1.5">
                                  {ev.event_type}
                                </span>
                                <h3 className="text-base font-bold text-foreground">{ev.event_name}</h3>
                                {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                              </div>
                              <ToneBadge tone={ev.status === "SCHEDULED" ? "success" : "neutral"}>
                                {ev.status}
                              </ToneBadge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
                              <div className="flex items-center gap-2">
                                <Calendar className="size-3.5 text-primary" />
                                <span>Date: <strong className="text-foreground">{ev.event_date}</strong></span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="size-3.5 text-primary" />
                                <span><strong className="text-foreground">{ev.start_time} - {ev.end_time}</strong></span>
                              </div>

                              <div className="flex items-center gap-2 col-span-2">
                                <MapPin className="size-3.5 text-primary" />
                                <span>Venue: <strong className="text-foreground">{ev.location}</strong> ({ev.location_type})</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border">
                              {ev.status === "SCHEDULED" ? (
                                <>
                                  <Button
                                    onClick={() => {
                                      setTargetEventId(ev.event_id);
                                      handleTabChange("permissions");
                                    }}
                                    size="sm"
                                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                                  >
                                    <Send className="size-4" />
                                    Issue Permissions
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelEvent(ev)}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-semibold"
                                  >
                                    Cancel Event
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Event is {ev.status.toLowerCase()}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* SUB-SECTION 3: ISSUE PERMISSIONS ENGINE                   */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTab === "permissions" && (
                  <div className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-xs">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Ticket className="size-5 text-primary" /> Bulk Event Permission Granting Engine
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Select an event, choose participants, run pre-flight safety checks, and issue atomic digital event passes (`EP-xxxx`).
                      </p>
                    </div>

                    {/* Step 1: Select Event */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label className="text-xs font-bold text-foreground">Step 1: Select Active Event *</Label>
                      {events.filter((e) => e.status === "SCHEDULED").length === 0 ? (
                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between">
                          <span>No scheduled events available. Please create an event first.</span>
                          <Button size="sm" onClick={() => setCreateEventModalOpen(true)} className="font-bold h-7 text-xs">
                            + Create Event
                          </Button>
                        </div>
                      ) : (
                        <Select value={targetEventId} onValueChange={setTargetEventId}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="-- Select Event --" />
                          </SelectTrigger>
                          <SelectContent>
                            {events.filter((e) => e.status === "SCHEDULED").map((ev) => (
                              <SelectItem key={ev.event_id} value={ev.event_id}>
                                {ev.event_name} ({ev.event_type}) &bull; {ev.event_date} ({ev.start_time} - {ev.end_time}) &bull; {ev.location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {activeTargetEvent && (
                      <div className="space-y-6 pt-2">
                        {/* Event Details Summary */}
                        <div className="bg-muted/50 p-4 rounded-xl border border-border text-xs space-y-1.5">
                          <p><strong className="text-foreground">Event Name:</strong> {activeTargetEvent.event_name} ({activeTargetEvent.event_type})</p>
                          <p><strong className="text-foreground">Schedule:</strong> {activeTargetEvent.event_date} | {activeTargetEvent.start_time} - {activeTargetEvent.end_time}</p>
                          <p><strong className="text-foreground">Location:</strong> {activeTargetEvent.location} ({activeTargetEvent.location_type})</p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                            ⚡ Selected students automatically receive active digital event pass (`EP-xxxx`). No student confirmation needed.
                          </p>
                        </div>

                        {/* Step 2: Quick Bulk Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-foreground">Step 2: Select Participants ({selectedRollNumbers.size} selected)</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={selectedYearFilter === "ALL" ? "default" : "outline"}
                              size="sm"
                              onClick={handleSelectAllMembers}
                              className="font-bold h-7 text-xs"
                            >
                              Select All ({members.length})
                            </Button>
                            {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((yr) => (
                              <Button
                                key={yr}
                                type="button"
                                variant={selectedYearFilter === yr ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleSelectByYear(yr)}
                                className="h-7 text-xs font-semibold"
                              >
                                {yr}
                              </Button>
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleClearSelection}
                              className="text-destructive hover:bg-destructive/10 font-bold h-7 text-xs"
                            >
                              Clear Selection
                            </Button>
                          </div>

                          {/* Quick Search Input */}
                          <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Search participant by roll number or name..."
                              value={permissionStudentSearch}
                              onChange={(e) => setPermissionStudentSearch(e.target.value)}
                              className="pl-9 h-9 text-xs bg-background"
                            />
                          </div>

                          {/* Member Checklist */}
                          <div className="max-h-56 overflow-y-auto border border-border rounded-xl p-2 bg-background divide-y divide-border mt-2">
                            {displayedChecklistMembers.length === 0 ? (
                              <p className="py-4 text-center text-xs text-muted-foreground italic">
                                No members found matching search "{permissionStudentSearch}" ({selectedYearFilter}).
                              </p>
                            ) : (
                              displayedChecklistMembers.map((m) => {
                                const isChecked = selectedRollNumbers.has(m.student_id);
                                return (
                                  <label key={m.id} className="flex items-center justify-between py-2 px-2.5 hover:bg-muted/40 rounded-lg cursor-pointer text-xs transition-colors">
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleStudentSelection(m.student_id)}
                                        className="rounded border-border text-primary size-4"
                                      />
                                      <span className="font-mono text-primary font-bold">{m.student_id}</span>
                                      <span className="font-medium text-foreground">{m.student_name}</span>
                                    </div>
                                    <span className="text-muted-foreground font-medium">{m.year} &bull; {m.section}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Additional CSV Roll Input */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Additional Roll Numbers / CSV List (Optional)</Label>
                          <Textarea
                            value={customRollInput}
                            onChange={(e) => setCustomRollInput(e.target.value)}
                            placeholder="Paste extra roll numbers separated by comma, space or line break (e.g. 23CSE1012, 23ECE2001)"
                            className="h-16 text-xs font-mono"
                          />
                        </div>

                        {/* Step 3: Give Permission Action */}
                        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-xs text-muted-foreground">
                            {totalSelectedCount === 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium italic">
                                Select participants above to enable permission granting.
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="size-4" /> {totalSelectedCount} student participant(s) selected and ready for authorization.
                              </span>
                            )}
                          </div>

                          <Button
                            onClick={handleExecuteGrantPermission}
                            disabled={submitting || totalSelectedCount === 0}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md h-10 px-6 text-sm"
                          >
                            <Send className="size-4" />
                            {submitting
                              ? "Validating & Granting..."
                              : `GIVE PERMISSION TO ${totalSelectedCount} STUDENT${totalSelectedCount === 1 ? "" : "S"}`}
                          </Button>
                        </div>

                        {/* Granted Event Passes & Export Roster */}
                        <div className="pt-6 border-t border-border space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                              <Calendar className="size-4 text-primary" /> Select Event to View & Export Approved Participant Roster
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {events.map((ev) => {
                                const isSelected = activeTargetEvent?.event_id === ev.event_id;
                                return (
                                  <button
                                    key={ev.event_id}
                                    type="button"
                                    onClick={() => {
                                      setTargetEventId(ev.event_id);
                                      loadEventParticipants(ev.event_id);
                                    }}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                        : "bg-card text-foreground border-border hover:border-primary/50"
                                    }`}
                                  >
                                    <Calendar className="size-3.5" />
                                    {ev.event_name}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                                      {ev.event_date}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                            <div>
                              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                                Approved Roster: <span className="text-primary font-extrabold">{activeTargetEvent?.event_name}</span> ({grantedParticipants.length})
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Showing approved participant passes issued for {activeTargetEvent?.event_name}.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePrintReport}
                                disabled={grantedParticipants.length === 0}
                                className="gap-2 text-xs font-semibold"
                              >
                                <Printer className="size-3.5" /> Print Roster
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                onClick={handleExportToCSV}
                                disabled={grantedParticipants.length === 0}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs"
                              >
                                <FileSpreadsheet className="size-3.5" /> Export to Excel (.csv)
                              </Button>
                            </div>
                          </div>

                          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                                <tr>
                                  <th className="px-3.5 py-2.5">Pass Code</th>
                                  <th className="px-3.5 py-2.5">Roll Number</th>
                                  <th className="px-3.5 py-2.5">Student Name</th>
                                  <th className="px-3.5 py-2.5">Department</th>
                                  <th className="px-3.5 py-2.5">Year & Sec</th>
                                  <th className="px-3.5 py-2.5">Status</th>
                                  <th className="px-3.5 py-2.5 text-right">Gate Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {loadingParticipants ? (
                                  <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                      <RefreshCw className="size-4 animate-spin mx-auto mb-1 text-primary" />
                                      Loading pass records...
                                    </td>
                                  </tr>
                                ) : grantedParticipants.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground italic">
                                      No permissions have been granted for this event yet.
                                    </td>
                                  </tr>
                                ) : (
                                  grantedParticipants.map((p) => (
                                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                                      <td className="px-3.5 py-2.5 font-mono font-bold text-primary">{p.permission_code}</td>
                                      <td className="px-3.5 py-2.5 font-mono font-bold text-foreground">{p.student_code}</td>
                                      <td className="px-3.5 py-2.5 font-medium text-foreground">{p.student_name}</td>
                                      <td className="px-3.5 py-2.5 text-muted-foreground">{p.department}</td>
                                      <td className="px-3.5 py-2.5 text-muted-foreground">{p.year} {p.section}</td>
                                      <td className="px-3.5 py-2.5">
                                        <ToneBadge tone={p.permission_status === "APPROVED" ? "success" : "neutral"}>
                                          {p.permission_status}
                                        </ToneBadge>
                                      </td>
                                      <td className="px-3.5 py-2.5 text-right font-medium">
                                        {p.exit_at ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                            Exited ({new Date(p.exit_at).toLocaleTimeString()})
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground italic">Not Used</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Event Modal */}
        <Dialog open={createEventModalOpen} onOpenChange={setCreateEventModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Event — {selectedClub?.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Event Name *</Label>
                  <Input
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. NSS Blood Donation Camp"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Event Type *</Label>
                  <Select value={eventType} onValueChange={(v: any) => setEventType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location Type *</Label>
                  <Select value={locationType} onValueChange={(v: any) => setLocationType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSIDE_CAMPUS">INSIDE CAMPUS</SelectItem>
                      <SelectItem value="OUTSIDE_CAMPUS">OUTSIDE CAMPUS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Exact Venue / Location *</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. College Auditorium / ABC Engineering College"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Details about event..."
                    className="h-20"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setCreateEventModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="font-bold">
                  {submitting ? "Creating..." : "Create Event"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

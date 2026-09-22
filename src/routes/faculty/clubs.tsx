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
  Send,
  Ticket,
  Printer,
  Edit,
  Eye,
  CalendarRange,
  FileSpreadsheet,
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
  DialogDescription,
} from "@/components/ui/dialog";
import { ToneBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import {
  getMyCoordinatedClubsApi,
  getClubMembersApi,
  addClubMemberApi,
  removeClubMemberApi,
  createClubEventApi,
  updateClubEventApi,
  getClubEventsApi,
  cancelClubEventApi,
  grantEventPermissionsAtomicApi,
  removeEventParticipantApi,
  getEventParticipantsApi,
  getEventParticipantConflictsApi,
} from "@/lib/api/clubs.server";
import type {
  DBClub,
  DBClubMember,
  DBClubEvent,
  DBEventParticipantReportItem,
  StudentEventConflict,
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

const EVENT_CATEGORIES: { value: EventType; label: string }[] = [
  { value: "WORKSHOP", label: "Workshop" },
  { value: "COMPETITION", label: "Competition" },
  { value: "CAMP", label: "Camp (NSS/NCC/Outreach)" },
  { value: "MEETING", label: "Meeting" },
  { value: "SPORTS_EVENT", label: "Sports Event" },
  { value: "CULTURAL_EVENT", label: "Cultural Event" },
  { value: "OTHER", label: "Other Activity" },
];

function formatDateDisplay(startDate?: string, endDate?: string): string {
  if (!startDate) return "Date TBD";
  if (!endDate || startDate === endDate) {
    try {
      const d = new Date(startDate);
      return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return startDate;
    }
  }
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const sStr = s.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const eStr = e.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    return `${sStr} – ${eStr}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0] || "0", 10);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0] || "";
}

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

  // Add Member to Club Modal State
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [newMemberRoll, setNewMemberRoll] = useState("");

  // Create Event Form State
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("16:00");
  const [locationType, setLocationType] = useState<LocationType>("INSIDE_CAMPUS");
  const [location, setLocation] = useState("Main Auditorium");
  const [eventType, setEventType] = useState<EventType>("WORKSHOP");
  const [additionalDetails, setAdditionalDetails] = useState("");

  // Edit Event Modal State
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DBClubEvent | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editEventDesc, setEditEventDesc] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLocationType, setEditLocationType] = useState<LocationType>("INSIDE_CAMPUS");
  const [editLocation, setEditLocation] = useState("");
  const [editEventType, setEditEventType] = useState<EventType>("WORKSHOP");
  const [editAdditionalDetails, setEditAdditionalDetails] = useState("");

  // Add Members to Event Modal State
  const [addMembersModalOpen, setAddMembersModalOpen] = useState(false);
  const [targetEventForMembers, setTargetEventForMembers] = useState<DBClubEvent | null>(null);
  const [eventMemberSearch, setEventMemberSearch] = useState("");
  const [eventMemberYearFilter, setEventMemberYearFilter] = useState("ALL");
  const [eventMemberSectionFilter, setEventMemberSectionFilter] = useState("ALL");
  const [selectedEventMemberRolls, setSelectedEventMemberRolls] = useState<Set<string>>(new Set());
  const [memberConflicts, setMemberConflicts] = useState<Record<string, StudentEventConflict>>({});
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  // View Event Details Modal State
  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);
  const [detailedEvent, setDetailedEvent] = useState<DBClubEvent | null>(null);

  // View Event Members Modal State
  const [viewMembersModalOpen, setViewMembersModalOpen] = useState(false);
  const [viewingEventForMembers, setViewingEventForMembers] = useState<DBClubEvent | null>(null);
  const [eventParticipantsList, setEventParticipantsList] = useState<DBEventParticipantReportItem[]>([]);
  const [loadingEventParticipants, setLoadingEventParticipants] = useState(false);

  // Permissions Tab State
  const [targetEventId, setTargetEventId] = useState<string>("");
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

  const loadParticipantsForModal = useCallback(async (eventId: string) => {
    setLoadingEventParticipants(true);
    try {
      const res = await getEventParticipantsApi({ data: { eventId } });
      setEventParticipantsList(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load participants list");
    } finally {
      setLoadingEventParticipants(false);
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const clubs = await getMyCoordinatedClubsApi();
      setMyClubs(clubs);
      setSelectedClub((curr) => curr || clubs[0] || null);
    } catch (err: any) {
      toast.error(err.message || "Failed to load faculty clubs");
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Selected target event for permissions tab
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

  // Handlers for Add Member to Club
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub || !newMemberRoll.trim()) return;

    setSubmitting(true);
    try {
      const added = await addClubMemberApi({ data: { clubId: selectedClub.club_id, studentCode: newMemberRoll.trim() } });
      toast.success(`Student ${added.student_name || newMemberRoll.toUpperCase()} (${newMemberRoll.toUpperCase()}) added to ${selectedClub.name}!`);
      setNewMemberRoll("");
      setAddMemberModalOpen(false);
      await loadClubDetails(selectedClub);
    } catch (err: any) {
      toast.error(err.message || "Failed to add member to club");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (studentCode: string, studentName?: string) => {
    if (!selectedClub) return;
    if (!confirm(`Are you sure you want to remove ${studentName || studentCode} from ${selectedClub.name}?`)) return;
    try {
      await removeClubMemberApi({ data: { clubId: selectedClub.club_id, studentCode } });
      toast.success(`Removed ${studentName || studentCode} from ${selectedClub.name}`);
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

    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    if (startDate === endDate && endTime <= startTime) {
      toast.error("For a single-day event, end time must be after start time.");
      return;
    }

    setSubmitting(true);
    try {
      const newEv = await createClubEventApi({
        data: {
          club_id: targetClub.club_id,
          event_name: eventName.trim(),
          description: eventDesc.trim() || null,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          location_type: locationType,
          location: location.trim(),
          event_type: eventType,
          additional_details: additionalDetails.trim() || null,
        },
      });
      toast.success(`Event "${eventName}" created successfully!`);
      setCreateEventModalOpen(false);
      setEventName("");
      setEventDesc("");
      setStartDate(getTodayString());
      setEndDate(getTodayString());
      setStartTime("09:00");
      setEndTime("16:00");
      setLocation("Main Auditorium");
      setAdditionalDetails("");

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

  // Handlers for Event Editing
  const handleOpenEditEvent = (ev: DBClubEvent) => {
    setEditingEvent(ev);
    setEditEventName(ev.event_name);
    setEditEventDesc(ev.description || "");
    setEditStartDate(ev.start_date || ev.event_date);
    setEditEndDate(ev.end_date || ev.start_date || ev.event_date);
    setEditStartTime(ev.start_time ? ev.start_time.slice(0, 5) : "09:00");
    setEditEndTime(ev.end_time ? ev.end_time.slice(0, 5) : "16:00");
    setEditLocationType(ev.location_type || "INSIDE_CAMPUS");
    setEditLocation(ev.location || "");
    setEditEventType(ev.event_type || "WORKSHOP");
    setEditAdditionalDetails(ev.additional_details || "");
    setEditEventModalOpen(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !selectedClub) return;

    if (new Date(editEndDate) < new Date(editStartDate)) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    if (editStartDate === editEndDate && editEndTime <= editStartTime) {
      toast.error("For a single-day event, end time must be after start time.");
      return;
    }

    setSubmitting(true);
    try {
      await updateClubEventApi({
        data: {
          eventId: editingEvent.event_id,
          event_name: editEventName.trim(),
          description: editEventDesc.trim() || null,
          start_date: editStartDate,
          end_date: editEndDate,
          start_time: editStartTime,
          end_time: editEndTime,
          location_type: editLocationType,
          location: editLocation.trim(),
          event_type: editEventType,
          additional_details: editAdditionalDetails.trim() || null,
        },
      });
      toast.success(`Event "${editEventName}" updated successfully!`);
      setEditEventModalOpen(false);
      await loadClubDetails(selectedClub);
    } catch (err: any) {
      toast.error(err.message || "Failed to update event");
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Add Members to Event
  const handleOpenAddMembers = async (ev: DBClubEvent) => {
    setTargetEventForMembers(ev);
    setEventMemberSearch("");
    setEventMemberYearFilter("ALL");
    setEventMemberSectionFilter("ALL");
    setLoadingConflicts(true);

    try {
      const [existing, conflicts] = await Promise.all([
        getEventParticipantsApi({ data: { eventId: ev.event_id } }),
        getEventParticipantConflictsApi({ data: { eventId: ev.event_id } }),
      ]);

      const conflictMap: Record<string, StudentEventConflict> = {};
      (conflicts as StudentEventConflict[]).forEach((c: StudentEventConflict) => {
        conflictMap[c.student_code.toUpperCase()] = c;
      });
      setMemberConflicts(conflictMap);

      const existingRolls = new Set<string>((existing as DBEventParticipantReportItem[]).map((p: DBEventParticipantReportItem) => p.student_code.toUpperCase()));
      setSelectedEventMemberRolls(existingRolls);
    } catch {
      setSelectedEventMemberRolls(new Set());
      setMemberConflicts({});
    } finally {
      setLoadingConflicts(false);
    }

    setAddMembersModalOpen(true);
  };

  const filteredClubMembersForEvent = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        (m.student_name && m.student_name.toLowerCase().includes(eventMemberSearch.toLowerCase())) ||
        m.student_id.toLowerCase().includes(eventMemberSearch.toLowerCase());

      const matchesYear = eventMemberYearFilter === "ALL" ? true : m.year === eventMemberYearFilter;
      const matchesSec = eventMemberSectionFilter === "ALL" ? true : m.section === eventMemberSectionFilter;

      return matchesSearch && matchesYear && matchesSec;
    });
  }, [members, eventMemberSearch, eventMemberYearFilter, eventMemberSectionFilter]);

  const handleToggleEventMember = (studentCode: string) => {
    const clean = studentCode.toUpperCase();
    const conflict = memberConflicts[clean];
    if (conflict && !selectedEventMemberRolls.has(clean)) {
      toast.error(
        `Schedule Conflict: ${clean} is already scheduled for "${conflict.conflicted_event_name}" (${conflict.conflicted_club_name}) on ${formatDateDisplay(conflict.start_date, conflict.end_date)} (${formatTimeDisplay(conflict.start_time)} – ${formatTimeDisplay(conflict.end_time)}).`
      );
      return;
    }

    setSelectedEventMemberRolls((prev) => {
      const next = new Set(prev);
      if (next.has(clean)) {
        next.delete(clean);
      } else {
        next.add(clean);
      }
      return next;
    });
  };

  const handleSelectAllFilteredEventMembers = () => {
    let skippedConflictsCount = 0;
    setSelectedEventMemberRolls((prev) => {
      const next = new Set(prev);
      filteredClubMembersForEvent.forEach((m) => {
        const code = m.student_id.toUpperCase();
        if (!memberConflicts[code]) {
          next.add(code);
        } else {
          skippedConflictsCount++;
        }
      });
      return next;
    });

    if (skippedConflictsCount > 0) {
      toast.info(`Auto-selected available members. Skipped ${skippedConflictsCount} student(s) with event timing conflicts.`);
    }
  };

  const handleDeselectAllFilteredEventMembers = () => {
    setSelectedEventMemberRolls((prev) => {
      const next = new Set(prev);
      filteredClubMembersForEvent.forEach((m) => next.delete(m.student_id.toUpperCase()));
      return next;
    });
  };

  const handleSaveEventMembers = async () => {
    if (!targetEventForMembers || !selectedClub) return;

    const selectedList = Array.from(selectedEventMemberRolls);
    if (selectedList.length === 0) {
      toast.error("Please select at least one club member to participate in the event.");
      return;
    }

    // Verify none of the selected members have conflicts
    const conflictedInSelected = selectedList
      .map((code) => memberConflicts[code])
      .filter(Boolean) as StudentEventConflict[];

    if (conflictedInSelected.length > 0) {
      toast.error(
        `Schedule Conflict: ${conflictedInSelected[0]?.student_name} (${conflictedInSelected[0]?.student_code}) has an overlapping event "${conflictedInSelected[0]?.conflicted_event_name}". Please uncheck conflicted members.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await grantEventPermissionsAtomicApi({
        data: {
          eventId: targetEventForMembers.event_id,
          studentCodes: selectedList,
        },
      });

      toast.success(
        `Success! ${res.grantedCount} member(s) added to "${targetEventForMembers.event_name}" with APPROVED event passes!`
      );
      setAddMembersModalOpen(false);
      await loadClubDetails(selectedClub);
    } catch (err: any) {
      toast.error(err.message || "Failed to add members to event");
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Give Permission Action from Event Card
  const handleGivePermissionForEvent = async (ev: DBClubEvent) => {
    if (!selectedClub) return;
    if (ev.status === "CANCELLED") {
      toast.error("Cannot grant permissions for a cancelled event.");
      return;
    }

    const pCount = ev.participant_count || 0;
    const aCount = ev.approved_permission_count || 0;

    if (pCount > 0 && aCount === pCount) {
      toast.info(`Permissions are already active and approved for all ${pCount} participant(s).`);
      return;
    }

    setSubmitting(true);
    try {
      const currentParticipants = await getEventParticipantsApi({ data: { eventId: ev.event_id } });

      if (currentParticipants.length === 0) {
        toast.info("Please select club members first using '+ Add Members'");
        handleOpenAddMembers(ev);
        return;
      }

      const codes = currentParticipants.map((p) => p.student_code);
      const res = await grantEventPermissionsAtomicApi({
        data: { eventId: ev.event_id, studentCodes: codes },
      });

      toast.success(
        `Permissions Granted! ${res.grantedCount} student(s) received active digital event passes.`
      );
      await loadClubDetails(selectedClub);
    } catch (err: any) {
      toast.error(err.message || "Failed to grant event permissions");
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for View Details & View Members
  const handleOpenViewDetails = (ev: DBClubEvent) => {
    setDetailedEvent(ev);
    setViewDetailsModalOpen(true);
  };

  const handleOpenViewMembers = (ev: DBClubEvent) => {
    setViewingEventForMembers(ev);
    loadParticipantsForModal(ev.event_id);
    setViewMembersModalOpen(true);
  };

  const handleRemoveParticipantFromModal = async (studentCode: string, studentName: string) => {
    if (!viewingEventForMembers || !selectedClub) return;
    if (!confirm(`Are you sure you want to remove ${studentName} (${studentCode}) from this event?`)) return;

    try {
      await removeEventParticipantApi({
        data: {
          eventId: viewingEventForMembers.event_id,
          studentCode,
        },
      });
      toast.success(`Removed ${studentName} from event`);
      await loadParticipantsForModal(viewingEventForMembers.event_id);
      await loadClubDetails(selectedClub);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove participant");
    }
  };

  const handleCancelEvent = async (ev: DBClubEvent) => {
    if (!confirm(`Are you sure you want to cancel "${ev.event_name}"? All student event passes will be revoked.`)) return;

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
      `${activeTargetEvent.event_name.replace(/\s+/g, "_")}_Approved_Participants.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${grantedParticipants.length} student pass records to Excel CSV!`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <RoleGuard allowedRoles={["faculty"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Coordinated Clubs & Workspace"
          description="Manage assigned student clubs, club member rosters, schedule official events, and issue digital event permissions."
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
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border no-scrollbar scroll-smooth">
              {myClubs.map((club) => {
                const isSelected = selectedClub?.club_id === club.club_id;
                return (
                  <button
                    key={club.club_id}
                    onClick={() => setSelectedClub(club)}
                    className={cn(
                      "shrink-0 flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
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
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-6">
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
                  </div>

                  {/* Members & Quick Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-border">
                    <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Total Club Members</span>
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

                {/* Section Tab Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border overflow-x-auto no-scrollbar scroll-smooth">
                  {[
                    { id: "members", label: "My Club Members", icon: Users, count: members.length },
                    { id: "events", label: "Events & Workshops", icon: Calendar, count: events.length },
                    { id: "permissions", label: "Event Passes & Roster", icon: Ticket },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabChange(tab.id as any)}
                        className={cn(
                          "shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                          isSelected
                            ? "bg-background text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* SUB-SECTION 1: MY CLUB MEMBERS MANAGEMENT                   */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTab === "members" && (
                  <div className="space-y-4">
                    {/* Club Members Section Header with prominent Add Member button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Users className="size-4 text-primary" />
                          <span>{selectedClub.name} — Member Roster</span>
                          <span className="text-xs font-normal text-muted-foreground">({filteredMembers.length} of {members.length})</span>
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enrolled students eligible for {selectedClub.name} events, workshops, and official passes.
                        </p>
                      </div>

                      <Button
                        onClick={() => setAddMemberModalOpen(true)}
                        size="sm"
                        className="gap-2 font-bold shadow-xs shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <UserPlus className="size-4" />
                        + Add Member to Club
                      </Button>
                    </div>

                    {/* Member Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-card p-3 rounded-2xl border border-border shadow-2xs">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search club member by roll number or name..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="pl-9 bg-background h-9 text-xs w-full"
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                          <SelectTrigger className="w-full sm:w-32 bg-background h-9 text-xs">
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
                          <SelectTrigger className="w-full sm:w-28 bg-background h-9 text-xs">
                            <SelectValue placeholder="Section" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Secs</SelectItem>
                            <SelectItem value="A">Sec A</SelectItem>
                            <SelectItem value="B">Sec B</SelectItem>
                            <SelectItem value="C">Sec C</SelectItem>
                            <SelectItem value="D">Sec D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Member Card List (< 640px) */}
                    <div className="block sm:hidden space-y-3">
                      {filteredMembers.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border space-y-2">
                          <Users className="size-8 mx-auto text-muted-foreground/60" />
                          <p>No club members match the search or filter criteria.</p>
                          <Button size="sm" variant="outline" onClick={() => setAddMemberModalOpen(true)} className="gap-1.5 text-xs font-semibold mt-2">
                            <UserPlus className="size-3.5" /> + Add Member Now
                          </Button>
                        </div>
                      ) : (
                        filteredMembers.map((m) => (
                          <div key={m.id} className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono font-bold text-xs text-primary block break-all">{m.student_id}</span>
                                <h4 className="font-bold text-foreground text-sm leading-snug break-words">{m.student_name}</h4>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveMember(m.student_id, m.student_name)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                title="Remove Member from Club"
                              >
                                <UserMinus className="size-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                              <div>
                                <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Department</span>
                                <span className="font-semibold text-foreground break-words">{m.department}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Year</span>
                                <span className="font-semibold text-foreground">{m.year}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Section</span>
                                <span className="font-semibold text-foreground">Sec {m.section}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Member Table (>= 640px) */}
                    <div className="hidden sm:block rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
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
                              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                                <Users className="size-8 mx-auto mb-2 text-muted-foreground/60" />
                                <p className="font-medium">No club members match the selected criteria.</p>
                                <Button size="sm" variant="outline" onClick={() => setAddMemberModalOpen(true)} className="gap-1.5 text-xs font-semibold mt-3">
                                  <UserPlus className="size-3.5" /> + Add Member to {selectedClub.name}
                                </Button>
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
                                    title="Remove Member from Club"
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
                {/* SUB-SECTION 2: EVENTS & EVENT CARDS                       */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTab === "events" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Official Club Events</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Create events, select club members as participants from the top-right button on each event card, and issue digital passes.
                        </p>
                      </div>
                      <Button onClick={() => setCreateEventModalOpen(true)} size="sm" className="gap-2 font-bold shadow-xs shrink-0">
                        <Plus className="size-4" /> Create Event
                      </Button>
                    </div>

                    {events.length === 0 ? (
                      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
                        <Calendar className="size-10 mx-auto text-primary/60" />
                        <div>
                          <h3 className="text-base font-bold text-foreground">No Events Created Yet</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Create an official event for {selectedClub.name} to grant digital passes (`EP-xxxx`) to participating members.
                          </p>
                        </div>
                        <Button onClick={() => setCreateEventModalOpen(true)} size="sm" className="font-bold">
                          <Plus className="size-4 mr-2" /> Create First Event
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {events.map((ev) => {
                          const isCancelled = ev.status === "CANCELLED";
                          const isCompleted = ev.status === "COMPLETED";
                          const participantCount = ev.participant_count || 0;
                          const approvedCount = ev.approved_permission_count || 0;

                          return (
                            <div
                              key={ev.event_id}
                              className={cn(
                                "rounded-2xl border bg-card p-5 space-y-4 shadow-xs transition-all flex flex-col justify-between",
                                isCancelled ? "border-destructive/30 bg-destructive/5" : "border-border hover:border-primary/40"
                              )}
                            >
                              <div className="space-y-3.5">
                                {/* Top Bar: Category Badges + TOP-RIGHT Add Members Button */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                                      {ev.event_type}
                                    </span>
                                    <ToneBadge tone={ev.location_type === "OUTSIDE_CAMPUS" ? "warning" : "info"}>
                                      {ev.location_type === "OUTSIDE_CAMPUS" ? "Outside Campus" : "Inside Campus"}
                                    </ToneBadge>
                                    <ToneBadge tone={isCancelled ? "danger" : isCompleted ? "neutral" : "success"}>
                                      {ev.status}
                                    </ToneBadge>
                                  </div>

                                  {/* REQUIRED: Top-right Add Members to Event button */}
                                  {!isCancelled && !isCompleted && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenAddMembers(ev)}
                                      className="gap-1.5 font-bold text-xs shrink-0 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground shadow-2xs"
                                    >
                                      <UserPlus className="size-3.5" /> + Add Members
                                    </Button>
                                  )}
                                </div>

                                {/* Event Title & Organizing Club */}
                                <div>
                                  <h3 className="text-base font-extrabold text-foreground leading-tight">{ev.event_name}</h3>
                                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                                    {ev.club_name || selectedClub.name}
                                  </p>
                                </div>

                                {/* Date, Time & Venue Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
                                  <div className="flex items-center gap-2">
                                    <CalendarRange className="size-3.5 text-primary shrink-0" />
                                    <span className="truncate">
                                      <strong className="text-foreground">{formatDateDisplay(ev.start_date || ev.event_date, ev.end_date)}</strong>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Clock className="size-3.5 text-primary shrink-0" />
                                    <span className="truncate">
                                      <strong className="text-foreground">{formatTimeDisplay(ev.start_time)} – {formatTimeDisplay(ev.end_time)}</strong>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                                    <MapPin className="size-3.5 text-primary shrink-0" />
                                    <span className="truncate">
                                      Venue: <strong className="text-foreground">{ev.location}</strong>
                                    </span>
                                  </div>
                                </div>

                                {/* Description */}
                                {ev.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {ev.description}
                                  </p>
                                )}

                                {/* Participants & Permission Status Bar */}
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                                  <div className="flex items-center gap-1.5">
                                    <Users className="size-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">Participants:</span>
                                    <strong className="text-foreground font-bold">{participantCount}</strong>
                                  </div>

                                  <div>
                                    {participantCount === 0 ? (
                                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                        No participants added
                                      </span>
                                    ) : approvedCount === participantCount && approvedCount > 0 ? (
                                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="size-3" /> All {approvedCount} Approved
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-primary">
                                        Permitted ({approvedCount}/{participantCount})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Card Action Buttons */}
                              <div className="pt-3 border-t border-border mt-3 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenViewDetails(ev)}
                                    className="gap-1.5 text-xs font-semibold flex-1 sm:flex-initial"
                                  >
                                    <Eye className="size-3.5" /> View Details
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenViewMembers(ev)}
                                    className="gap-1.5 text-xs font-semibold flex-1 sm:flex-initial"
                                  >
                                    <Users className="size-3.5" /> View Members ({participantCount})
                                  </Button>

                                  {!isCancelled && !isCompleted && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenEditEvent(ev)}
                                      className="gap-1.5 text-xs font-semibold flex-1 sm:flex-initial"
                                    >
                                      <Edit className="size-3.5" /> Edit
                                    </Button>
                                  )}
                                </div>

                                {!isCancelled && !isCompleted && (
                                  <div className="flex items-center justify-between gap-2 pt-1">
                                    {participantCount > 0 && approvedCount === participantCount ? (
                                      <div
                                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs select-none flex-1 shadow-2xs"
                                        title="All registered participants have approved permissions and active digital QR passes."
                                      >
                                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span>Permissions Granted</span>
                                      </div>
                                    ) : (
                                      <Button
                                        onClick={() => handleGivePermissionForEvent(ev)}
                                        disabled={submitting || participantCount === 0}
                                        size="sm"
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs flex-1"
                                      >
                                        <Send className="size-3.5" />
                                        {participantCount > approvedCount && approvedCount > 0
                                          ? `Give Permission (${participantCount - approvedCount} Pending)`
                                          : "Give Permission"}
                                      </Button>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCancelEvent(ev)}
                                      className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-semibold"
                                    >
                                      Cancel Event
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* SUB-SECTION 3: PERMISSIONS TAB VIEW                         */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTab === "permissions" && (
                  <div className="space-y-6 bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-xs">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Ticket className="size-5 text-primary" /> Event Passes & Participation Roster
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Inspect issued digital passes (`EP-xxxx`), view Security gate entry/exit verification logs, and export lists.
                      </p>
                    </div>

                    {/* Select Event */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label className="text-xs font-bold text-foreground">Select Event to Inspect Passes</Label>
                      {events.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No events available.</p>
                      ) : (
                        <Select value={targetEventId} onValueChange={setTargetEventId}>
                          <SelectTrigger className="bg-background text-xs">
                            <SelectValue placeholder="-- Select Event --" />
                          </SelectTrigger>
                          <SelectContent>
                            {events.map((ev) => (
                              <SelectItem key={ev.event_id} value={ev.event_id}>
                                {ev.event_name} &bull; {formatDateDisplay(ev.start_date || ev.event_date, ev.end_date)} &bull; {ev.location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {activeTargetEvent && (
                      <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                          <div>
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                              Approved Participants: <span className="text-primary font-extrabold">{activeTargetEvent.event_name}</span> ({grantedParticipants.length})
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Passes valid from {formatDateDisplay(activeTargetEvent.start_date || activeTargetEvent.event_date, activeTargetEvent.end_date)}, {formatTimeDisplay(activeTargetEvent.start_time)} – {formatTimeDisplay(activeTargetEvent.end_time)}.
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
                              <Printer className="size-3.5" /> Print List
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

                        {/* Mobile Granted Pass Cards (< 640px) */}
                        <div className="block sm:hidden space-y-3">
                          {loadingParticipants ? (
                            <div className="p-6 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
                              <RefreshCw className="size-4 animate-spin mx-auto mb-1 text-primary" />
                              Loading pass records...
                            </div>
                          ) : grantedParticipants.length === 0 ? (
                            <div className="p-6 text-center text-xs text-muted-foreground italic bg-card rounded-2xl border border-border">
                              No permissions have been granted for this event yet.
                            </div>
                          ) : (
                            grantedParticipants.map((p) => (
                              <div key={`mob-part-${p.id}`} className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-2 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-mono font-bold text-primary block">{p.permission_code}</span>
                                    <h4 className="font-bold text-foreground text-sm leading-snug">{p.student_name}</h4>
                                    <span className="font-mono font-bold text-muted-foreground">{p.student_code}</span>
                                  </div>
                                  <ToneBadge tone={p.permission_status === "APPROVED" ? "success" : "neutral"}>
                                    {p.permission_status}
                                  </ToneBadge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-muted-foreground">
                                  <div>
                                    <span className="text-[10px] font-semibold block uppercase">Department & Year</span>
                                    <span className="font-semibold text-foreground">{p.department} • {p.year} {p.section}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] font-semibold block uppercase">Gate Status</span>
                                    {p.exit_at ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                        Exited ({new Date(p.exit_at).toLocaleTimeString()})
                                      </span>
                                    ) : (
                                      <span className="italic">Not Scanned</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Desktop Granted Pass Table (>= 640px) */}
                        <div className="hidden sm:block rounded-xl border border-border bg-card overflow-x-auto min-w-0 w-full shadow-2xs">
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
                            <tbody className="divide-y border-border">
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
                                        <span className="text-muted-foreground italic">Not Scanned</span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL 0: ADD MEMBER TO CLUB DIALOG                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        <Dialog open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Add Member to {selectedClub?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter the student's college roll number to add them as an active member of this club roster.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddMember} className="space-y-4 py-2">
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/50 border border-border">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Club Context</Label>
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-primary shrink-0" />
                  <span className="font-extrabold text-sm text-foreground">{selectedClub?.name}</span>
                  <ToneBadge tone="info" className="ml-auto text-[10px]">{selectedClub?.club_type}</ToneBadge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Student Roll Number / Code *</Label>
                <Input
                  value={newMemberRoll}
                  onChange={(e) => setNewMemberRoll(e.target.value.toUpperCase())}
                  placeholder="e.g. 23CSE1012"
                  className="font-mono uppercase h-10 text-sm tracking-wider"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  The student will immediately appear in the club member list and become eligible for selection in club events.
                </p>
              </div>

              <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setAddMemberModalOpen(false);
                    setNewMemberRoll("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !newMemberRoll.trim()}
                  className="w-full sm:w-auto font-bold shadow-xs gap-2"
                >
                  <UserPlus className="size-4" />
                  {submitting ? "Adding to Club..." : "Add to Club"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL 1: CREATE EVENT (COMPLETE DETAILS + AUTO CLUB)       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <Dialog open={createEventModalOpen} onOpenChange={setCreateEventModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Create New Event</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter complete event specifications. Organizing club is automatically tied to your active context.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateEvent} className="space-y-4 py-2">
              {/* Organizing Club: Read-only Context */}
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/50 border border-border">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Organizing Club (Read-Only)</Label>
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-primary shrink-0" />
                  <span className="font-extrabold text-sm text-foreground">{selectedClub?.name}</span>
                  <ToneBadge tone="info" className="ml-auto text-[10px]">{selectedClub?.club_type}</ToneBadge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Event Name */}
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Event Name *</Label>
                  <Input
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. AI & Robotics Hackathon 2026"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Event Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Event Category *</Label>
                  <Select value={eventType} onValueChange={(v: any) => setEventType(v)}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Location / Movement Type *</Label>
                  <Select value={locationType} onValueChange={(v: any) => setLocationType(v)}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSIDE_CAMPUS">INSIDE CAMPUS</SelectItem>
                      <SelectItem value="OUTSIDE_CAMPUS">OUTSIDE CAMPUS (Gate Pass)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Venue / Location */}
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Venue / Exact Location *</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Main Auditorium / CSE Lab 3 / Community Outreach Center"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Start Date *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate || endDate < e.target.value) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">End Date *</Label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>

                {/* Start Time */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Start Time *</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>

                {/* End Time */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">End Time *</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Event Description *</Label>
                  <Textarea
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Describe event objectives, topics covered, or activities..."
                    className="h-16 text-xs"
                    required
                  />
                </div>

                {/* Additional Details */}
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Additional Instructions / Guidelines (Optional)</Label>
                  <Textarea
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                    placeholder="e.g. Bring college ID cards and laptops with Python installed..."
                    className="h-14 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setCreateEventModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto font-bold shadow-xs">
                  {submitting ? "Creating..." : "Create Event"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL 2: EDIT EVENT (COMPLETE DETAILS + AUTO CLUB)         */}
        {/* ══════════════════════════════════════════════════════════ */}
        <Dialog open={editEventModalOpen} onOpenChange={setEditEventModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Edit Event</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update event information. Organizing club remains strictly tied to this club.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateEvent} className="space-y-4 py-2">
              {/* Organizing Club: Read-only */}
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/50 border border-border">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Organizing Club (Read-Only)</Label>
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-primary shrink-0" />
                  <span className="font-extrabold text-sm text-foreground">{selectedClub?.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Event Name *</Label>
                  <Input
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Event Category *</Label>
                  <Select value={editEventType} onValueChange={(v: any) => setEditEventType(v)}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Location Type *</Label>
                  <Select value={editLocationType} onValueChange={(v: any) => setEditLocationType(v)}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSIDE_CAMPUS">INSIDE CAMPUS</SelectItem>
                      <SelectItem value="OUTSIDE_CAMPUS">OUTSIDE CAMPUS (Gate Pass)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Venue / Exact Location *</Label>
                  <Input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Start Date *</Label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">End Date *</Label>
                  <Input
                    type="date"
                    value={editEndDate}
                    min={editStartDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Start Time *</Label>
                  <Input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">End Time *</Label>
                  <Input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="h-9 text-xs bg-background"
                    required
                  />
                </div>

                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Textarea
                    value={editEventDesc}
                    onChange={(e) => setEditEventDesc(e.target.value)}
                    className="h-16 text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Additional Details</Label>
                  <Textarea
                    value={editAdditionalDetails}
                    onChange={(e) => setEditAdditionalDetails(e.target.value)}
                    className="h-14 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditEventModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto font-bold shadow-xs">
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL 3: ADD MEMBERS TO EVENT (ONLY ACTIVE CLUB MEMBERS)   */}
        {/* ══════════════════════════════════════════════════════════ */}
        <Dialog open={addMembersModalOpen} onOpenChange={setAddMembersModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Add Members to Event
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select active members of <strong>{selectedClub?.name}</strong> to participate in <strong>{targetEventForMembers?.event_name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Event Timing Reminder */}
              {targetEventForMembers && (
                <div className="bg-muted/50 p-3 rounded-xl border border-border text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="size-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      {formatDateDisplay(targetEventForMembers.start_date || targetEventForMembers.event_date, targetEventForMembers.end_date)}
                    </span>
                    <span className="text-muted-foreground">&bull;</span>
                    <span className="text-muted-foreground font-medium">
                      {formatTimeDisplay(targetEventForMembers.start_time)} – {formatTimeDisplay(targetEventForMembers.end_time)}
                    </span>
                  </div>
                  <ToneBadge tone="info" className="text-[10px]">
                    {targetEventForMembers.location_type}
                  </ToneBadge>
                </div>
              )}

              {/* Filters & Selection Tools */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search member by roll number or name..."
                      value={eventMemberSearch}
                      onChange={(e) => setEventMemberSearch(e.target.value)}
                      className="pl-9 bg-background h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:flex gap-2">
                    <Select value={eventMemberYearFilter} onValueChange={setEventMemberYearFilter}>
                      <SelectTrigger className="w-full sm:w-28 bg-background h-9 text-xs">
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

                    <Select value={eventMemberSectionFilter} onValueChange={setEventMemberSectionFilter}>
                      <SelectTrigger className="w-full sm:w-24 bg-background h-9 text-xs">
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Secs</SelectItem>
                        <SelectItem value="A">Sec A</SelectItem>
                        <SelectItem value="B">Sec B</SelectItem>
                        <SelectItem value="C">Sec C</SelectItem>
                        <SelectItem value="D">Sec D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bulk Select Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllFilteredEventMembers}
                      className="h-7 text-xs font-semibold"
                    >
                      Select All Filtered
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAllFilteredEventMembers}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Deselect Filtered
                    </Button>
                  </div>

                  <span className="text-xs font-extrabold text-primary">
                    {selectedEventMemberRolls.size} selected
                  </span>
                </div>
              </div>

              {/* Members Checklist Table / List */}
              <div className="max-h-72 overflow-y-auto border border-border rounded-xl bg-background divide-y divide-border">
                {loadingConflicts ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="size-4 animate-spin mx-auto mb-1.5 text-primary" />
                    Checking student schedules & conflict status...
                  </div>
                ) : filteredClubMembersForEvent.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground italic">
                    No club members found matching filters.
                  </p>
                ) : (
                  filteredClubMembersForEvent.map((m) => {
                    const cleanId = m.student_id.toUpperCase();
                    const isSelected = selectedEventMemberRolls.has(cleanId);
                    const conflict = memberConflicts[cleanId];

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "py-2.5 px-3 text-xs transition-colors space-y-1.5",
                          conflict ? "bg-amber-500/5 dark:bg-amber-500/10" : "hover:bg-muted/40",
                          isSelected && !conflict && "bg-primary/5 font-semibold"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className={cn("flex items-center gap-3 flex-1", conflict ? "cursor-not-allowed opacity-80" : "cursor-pointer")}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!!conflict && !isSelected}
                              onChange={() => handleToggleEventMember(m.student_id)}
                              className="rounded border-border text-primary size-4 disabled:opacity-50"
                            />
                            <div>
                              <span className="font-mono text-primary font-bold">{m.student_id}</span>
                              <span className="ml-2 font-semibold text-foreground">{m.student_name}</span>
                            </div>
                          </label>

                          <div className="flex items-center gap-2 text-muted-foreground text-[11px] shrink-0">
                            <span>{m.department}</span>
                            <span>&bull;</span>
                            <span>{m.year} {m.section}</span>
                          </div>
                        </div>

                        {/* Timing Conflict Warning Banner */}
                        {conflict && (
                          <div className="ml-7 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-amber-800 dark:text-amber-200 bg-amber-500/15 p-2 rounded-lg border border-amber-500/30">
                            <span className="font-bold flex items-center gap-1.5">
                              <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                              Schedule Conflict: Already in "{conflict.conflicted_event_name}" ({conflict.conflicted_club_name})
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatDateDisplay(conflict.start_date, conflict.end_date)} &bull; {formatTimeDisplay(conflict.start_time)}–{formatTimeDisplay(conflict.end_time)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  Clicking "Save & Issue Permissions" immediately grants APPROVED digital passes (`EP-xxxx`) to all selected members. Schedule conflicts are automatically prevented.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setAddMembersModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEventMembers}
                disabled={submitting || selectedEventMemberRolls.size === 0}
                className="w-full sm:w-auto font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {submitting ? "Granting..." : `Save & Issue Permissions (${selectedEventMemberRolls.size})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL 4: VIEW EVENT DETAILS                               */}
        {/* ══════════════════════════════════════════════════════════ */}
        <Dialog open={viewDetailsModalOpen} onOpenChange={setViewDetailsModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Event Details</DialogTitle>
            </DialogHeader>

            {detailedEvent && (
              <div className="space-y-4 py-2 text-xs">
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                        {detailedEvent.club_name || selectedClub?.name}
                      </span>
                      <h3 className="text-base font-extrabold text-foreground">{detailedEvent.event_name}</h3>
                    </div>
                    <ToneBadge tone={detailedEvent.status === "SCHEDULED" ? "success" : "neutral"}>
                      {detailedEvent.status}
                    </ToneBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60 text-muted-foreground">
                    <div>
                      <span className="text-[10px] font-bold block uppercase text-muted-foreground">Category</span>
                      <span className="font-semibold text-foreground">{detailedEvent.event_type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block uppercase text-muted-foreground">Movement Type</span>
                      <span className="font-semibold text-foreground">{detailedEvent.location_type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block uppercase text-muted-foreground">Date Range</span>
                      <span className="font-semibold text-foreground">
                        {formatDateDisplay(detailedEvent.start_date || detailedEvent.event_date, detailedEvent.end_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold block uppercase text-muted-foreground">Daily Time Window</span>
                      <span className="font-semibold text-foreground">
                        {formatTimeDisplay(detailedEvent.start_time)} – {formatTimeDisplay(detailedEvent.end_time)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold block uppercase text-muted-foreground">Venue / Location</span>
                      <span className="font-semibold text-foreground">{detailedEvent.location}</span>
                    </div>
                  </div>
                </div>

                {detailedEvent.description && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Description</h4>
                    <p className="text-muted-foreground leading-relaxed p-3 rounded-xl bg-background border border-border">
                      {detailedEvent.description}
                    </p>
                  </div>
                )}

                {detailedEvent.additional_details && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Additional Instructions</h4>
                    <p className="text-muted-foreground leading-relaxed p-3 rounded-xl bg-background border border-border">
                      {detailedEvent.additional_details}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-muted-foreground">
                  <div>
                    <span className="text-[10px] font-bold block uppercase">Total Participants</span>
                    <span className="text-base font-extrabold text-primary">{detailedEvent.participant_count || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold block uppercase">Approved Passes</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      {detailedEvent.approved_permission_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-2">
              <Button type="button" onClick={() => setViewDetailsModalOpen(false)} className="w-full sm:w-auto font-semibold">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL 5: VIEW EVENT MEMBERS LIST                           */}
        {/* ══════════════════════════════════════════════════════════ */}
        <Dialog open={viewMembersModalOpen} onOpenChange={setViewMembersModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="size-5 text-primary" /> Event Participants — {viewingEventForMembers?.event_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                All club members currently assigned to participate in this event.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {loadingEventParticipants ? (
                <div className="py-8 text-center text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mx-auto mb-1 text-primary" />
                  Loading participants...
                </div>
              ) : eventParticipantsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic bg-muted/30 rounded-xl border border-border">
                  No participants added to this event yet. Click "+ Add Members" on the event card.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5">Pass Code</th>
                        <th className="px-3 py-2.5">Roll Number</th>
                        <th className="px-3 py-2.5">Student Name</th>
                        <th className="px-3 py-2.5">Year & Sec</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {eventParticipantsList.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/40">
                          <td className="px-3 py-2.5 font-mono font-bold text-primary">{p.permission_code}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-foreground">{p.student_code}</td>
                          <td className="px-3 py-2.5 font-semibold text-foreground">{p.student_name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{p.year} {p.section}</td>
                          <td className="px-3 py-2.5">
                            <ToneBadge tone={p.permission_status === "APPROVED" ? "success" : "neutral"}>
                              {p.permission_status}
                            </ToneBadge>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveParticipantFromModal(p.student_code, p.student_name)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Remove Participant"
                            >
                              <UserMinus className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setViewMembersModalOpen(false);
                  if (viewingEventForMembers) {
                    handleOpenAddMembers(viewingEventForMembers);
                  }
                }}
                className="gap-1.5 text-xs font-bold text-primary"
              >
                <UserPlus className="size-3.5" /> + Add More Members
              </Button>
              <Button type="button" onClick={() => setViewMembersModalOpen(false)} className="font-semibold">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}

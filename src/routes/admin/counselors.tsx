import { useState, useEffect, useCallback, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Shuffle,
  ChevronLeft,
  Edit2,
  Eye,
  MoreVertical,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getCounselorAssignmentsAdminApi,
  addCounselorAssignmentAdminApi,
  removeCounselorAssignmentAdminApi,
  distributeStudentsAdminApi,
  getSectionStudentsAdminApi,
  getCounselorStudentsByAssignmentAdminApi,
  updateAssignmentStudentsAdminApi,
  moveCounselorStudentAdminApi,
  changeCounselorFacultyAdminApi,
} from "@/lib/api/counselor.server";
import { getAdminFacultyApi } from "@/lib/api/admin.server";
import type { DBCounselorAssignment } from "@/lib/db/counselor.server";
import { ToneBadge } from "@/components/status-badge";

export const Route = createFileRoute("/admin/counselors")({
  head: () => ({ meta: [{ title: "Counselor Management — Admin Portal" }] }),
  component: AdminCounselorsPage,
});

// ─── Local Types ────────────────────────────────────────────
type SectionStudent = {
  student_code: string;
  name: string;
  status: string;
  counselor_assignment_id: string | null;
  counselor_name: string | null;
};

type AssignmentStudent = {
  id: string;
  student_code: string;
  name: string;
  status: string;
};

type FacultyProfile = {
  id: string;
  full_name: string;
  email: string;
  staff_code: string | null;
};

// ─── Page Root ───────────────────────────────────────────────
function AdminCounselorsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminCounselorsContent />
    </RoleGuard>
  );
}

// ─── Main Content ────────────────────────────────────────────
function AdminCounselorsContent() {
  // Filters
  const [department, setDepartment] = useState("CSE");
  const [year, setYear] = useState("3rd Year");
  const [semester, setSemester] = useState(6);
  const [section, setSection] = useState("Section A");

  // Core data
  const [assignments, setAssignments] = useState<DBCounselorAssignment[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<FacultyProfile[]>([]);
  const [sectionStudents, setSectionStudents] = useState<SectionStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode: "cards" = counselor grid, "students" = view-students panel
  const [viewMode, setViewMode] = useState<"cards" | "students">("cards");
  const [viewAssignment, setViewAssignment] = useState<DBCounselorAssignment | null>(null);
  const [viewStudents, setViewStudents] = useState<AssignmentStudent[]>([]);
  const [viewSearch, setViewSearch] = useState("");
  const [viewLoading, setViewLoading] = useState(false);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addFaculty, setAddFaculty] = useState("");
  const [addStudentSearch, setAddStudentSearch] = useState("");
  const [addSelected, setAddSelected] = useState<Set<string>>(new Set());

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<DBCounselorAssignment | null>(null);
  const [editFaculty, setEditFaculty] = useState("");
  const [editStudentSearch, setEditStudentSearch] = useState("");
  const [editSelected, setEditSelected] = useState<Set<string>>(new Set());
  const [editLoading, setEditLoading] = useState(false);

  // Move students modal
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveSourceId, setMoveSourceId] = useState("");
  const [moveTargetId, setMoveTargetId] = useState("");
  const [moveStudentSearch, setMoveStudentSearch] = useState("");
  const [moveSelected, setMoveSelected] = useState<Set<string>>(new Set());
  const [moveSourceStudents, setMoveSourceStudents] = useState<AssignmentStudent[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);

  // Remove counselor modal
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeAssignment, setRemoveAssignment] = useState<DBCounselorAssignment | null>(null);

  // Redistribute modal
  const [redistributeOpen, setRedistributeOpen] = useState(false);

  // Shared submitting
  const [submitting, setSubmitting] = useState(false);

  // ── Computed Stats ──────────────────────────────────────────
  const totalStudents = sectionStudents.length;
  const assignedStudents = sectionStudents.filter(s => s.counselor_assignment_id !== null).length;
  const unassignedStudents = totalStudents - assignedStudents;

  // ── Data Loading ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setViewMode("cards");
    setViewAssignment(null);
    setViewStudents([]);
    try {
      const [aRes, fRes, sRes] = await Promise.all([
        getCounselorAssignmentsAdminApi({ data: { department, year, semester, section } }),
        getAdminFacultyApi().catch(() => ({ success: true, faculty: [] })),
        getSectionStudentsAdminApi({ data: { department, year, section } }).catch(() => []),
      ]);
      setAssignments(Array.isArray(aRes) ? aRes : []);
      if (fRes?.faculty) setFacultyProfiles(fRes.faculty as FacultyProfile[]);
      setSectionStudents(Array.isArray(sRes) ? sRes : []);
    } catch (err: any) {
      setError(err.message || "Failed to load counselor data.");
      toast.error(err.message || "Failed to load counselor data.");
    } finally {
      setLoading(false);
    }
  }, [department, year, semester, section]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── View Students ────────────────────────────────────────────
  const openViewStudents = async (assignment: DBCounselorAssignment) => {
    setViewAssignment(assignment);
    setViewMode("students");
    setViewSearch("");
    setViewLoading(true);
    setViewStudents([]);
    try {
      const students = await getCounselorStudentsByAssignmentAdminApi({ data: { assignmentId: assignment.id } });
      setViewStudents(Array.isArray(students) ? students : []);
    } catch {
      toast.error("Failed to load students.");
    } finally {
      setViewLoading(false);
    }
  };

  const backToCards = () => {
    setViewMode("cards");
    setViewAssignment(null);
    setViewStudents([]);
  };

  // ── Add Counselor ────────────────────────────────────────────
  const openAdd = (preSelectUnassigned = false) => {
    setAddFaculty("");
    setAddStudentSearch("");
    if (preSelectUnassigned) {
      setAddSelected(new Set(sectionStudents.filter(s => !s.counselor_assignment_id).map(s => s.student_code)));
    } else {
      setAddSelected(new Set());
    }
    setAddOpen(true);
  };

  const handleAddCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFaculty) { toast.error("Please select a faculty member."); return; }
    setSubmitting(true);
    try {
      const newAssignment = await addCounselorAssignmentAdminApi({
        data: { facultyId: addFaculty, department, year, semester, section },
      });
      if (addSelected.size > 0 && newAssignment?.id) {
        await updateAssignmentStudentsAdminApi({
          data: { assignmentId: newAssignment.id, studentCodes: Array.from(addSelected) },
        });
      }
      const msg = addSelected.size > 0
        ? `Counselor assigned! ${addSelected.size} student(s) linked.`
        : "Counselor assigned successfully!";
      toast.success(msg);
      setAddOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign counselor.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit Assignment ──────────────────────────────────────────
  const openEdit = async (assignment: DBCounselorAssignment) => {
    setEditAssignment(assignment);
    setEditFaculty(assignment.faculty_id);
    setEditStudentSearch("");
    setEditLoading(true);
    setEditOpen(true);
    try {
      const students = await getCounselorStudentsByAssignmentAdminApi({ data: { assignmentId: assignment.id } });
      setEditSelected(new Set(Array.isArray(students) ? students.map((s: AssignmentStudent) => s.student_code) : []));
    } catch {
      setEditSelected(new Set());
    } finally {
      setEditLoading(false);
    }
  };

  const openEditForUnassigned = (assignment: DBCounselorAssignment) => {
    setEditAssignment(assignment);
    setEditFaculty(assignment.faculty_id);
    setEditStudentSearch("");
    setEditLoading(false);
    const alreadyAssigned = sectionStudents
      .filter(s => s.counselor_assignment_id === assignment.id)
      .map(s => s.student_code);
    const unassigned = sectionStudents
      .filter(s => !s.counselor_assignment_id)
      .map(s => s.student_code);
    setEditSelected(new Set([...alreadyAssigned, ...unassigned]));
    setEditOpen(true);
  };

  const handleEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAssignment) return;
    setSubmitting(true);
    try {
      if (editFaculty && editFaculty !== editAssignment.faculty_id) {
        await changeCounselorFacultyAdminApi({ data: { assignmentId: editAssignment.id, facultyId: editFaculty } });
      }
      await updateAssignmentStudentsAdminApi({
        data: { assignmentId: editAssignment.id, studentCodes: Array.from(editSelected) },
      });
      toast.success("Assignment updated successfully!");
      setEditOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Move Students ────────────────────────────────────────────
  const openMove = async (sourceId: string) => {
    setMoveSourceId(sourceId);
    setMoveTargetId("");
    setMoveSelected(new Set());
    setMoveStudentSearch("");
    setMoveLoading(true);
    setMoveOpen(true);
    try {
      const students = await getCounselorStudentsByAssignmentAdminApi({ data: { assignmentId: sourceId } });
      setMoveSourceStudents(Array.isArray(students) ? students : []);
    } catch {
      setMoveSourceStudents([]);
    } finally {
      setMoveLoading(false);
    }
  };

  const handleMoveStudents = async () => {
    if (!moveTargetId) { toast.error("Please select a target counselor."); return; }
    if (moveSelected.size === 0) { toast.error("Please select students to move."); return; }
    setSubmitting(true);
    try {
      for (const code of moveSelected) {
        await moveCounselorStudentAdminApi({ data: { studentCode: code, fromAssignmentId: moveSourceId, toAssignmentId: moveTargetId } });
      }
      toast.success(`Moved ${moveSelected.size} student(s) successfully!`);
      setMoveOpen(false);
      await loadData();
      if (viewMode === "students" && viewAssignment?.id === moveSourceId) {
        await openViewStudents(viewAssignment);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to move students.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Remove Counselor ─────────────────────────────────────────
  const openRemove = (assignment: DBCounselorAssignment) => {
    setRemoveAssignment(assignment);
    setRemoveOpen(true);
  };

  const handleRemoveCounselor = async () => {
    if (!removeAssignment) return;
    if ((removeAssignment.student_count || 0) > 0) {
      toast.error("All students must be reassigned before removing this counselor.");
      return;
    }
    setSubmitting(true);
    try {
      await removeCounselorAssignmentAdminApi({ data: { assignmentId: removeAssignment.id } });
      toast.success("Counselor assignment removed.");
      setRemoveOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove counselor.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Redistribute ─────────────────────────────────────────────
  const handleRedistribute = async () => {
    setSubmitting(true);
    try {
      const res = await distributeStudentsAdminApi({ data: { department, year, section, mode: "auto" } });
      toast.success(`Balanced redistribution complete! ${res.totalStudents} students distributed across ${assignments.length} counselor(s).`);
      setRedistributeOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to redistribute.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Unassigned students flow ─────────────────────────────────
  const handleAssignUnassigned = () => {
    if (assignments.length === 0) {
      openAdd(true);
    } else if (assignments.length === 1 && assignments[0]) {
      openEditForUnassigned(assignments[0]);
    } else {
      openAdd(true);
    }
  };

  // ── Computed filtered lists ──────────────────────────────────
  const sourceAssignment = assignments.find(a => a.id === moveSourceId);
  const otherAssignments = assignments.filter(a => a.id !== moveSourceId);

  const filteredAddStudents = sectionStudents.filter(s =>
    !addStudentSearch ||
    s.name?.toLowerCase().includes(addStudentSearch.toLowerCase()) ||
    s.student_code.toLowerCase().includes(addStudentSearch.toLowerCase())
  );

  const filteredEditStudents = sectionStudents.filter(s =>
    !editStudentSearch ||
    s.name?.toLowerCase().includes(editStudentSearch.toLowerCase()) ||
    s.student_code.toLowerCase().includes(editStudentSearch.toLowerCase())
  );

  const filteredMoveStudents = moveSourceStudents.filter(s =>
    !moveStudentSearch ||
    s.name?.toLowerCase().includes(moveStudentSearch.toLowerCase()) ||
    s.student_code.toLowerCase().includes(moveStudentSearch.toLowerCase())
  );

  const filteredViewStudents = viewStudents.filter(s =>
    !viewSearch ||
    s.name?.toLowerCase().includes(viewSearch.toLowerCase()) ||
    s.student_code.toLowerCase().includes(viewSearch.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        title="Counselor Management"
        description="Assign faculty counselors to class sections and manage student distribution."
        breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Counselor Management" }]}
        actions={
          viewMode === "cards" ? (
            <Button
              onClick={() => openAdd(false)}
              className="rounded-xl font-semibold shadow-xs w-full sm:w-auto"
            >
              <UserPlus className="size-4 mr-2" /> Add Counselor
            </Button>
          ) : undefined
        }
      />

      {/* ── FILTER PANEL ── */}
      {viewMode === "cards" && (
        <div className="card-surface p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Class Section</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Department", value: department,
                options: ["CSE", "ECE", "EEE", "MECH", "CIVIL", "AIML", "IT"],
                onChange: (v: string) => setDepartment(v),
              },
              {
                label: "Academic Year", value: year,
                options: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
                onChange: (v: string) => setYear(v),
              },
              {
                label: "Section", value: section,
                options: ["Section A", "Section B", "Section C"],
                onChange: (v: string) => setSection(v),
              },
            ].map(({ label, value, options, onChange }) => (
              <div key={label}>
                <Label className="text-xs font-semibold text-muted-foreground mb-1">{label}</Label>
                <select
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1">Semester</Label>
              <select
                value={semester}
                onChange={e => setSemester(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── CLASS SUMMARY ── */}
      {viewMode === "cards" && !loading && !error && (
        <div className="card-surface p-4 sm:p-5 rounded-2xl border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider mb-2">
                {department} • {year} • Semester {semester} • {section}
              </span>
              <div className="flex flex-wrap gap-6 mt-1">
                {[
                  { label: "Total", value: totalStudents, color: "text-foreground" },
                  { label: "Assigned", value: assignedStudents, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Unassigned", value: unassignedStudents, color: unassignedStudents > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
                  { label: "Counselors", value: assignments.length, color: "text-blue-600 dark:text-blue-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                    <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              {unassignedStudents === 0 && totalStudents > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
                  <CheckCircle2 className="size-3.5" /> All students assigned
                </span>
              ) : unassignedStudents > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/20">
                  <AlertTriangle className="size-3.5" /> {unassignedStudents} unassigned
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">No students in this section</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── UNASSIGNED ALERT ── */}
      {viewMode === "cards" && !loading && unassignedStudents > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {unassignedStudents} student{unassignedStudents !== 1 ? "s are" : " is"} not assigned to any counselor in this section.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAssignUnassigned}
            className="rounded-xl text-xs font-bold border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10 w-full sm:w-auto shrink-0"
          >
            <UserPlus className="size-3.5 mr-1" /> Assign Unassigned Students
          </Button>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-surface rounded-2xl border border-border p-5 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted rounded-lg w-3/4" />
                  <div className="h-3 bg-muted rounded-lg w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded-lg" />
              <div className="h-16 bg-muted rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 bg-muted rounded-xl" />
                <div className="h-8 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card-surface rounded-2xl border border-destructive/30 p-10 text-center space-y-3">
          <AlertTriangle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl mx-auto">
            <RefreshCw className="size-3.5 mr-1" /> Retry
          </Button>
        </div>
      ) : viewMode === "students" && viewAssignment ? (
        <ViewStudentsPanel
          assignment={viewAssignment}
          students={filteredViewStudents}
          loading={viewLoading}
          search={viewSearch}
          onSearchChange={setViewSearch}
          onBack={backToCards}
          totalCount={viewStudents.length}
        />
      ) : (
        /* ── COUNSELOR CARD GRID ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.length === 0 && (
            <div className="col-span-full card-surface rounded-2xl border border-border p-12 text-center space-y-4">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Users className="size-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">No counselors assigned</p>
                <p className="text-xs text-muted-foreground mt-1">Add the first faculty counselor for {department} {year} {section}.</p>
              </div>
              <Button onClick={() => openAdd(false)} className="rounded-xl font-semibold mx-auto">
                <UserPlus className="size-4 mr-2" /> Add First Counselor
              </Button>
            </div>
          )}

          {assignments.map(assignment => (
            <CounselorCard
              key={assignment.id}
              assignment={assignment}
              canMove={assignments.length > 1}
              onViewStudents={() => openViewStudents(assignment)}
              onEdit={() => openEdit(assignment)}
              onMove={() => openMove(assignment.id)}
              onRemove={() => openRemove(assignment)}
              onRedistribute={() => setRedistributeOpen(true)}
            />
          ))}

          {/* Add Another Counselor card */}
          <button
            onClick={() => openAdd(false)}
            className="card-surface rounded-2xl border border-dashed border-border p-5 flex flex-col items-center justify-center gap-3 min-h-[220px] hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <UserPlus className="size-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Add Counselor</p>
              <p className="text-xs text-muted-foreground mt-0.5">{department} {year} {section}</p>
            </div>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: ADD COUNSELOR
          ══════════════════════════════════════════════ */}
      {addOpen && (
        <Modal onClose={() => setAddOpen(false)} title={<><UserPlus className="size-4 text-primary" /> Add Counselor</>}>
          <form onSubmit={handleAddCounselor} className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground font-medium">
              Class: <span className="text-foreground font-bold">{department} • {year} • Sem {semester} • {section}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Faculty Counselor *</Label>
              <select
                value={addFaculty}
                onChange={e => setAddFaculty(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select Faculty Member —</option>
                {facultyProfiles
                  .filter(f => !assignments.some(a => a.faculty_id === f.id))
                  .map(f => (
                    <option key={f.id} value={f.id}>{f.full_name} ({f.email})</option>
                  ))}
              </select>
            </div>

            <StudentSelector
              label="Assign Students"
              students={filteredAddStudents}
              selected={addSelected}
              onToggle={(code, on) => {
                const next = new Set(addSelected);
                if (on) next.add(code); else next.delete(code);
                setAddSelected(next);
              }}
              onSelectAll={() => setAddSelected(new Set(sectionStudents.filter(s => !s.counselor_assignment_id).map(s => s.student_code)))}
              onDeselectAll={() => setAddSelected(new Set())}
              search={addStudentSearch}
              onSearchChange={setAddStudentSearch}
              totalCount={totalStudents}
              isDisabledFn={(s) => s.counselor_assignment_id !== null}
              disabledLabel="Assigned"
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={submitting} className="rounded-xl font-bold">
                {submitting ? "Assigning..." : "Add Counselor"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: EDIT ASSIGNMENT
          ══════════════════════════════════════════════ */}
      {editOpen && editAssignment && (
        <Modal onClose={() => setEditOpen(false)} title={<><Edit2 className="size-4 text-primary" /> Edit Assignment</>}>
          <form onSubmit={handleEditAssignment} className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground font-medium">
              Editing: <span className="text-foreground font-bold">{editAssignment.department} • {editAssignment.year} • Sem {editAssignment.semester} • {editAssignment.section}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Faculty Counselor</Label>
              <select
                value={editFaculty}
                onChange={e => setEditFaculty(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {facultyProfiles.map(f => (
                  <option key={f.id} value={f.id}>{f.full_name} ({f.email})</option>
                ))}
              </select>
              {editFaculty !== editAssignment.faculty_id && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="size-3" /> Faculty member will be changed. Student assignments remain intact.
                </p>
              )}
            </div>

            {editLoading ? (
              <div className="h-48 rounded-xl border border-border flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin" />
                  <span className="text-xs">Loading student list...</span>
                </div>
              </div>
            ) : (
              <StudentSelector
                label="Assigned Students"
                students={filteredEditStudents}
                selected={editSelected}
                onToggle={(code, on) => {
                  const next = new Set(editSelected);
                  if (on) next.add(code); else next.delete(code);
                  setEditSelected(next);
                }}
                onSelectAll={() => setEditSelected(new Set(sectionStudents.filter(s => !s.counselor_assignment_id || s.counselor_assignment_id === editAssignment?.id).map(s => s.student_code)))}
                onDeselectAll={() => setEditSelected(new Set())}
                search={editStudentSearch}
                onSearchChange={setEditStudentSearch}
                totalCount={totalStudents}
                isDisabledFn={(s) => s.counselor_assignment_id !== null && s.counselor_assignment_id !== editAssignment?.id}
                disabledLabel="Other Counselor"
              />
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={submitting || editLoading} className="rounded-xl font-bold">
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: MOVE STUDENTS
          ══════════════════════════════════════════════ */}
      {moveOpen && (
        <Modal onClose={() => setMoveOpen(false)} title={<><Shuffle className="size-4 text-primary" /> Move Students</>}>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground font-medium">
              From: <span className="text-foreground font-bold">{sourceAssignment?.faculty_name || "—"}</span>
              <span className="ml-2 text-muted-foreground">({moveSourceStudents.length} students)</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Move to Counselor *</Label>
              <select
                value={moveTargetId}
                onChange={e => setMoveTargetId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select Target Counselor —</option>
                {otherAssignments.map(a => (
                  <option key={a.id} value={a.id}>{a.faculty_name} ({a.student_count} students)</option>
                ))}
              </select>
            </div>

            {moveLoading ? (
              <div className="h-48 rounded-xl border border-border flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin" />
                  <span className="text-xs">Loading students...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Students to Move</Label>
                  <span className="text-xs text-muted-foreground">{moveSelected.size} selected</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={moveStudentSearch}
                    onChange={e => setMoveStudentSearch(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-3 text-xs">
                  <button type="button" onClick={() => setMoveSelected(new Set(moveSourceStudents.map(s => s.student_code)))} className="text-primary font-semibold hover:underline">Select All</button>
                  <button type="button" onClick={() => setMoveSelected(new Set())} className="text-muted-foreground hover:underline">Deselect All</button>
                </div>
                <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {filteredMoveStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No students found</div>
                  ) : (
                    filteredMoveStudents.map(s => (
                      <label key={s.student_code} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 border-b border-border last:border-0">
                        <input
                          type="checkbox"
                          checked={moveSelected.has(s.student_code)}
                          onChange={e => {
                            const next = new Set(moveSelected);
                            if (e.target.checked) next.add(s.student_code); else next.delete(s.student_code);
                            setMoveSelected(next);
                          }}
                          className="size-3.5 rounded accent-primary"
                        />
                        <span className="font-mono text-xs text-primary font-bold w-24 shrink-0">{s.student_code}</span>
                        <span className="text-xs font-medium text-foreground flex-1 truncate">{s.name || "—"}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setMoveOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={handleMoveStudents}
                disabled={submitting || moveSelected.size === 0 || !moveTargetId}
                className="rounded-xl font-bold"
              >
                {submitting ? "Moving..." : `Move ${moveSelected.size} Student${moveSelected.size !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: REMOVE COUNSELOR
          ══════════════════════════════════════════════ */}
      {removeOpen && removeAssignment && (
        <Modal onClose={() => setRemoveOpen(false)} title={<><UserMinus className="size-4 text-destructive" /> Remove Counselor</>}>
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Remove <strong>{removeAssignment.faculty_name}</strong> as Counselor for{" "}
              <strong>{removeAssignment.department} {removeAssignment.year} {removeAssignment.section}</strong>?
            </p>

            <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Currently assigned students</span>
                <span className="font-bold text-foreground">{removeAssignment.student_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Historical violations</span>
                <span className="font-medium text-foreground">Preserved</span>
              </div>
            </div>

            {(removeAssignment.student_count || 0) > 0 ? (
              <>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-medium leading-relaxed">
                  <AlertTriangle className="size-3.5 inline mr-1.5 shrink-0" />
                  All <strong>{removeAssignment.student_count}</strong> students must be reassigned before removing this counselor.
                  Students cannot be left without a counselor assignment.
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRemoveOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button
                    variant="outline"
                    onClick={() => { setRemoveOpen(false); openMove(removeAssignment.id); }}
                    className="rounded-xl font-bold border-primary/40 text-primary hover:bg-primary/5"
                  >
                    <Shuffle className="size-3.5 mr-1" /> Reassign Students
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
                  This counselor has no active student assignments. Removing is safe.
                  Historical disciplinary records remain permanently linked.
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRemoveOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button
                    onClick={handleRemoveCounselor}
                    disabled={submitting}
                    className="rounded-xl font-bold bg-destructive hover:bg-destructive/90"
                  >
                    {submitting ? "Removing..." : "Confirm Remove"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: REDISTRIBUTE
          ══════════════════════════════════════════════ */}
      {redistributeOpen && (
        <Modal onClose={() => setRedistributeOpen(false)} title={<><Shuffle className="size-4 text-primary" /> Redistribute Students</>}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Evenly distribute all <strong className="text-foreground">{totalStudents}</strong> students in <strong className="text-foreground">{department} {year} {section}</strong> across <strong className="text-foreground">{assignments.length}</strong> counselor(s).
            </p>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Distribution</p>
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-sm font-medium text-foreground">{a.faculty_name}</span>
                  <span className="text-sm font-bold text-primary">{a.student_count} students</span>
                </div>
              ))}
            </div>

            {assignments.length > 0 && totalStudents > 0 && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                After redistribution: ~{Math.floor(totalStudents / assignments.length)} students per counselor
                {totalStudents % assignments.length > 0 && ` (${totalStudents % assignments.length} counselor(s) get one extra)`}
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
              <AlertTriangle className="size-3.5 inline mr-1.5" />
              Historical disciplinary ownership remains with original counselors. Only future violations route to new assignments.
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRedistributeOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={handleRedistribute}
                disabled={submitting || assignments.length === 0}
                className="rounded-xl font-bold"
              >
                {submitting ? "Redistributing..." : "Confirm & Redistribute"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────

/** Reusable modal wrapper: bottom-sheet on mobile, centered on desktop */
function Modal({ onClose, title, children }: {
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">{title}</h3>
          <button
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-0">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Student selector used in Add/Edit modals */
function StudentSelector({
  label,
  students,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
  search,
  onSearchChange,
  totalCount,
  isDisabledFn,
  disabledLabel,
}: {
  label: string;
  students: SectionStudent[];
  selected: Set<string>;
  onToggle: (code: string, on: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  totalCount: number;
  isDisabledFn: (s: SectionStudent) => boolean;
  disabledLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{label}</Label>
        <span className="text-xs text-muted-foreground font-medium">
          {selected.size} / {totalCount} selected
        </span>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={onSelectAll} className="text-primary font-semibold hover:underline">
          Select Available
        </button>
        <button type="button" onClick={onDeselectAll} className="text-muted-foreground hover:underline">
          Deselect All
        </button>
      </div>
      <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
        {students.length === 0 ? (
          <div className="p-5 text-center text-xs text-muted-foreground">
            {search ? "No students match your search." : "No students found in this section."}
          </div>
        ) : (
          students.map(s => {
            const isDisabled = isDisabledFn(s);
            const isSelected = selected.has(s.student_code);
            return (
              <label
                key={s.student_code}
                className={`flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 ${isDisabled && !isSelected ? "opacity-55 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled && !isSelected}
                  onChange={e => onToggle(s.student_code, e.target.checked)}
                  className="size-3.5 rounded accent-primary shrink-0"
                />
                <span className="font-mono text-xs text-primary font-bold w-24 shrink-0">{s.student_code}</span>
                <span className="text-xs font-medium text-foreground flex-1 truncate">{s.name || "—"}</span>
                {isDisabled && (
                  <span className="text-[10px] bg-muted border border-border px-1.5 py-0.5 rounded font-semibold text-muted-foreground shrink-0">
                    {disabledLabel}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Individual Counselor Card */
function CounselorCard({
  assignment,
  canMove,
  onViewStudents,
  onEdit,
  onMove,
  onRemove,
  onRedistribute,
}: {
  assignment: DBCounselorAssignment;
  canMove: boolean;
  onViewStudents: () => void;
  onEdit: () => void;
  onMove: () => void;
  onRemove: () => void;
  onRedistribute: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const initials = (assignment.faculty_name || "??")
    .split(" ")
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() || "")
    .join("");

  const studentCount = assignment.student_count ?? 0;

  return (
    <div className="card-surface rounded-2xl border border-border p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-extrabold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate leading-tight">{assignment.faculty_name}</p>
            <p className="text-xs text-muted-foreground">Faculty Counselor</p>
            {assignment.staff_code && (
              <p className="text-xs font-mono text-primary font-semibold">{assignment.staff_code}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ToneBadge tone="success">ACTIVE</ToneBadge>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="size-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              aria-label="More actions"
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[170px]">
                {canMove && (
                  <button
                    onClick={() => { setMenuOpen(false); onMove(); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <Shuffle className="size-3.5 text-muted-foreground" /> Move Students
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onRedistribute(); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2"
                >
                  <RefreshCw className="size-3.5 text-muted-foreground" /> Redistribute All
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => { setMenuOpen(false); onRemove(); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 flex items-center gap-2"
                >
                  <Trash2 className="size-3.5" /> Remove Counselor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class context */}
      <p className="text-xs text-muted-foreground font-medium">
        {assignment.department} &bull; {assignment.year} &bull; Sem {assignment.semester} &bull; {assignment.section}
      </p>

      {/* Student count */}
      <div className="flex flex-col items-center justify-center py-3 bg-muted/40 rounded-xl border border-border">
        <span className="text-4xl font-extrabold text-foreground tabular-nums">{studentCount}</span>
        <span className="text-xs text-muted-foreground font-medium mt-1">Assigned Students</span>
        {studentCount === 0 && (
          <span className="text-[10px] text-amber-600 font-semibold mt-1">No students assigned</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onViewStudents}
          className="rounded-xl text-xs font-semibold h-9"
          disabled={studentCount === 0}
        >
          <Eye className="size-3.5 mr-1" /> View Students
        </Button>
        <Button
          size="sm"
          onClick={onEdit}
          className="rounded-xl text-xs font-semibold h-9"
        >
          <Edit2 className="size-3.5 mr-1" /> Edit
        </Button>
      </div>
    </div>
  );
}

/** Inline View Students panel — replaces the card grid without a modal */
function ViewStudentsPanel({
  assignment,
  students,
  loading,
  search,
  onSearchChange,
  onBack,
  totalCount,
}: {
  assignment: DBCounselorAssignment;
  students: AssignmentStudent[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onBack: () => void;
  totalCount: number;
}) {
  const initials = (assignment.faculty_name || "??")
    .split(" ")
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="space-y-4">
      {/* Back + counselor header */}
      <div className="card-surface rounded-2xl border border-border p-4 sm:p-5 space-y-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ChevronLeft className="size-4" /> Back to Counselors
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-extrabold">
              {initials}
            </div>
            <div>
              <p className="font-bold text-foreground">{assignment.faculty_name}</p>
              <p className="text-xs text-muted-foreground">Faculty Counselor</p>
              {assignment.staff_code && (
                <p className="text-xs font-mono text-primary font-semibold">{assignment.staff_code}</p>
              )}
            </div>
          </div>
          <div className="sm:ml-4 text-xs text-muted-foreground font-medium">
            {assignment.department} &bull; {assignment.year} &bull; Sem {assignment.semester} &bull; {assignment.section}
          </div>
          <div className="sm:ml-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              <Users className="size-3.5" /> {totalCount} Students
            </span>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search student by name or roll number..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Student list */}
      {loading ? (
        <div className="card-surface rounded-2xl border border-border p-10 text-center space-y-2">
          <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card-surface rounded-2xl border border-border p-10 text-center space-y-2">
          <Users className="size-7 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            {search ? "No students match your search." : "No students assigned to this counselor."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card-surface rounded-2xl border border-border overflow-hidden hidden sm:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Roll Number</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map(s => (
                  <tr key={s.student_code} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{s.student_code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{s.name || "—"}</td>
                    <td className="px-4 py-3">
                      <ToneBadge tone={s.status?.toLowerCase() === "active" ? "success" : "warning"}>
                        {s.status || "Active"}
                      </ToneBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile student cards */}
          <div className="sm:hidden space-y-2">
            {students.map(s => (
              <div key={s.student_code} className="card-surface rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {s.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.name || "—"}</p>
                  <p className="text-xs font-mono text-muted-foreground">{s.student_code}</p>
                </div>
                <ToneBadge tone={s.status?.toLowerCase() === "active" ? "success" : "warning"}>
                  {s.status || "Active"}
                </ToneBadge>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

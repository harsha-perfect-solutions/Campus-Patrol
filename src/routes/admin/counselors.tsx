import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Shield,
  BookOpen,
  Shuffle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCounselorAssignmentsAdminApi,
  addCounselorAssignmentAdminApi,
  removeCounselorAssignmentAdminApi,
  distributeStudentsAdminApi,
} from "@/lib/api/counselor.server";
import { getAdminFacultyApi } from "@/lib/api/admin.server";
import type { DBCounselorAssignment } from "@/lib/db/counselor.server";
import { ToneBadge } from "@/components/status-badge";

export const Route = createFileRoute("/admin/counselors")({
  head: () => ({ meta: [{ title: "Counselor Management — Admin Portal" }] }),
  component: AdminCounselorsPage,
});

function AdminCounselorsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminCounselorsContent />
    </RoleGuard>
  );
}

function AdminCounselorsContent() {
  const [department, setDepartment] = useState("CSE");
  const [year, setYear] = useState("2nd Year");
  const [semester, setSemester] = useState(3);
  const [section, setSection] = useState("Section A");

  const [assignments, setAssignments] = useState<DBCounselorAssignment[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<Array<{ id: string; full_name: string; email: string; staff_code: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  // Add Counselor Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redistribute Modal
  const [redistributeModalOpen, setRedistributeModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, fRes] = await Promise.all([
        getCounselorAssignmentsAdminApi({
          data: { department, year, semester, section },
        }),
        getAdminFacultyApi().catch(() => ({ success: true, faculty: [] })),
      ]);
      setAssignments(aRes);
      if (fRes && fRes.faculty) {
        setFacultyProfiles(fRes.faculty);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load counselor assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [department, year, semester, section]);

  const handleAddCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyId) {
      toast.error("Please select a faculty member.");
      return;
    }
    setSubmitting(true);
    try {
      await addCounselorAssignmentAdminApi({
        data: {
          facultyId: selectedFacultyId,
          department,
          year,
          semester,
          section,
        },
      });
      toast.success("Counselor assigned successfully! Existing student assignments remain stable.");
      setAddModalOpen(false);
      setSelectedFacultyId("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign counselor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCounselor = async (id: string, name?: string) => {
    if (!confirm(`Are you sure you want to remove ${name || "this counselor"} from ${department} ${year} ${section}?`)) {
      return;
    }
    try {
      await removeCounselorAssignmentAdminApi({ data: { assignmentId: id } });
      toast.success("Counselor assignment removed.");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove counselor");
    }
  };

  const handleRedistributeStudents = async () => {
    setSubmitting(true);
    try {
      const res = await distributeStudentsAdminApi({
        data: {
          department,
          year,
          section,
          mode: "auto",
        },
      });
      toast.success(`Balanced distribution complete! ${res.totalStudents} student(s) distributed across ${assignments.length} counselor(s).`);
      setRedistributeModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to redistribute students");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAssignedStudents = assignments.reduce((acc, curr) => acc + (curr.student_count || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counselor Management & Student Distribution"
        description="Assign faculty counselors to class sections and configure student assignments."
        breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Counselor Management" }]}
        actions={
          <Button onClick={() => setAddModalOpen(true)} className="rounded-xl font-bold shadow-xs">
            <UserPlus className="size-4 mr-2" /> Add Counselor to Section
          </Button>
        }
      />

      {/* Class Section Filters */}
      <div className="card-surface p-5 rounded-2xl border border-border shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Filter className="size-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            SELECT CLASS SECTION
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-semibold">Department</Label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Academic Year</Label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Semester</Label>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Section</Label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="Section A">Section A</option>
              <option value="Section B">Section B</option>
              <option value="Section C">Section C</option>
            </select>
          </div>
        </div>
      </div>

      {/* Counselor Summary Header */}
      <div className="card-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider mb-1">
            {department} &bull; {year} &bull; Sem {semester} &bull; {section}
          </span>
          <h3 className="text-lg font-bold text-foreground">
            Class Counselors ({assignments.length}) &bull; Total Students: {totalAssignedStudents}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Counselor assignments are stable and preserved. Adding or removing a counselor does not auto-rebalance existing student assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setRedistributeModalOpen(true)}
            disabled={assignments.length === 0}
            className="rounded-xl text-xs font-bold gap-2"
          >
            <Shuffle className="size-3.5 text-primary" /> Redistribute Students
          </Button>
          <Button onClick={() => setAddModalOpen(true)} size="sm" className="rounded-xl font-bold text-xs">
            <UserPlus className="size-3.5 mr-1" /> Add Counselor
          </Button>
        </div>
      </div>

      {/* Counselors List Table */}
      <div className="card-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            ASSIGNED COUNSELORS FOR {department} {year} {section}
          </h4>
          <Button variant="ghost" size="sm" onClick={loadData} className="text-xs">
            <RefreshCw className="size-3 mr-1" /> Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Counselor Faculty</th>
                <th className="px-4 py-3">Staff Code / Email</th>
                <th className="px-4 py-3">Class Context</th>
                <th className="px-4 py-3">Assigned Students</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading counselor assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                    No Counselors currently assigned to {department} {year} {section}.
                  </td>
                </tr>
              ) : (
                assignments.map((ca) => (
                  <tr key={ca.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground">{ca.faculty_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="font-mono text-primary font-bold">{ca.staff_code || "FAC-STAFF"}</span>
                      <br />
                      {ca.faculty_email}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {ca.department} {ca.year} ({ca.section})
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
                        {ca.student_count} Students
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ToneBadge tone="success">ACTIVE</ToneBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCounselor(ca.id, ca.faculty_name)}
                        className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5 mr-1" /> Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Counselor Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Add Counselor to {department} {year} {section}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)}>
                &times;
              </Button>
            </div>

            <form onSubmit={handleAddCounselor} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Faculty Member</Label>
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold"
                  required
                >
                  <option value="">-- Choose Faculty Member --</option>
                  {facultyProfiles.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name} ({f.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                📌 Note: Existing student assignments remain unchanged. Click <strong>Redistribute Students</strong> after adding if you wish to re-balance students evenly.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="font-bold">
                  {submitting ? "Assigning..." : "Assign Counselor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redistribute Students Modal */}
      {redistributeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Shuffle className="size-5 text-primary" /> Redistribute Students
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setRedistributeModalOpen(false)}>
                &times;
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will calculate a new balanced distribution of students in <strong>{department} {year} {section}</strong> across the <strong>{assignments.length}</strong> active Counselors.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
              ⚠️ Historical violation ownership remains attached to their historical Counselors. Only future violations will route to the new Counselor assignments.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRedistributeModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRedistributeStudents} disabled={submitting} className="bg-primary font-bold">
                {submitting ? "Redistributing..." : "Confirm & Redistribute"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

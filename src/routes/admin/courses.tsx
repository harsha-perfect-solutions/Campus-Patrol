import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  RefreshCw,
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
import { cn } from "@/lib/utils";
import {
  getAcademicCoursesApi,
  createCourseApi,
  updateCourseApi,
  deleteCourseApi,
} from "@/lib/api/courses.server";
import type { AcademicCourse } from "@/lib/db/courses.server";

export const Route = createFileRoute("/admin/courses")({
  head: () => ({ meta: [{ title: "Academic Courses — Admin Console" }] }),
  component: AdminCoursesPage,
});

const DEPARTMENTS = ["ALL", "CSE", "ECE", "EEE", "MECH", "CIVIL"];
const SEMESTERS = ["ALL", "1", "2", "3", "4", "5", "6", "7", "8"];
const COURSE_TYPES = ["ALL", "Theory", "Practical / Lab", "Elective", "Project"];

function AdminCoursesPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminCoursesContent />
    </RoleGuard>
  );
}

function AdminCoursesContent() {
  const [courses, setCourses] = useState<AcademicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedSem, setSelectedSem] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AcademicCourse | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDept, setFormDept] = useState("CSE");
  const [formSem, setFormSem] = useState(5);
  const [formCredits, setFormCredits] = useState(4);
  const [formType, setFormType] = useState<AcademicCourse["courseType"]>("Theory");
  const [formFaculty, setFormFaculty] = useState("");

  // Delete modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<AcademicCourse | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAcademicCoursesApi({
        data: {
          department: selectedDept,
          semester: selectedSem,
          courseType: selectedType,
          search,
        },
      });

      if (res.success) {
        setCourses(res.courses);
      } else {
        toast.error(res.error || "Failed to load academic courses catalog.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to connect to courses server.");
    } finally {
      setLoading(false);
    }
  }, [selectedDept, selectedSem, selectedType, search]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const stats = useMemo(() => {
    const total = courses.length;
    const theory = courses.filter((c) => c.courseType === "Theory").length;
    const lab = courses.filter((c) => c.courseType === "Practical / Lab").length;
    const elective = courses.filter((c) => c.courseType === "Elective" || c.courseType === "Project").length;
    return { total, theory, lab, elective };
  }, [courses]);

  function handleOpenCreate() {
    setEditingCourse(null);
    setFormCode("");
    setFormTitle("");
    setFormDept("CSE");
    setFormSem(5);
    setFormCredits(4);
    setFormType("Theory");
    setFormFaculty("");
    setDialogOpen(true);
  }

  function handleOpenEdit(course: AcademicCourse) {
    setEditingCourse(course);
    setFormCode(course.courseCode);
    setFormTitle(course.title);
    setFormDept(course.department);
    setFormSem(course.semester);
    setFormCredits(course.credits);
    setFormType(course.courseType);
    setFormFaculty(course.assignedFaculty);
    setDialogOpen(true);
  }

  async function handleSaveCourse(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!formCode.trim() || !formTitle.trim()) {
      toast.error("Please enter both Course Code and Title.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingCourse) {
        const res = await updateCourseApi({
          data: {
            id: editingCourse.id,
            input: {
              courseCode: formCode.trim().toUpperCase(),
              title: formTitle.trim(),
              department: formDept,
              semester: Number(formSem),
              credits: Number(formCredits),
              courseType: formType,
              assignedFaculty: formFaculty.trim() || "Unassigned",
            },
          },
        });

        if (res.success && res.course) {
          toast.success(`Course ${res.course.courseCode} updated.`);
          setDialogOpen(false);
          fetchCourses();
        } else {
          toast.error(res.error || "Failed to update course.");
        }
      } else {
        const res = await createCourseApi({
          data: {
            courseCode: formCode.trim().toUpperCase(),
            title: formTitle.trim(),
            department: formDept,
            semester: Number(formSem),
            credits: Number(formCredits),
            courseType: formType,
            assignedFaculty: formFaculty.trim() || "Unassigned",
            status: "Active",
          },
        });

        if (res.success && res.course) {
          toast.success(`Course ${res.course.courseCode} added to catalog.`);
          setDialogOpen(false);
          fetchCourses();
        } else {
          toast.error(res.error || "Failed to add course.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving course.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCourse) return;
    setSubmitting(true);
    try {
      const res = await deleteCourseApi({
        data: { id: deletingCourse.id },
      });

      if (res.success) {
        toast.success(`Course ${deletingCourse.courseCode} removed.`);
        setDeleteDialogOpen(false);
        setDeletingCourse(null);
        fetchCourses();
      } else {
        toast.error(res.error || "Failed to remove course.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while removing course.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetFilters() {
    setSearch("");
    setSelectedDept("ALL");
    setSelectedSem("ALL");
    setSelectedType("ALL");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Courses & Curriculum"
        description="Master catalog of institutional subjects, course codes, credit weightages, and faculty assignments."
        breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Courses" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCourses}
              disabled={loading}
              className="rounded-xl font-bold text-xs h-9 gap-1.5 shadow-2xs"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="rounded-xl font-bold text-xs h-9 gap-2 shadow-xs bg-primary text-primary-foreground"
            >
              <Plus className="size-4" />
              Add Course
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Courses",
            value: stats.total,
            icon: BookOpen,
            color: "bg-primary/10 text-primary",
          },
          {
            label: "Theory Subjects",
            value: stats.theory,
            icon: FileSpreadsheet,
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
          },
          {
            label: "Practical Labs",
            value: stats.lab,
            icon: Layers,
            color: "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300",
          },
          {
            label: "Electives / Projects",
            value: stats.elective,
            icon: GraduationCap,
            color: "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{s.value}</p>
            </div>
            <span className={`grid size-9 place-items-center rounded-xl ${s.color}`}>
              <s.icon className="size-4.5" />
            </span>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="card-surface p-4 rounded-2xl border border-border space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, title or faculty..."
              className="pl-9 text-xs h-9 rounded-xl"
            />
          </div>

          <div>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="text-xs h-9 rounded-xl">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d === "ALL" ? "All Departments" : d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={selectedSem} onValueChange={setSelectedSem}>
              <SelectTrigger className="text-xs h-9 rounded-xl">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                {SEMESTERS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s === "ALL" ? "All Semesters" : `Semester ${s}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="text-xs h-9 rounded-xl flex-1">
                <SelectValue placeholder="Course Type" />
              </SelectTrigger>
              <SelectContent>
                {COURSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t === "ALL" ? "All Types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || selectedDept !== "ALL" || selectedSem !== "ALL" || selectedType !== "ALL") && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleResetFilters}
                title="Reset Filters"
                className="h-9 w-9 shrink-0"
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Courses Data Table */}
      <div className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-divider flex items-center justify-between bg-muted/20">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
            Institutional Course Offerings ({courses.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
            <p>Loading course catalog from PostgreSQL database...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">No courses found matching the selected search and filter criteria.</p>
            <div className="pt-2 flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="rounded-xl text-xs">
                Reset Filters
              </Button>
              <Button size="sm" onClick={handleOpenCreate} className="rounded-xl text-xs bg-primary text-primary-foreground">
                <Plus className="size-3.5 mr-1" /> Add Course
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-divider bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Dept & Sem</th>
                  <th className="py-3 px-4">Credits</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Assigned Faculty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {courses.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-accent/40">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{c.courseCode}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{c.title}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <span className="font-bold text-foreground">{c.department}</span> • Sem {c.semester}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold">
                        {c.credits} Credits
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold",
                          c.courseType === "Theory" && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                          c.courseType === "Practical / Lab" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                          c.courseType === "Elective" && "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                          c.courseType === "Project" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                        )}
                      >
                        {c.courseType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-medium">{c.assignedFaculty}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Course"
                        className="h-8 w-8"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setDeletingCourse(c);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete Course"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingCourse ? "Edit Course" : "Add New Course"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCourse} className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Course Code *</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. CS501"
                  required
                  className="mt-1 text-xs h-9 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Department *</Label>
                <Select value={formDept} onValueChange={setFormDept}>
                  <SelectTrigger className="mt-1 text-xs h-9 rounded-xl">
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
            </div>

            <div>
              <Label className="text-xs font-bold">Course Title *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Operating Systems"
                required
                className="mt-1 text-xs h-9 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold">Semester</Label>
                <Select value={String(formSem)} onValueChange={(v) => setFormSem(Number(v))}>
                  <SelectTrigger className="mt-1 text-xs h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <SelectItem key={s} value={String(s)} className="text-xs">
                        Sem {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Credits</Label>
                <Select value={String(formCredits)} onValueChange={(v) => setFormCredits(Number(v))}>
                  <SelectTrigger className="mt-1 text-xs h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <SelectItem key={c} value={String(c)} className="text-xs">
                        {c} Credits
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Type</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as AcademicCourse["courseType"])}
                >
                  <SelectTrigger className="mt-1 text-xs h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_TYPES.filter((t) => t !== "ALL").map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Assigned Faculty (Optional)</Label>
              <Input
                value={formFaculty}
                onChange={(e) => setFormFaculty(e.target.value)}
                placeholder="e.g. Prof. Ravi Kumar"
                className="mt-1 text-xs h-9 rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-divider">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                size="sm"
                className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground"
              >
                {submitting ? "Saving..." : editingCourse ? "Save Changes" : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-4" /> Delete Academic Course?
            </DialogTitle>
          </DialogHeader>

          {deletingCourse && (
            <div className="space-y-3 pt-2 text-xs text-muted-foreground">
              <p>
                Are you sure you want to remove <strong>{deletingCourse.courseCode}: {deletingCourse.title}</strong> from the catalog?
              </p>
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1 font-mono text-[11px] text-foreground">
                <p>Department: {deletingCourse.department} • Semester {deletingCourse.semester}</p>
                <p>Credits: {deletingCourse.credits} | Type: {deletingCourse.courseType}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-divider">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={submitting}
              className="rounded-xl text-xs font-bold h-9"
            >
              {submitting ? "Removing..." : "Remove Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  GraduationCap,
  UserCog,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  RefreshCw,
  Power,
  Users,
  CheckCircle2,
  Phone,
  Mail,
  Filter,
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
import { cn } from "@/lib/utils";
import { getAdminStudentsApi } from "@/lib/api/admin.server";
import {
  getAdminFacultyListApi,
  createAdminFacultyApi,
  updateAdminFacultyApi,
  toggleAdminFacultyStatusApi,
  deleteAdminFacultyApi,
} from "@/lib/api/faculty.server";
import type { DBStudent } from "@/lib/db/students.server";
import type { DBFacultyMember } from "@/lib/db/faculty.server";

interface SearchParams {
  tab?: "students" | "faculty";
}

export const Route = createFileRoute("/admin/students")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      tab: search.tab === "faculty" ? "faculty" : "students",
    };
  },
  head: () => ({ meta: [{ title: "Students & Faculty — Admin Console" }] }),
  component: AdminStudentsAndFacultyPage,
});

const DEPARTMENTS = ["ALL", "CSE", "ECE", "EEE", "AIML", "CIVIL", "IT", "MECH"] as const;
const YEARS = ["ALL", "1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const SECTIONS = ["ALL", "Section A", "Section B", "Section C"] as const;

export function AdminStudentsAndFacultyPage({ initialTab }: { initialTab?: "students" | "faculty" }) {
  const search = useSearch({ strict: false }) as SearchParams;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"students" | "faculty">(
    initialTab || search?.tab || "students"
  );

  const handleTabChange = (tab: "students" | "faculty") => {
    setActiveTab(tab);
    navigate({
      to: "/admin/students",
      search: { tab },
      replace: true,
    });
  };

  // ================= STUDENTS STATE =================
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentDept, setStudentDept] = useState<string>("ALL");
  const [studentYear, setStudentYear] = useState<string>("ALL");
  const [studentSection, setStudentSection] = useState<string>("ALL");
  const [studentSearch, setStudentSearch] = useState("");

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const res = await getAdminStudentsApi();
      if (res.success) {
        setStudents(res.students);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (studentDept !== "ALL" && s.department !== studentDept) return false;
      if (studentYear !== "ALL" && s.year !== studentYear) return false;
      if (studentSection !== "ALL" && s.section !== studentSection) return false;

      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCode = s.student_code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [students, studentDept, studentYear, studentSection, studentSearch]);

  const handleResetStudentFilters = () => {
    setStudentDept("ALL");
    setStudentYear("ALL");
    setStudentSection("ALL");
    setStudentSearch("");
  };

  // ================= FACULTY STATE =================
  const [facultyList, setFacultyList] = useState<DBFacultyMember[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [facultySearch, setFacultySearch] = useState("");
  const [facultyDept, setFacultyDept] = useState("ALL");
  const [facultyStatus, setFacultyStatus] = useState("ALL");

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<DBFacultyMember | null>(null);

  const [formName, setFormName] = useState("");
  const [formStaffCode, setFormStaffCode] = useState("");
  const [formDepartment, setFormDepartment] = useState("CSE");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingFaculty, setDeletingFaculty] = useState<DBFacultyMember | null>(null);

  const fetchFacultyList = useCallback(async () => {
    setFacultyLoading(true);
    try {
      const res = await getAdminFacultyListApi({
        data: {
          department: facultyDept,
          status: facultyStatus,
          search: facultySearch,
        },
      });

      if (res.success) {
        setFacultyList(res.facultyList);
      } else {
        toast.error(res.error || "Failed to load faculty members.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to connect to faculty server.");
    } finally {
      setFacultyLoading(false);
    }
  }, [facultyDept, facultyStatus, facultySearch]);

  useEffect(() => {
    fetchFacultyList();
  }, [fetchFacultyList]);

  const handleResetFacultyFilters = () => {
    setFacultySearch("");
    setFacultyDept("ALL");
    setFacultyStatus("ALL");
  };

  const facultyMetrics = useMemo(() => {
    const total = facultyList.length;
    const active = facultyList.filter((f) => f.status === "Active").length;
    const inactive = facultyList.filter((f) => f.status === "Inactive").length;
    return { total, active, inactive };
  }, [facultyList]);

  const handleOpenAddFaculty = () => {
    setEditingFaculty(null);
    setFormName("");
    setFormStaffCode("");
    setFormDepartment("CSE");
    setFormEmail("");
    setFormPhone("+91 ");
    setFormStatus("Active");
    setFormModalOpen(true);
  };

  const handleOpenEditFaculty = (faculty: DBFacultyMember) => {
    setEditingFaculty(faculty);
    setFormName(faculty.name);
    setFormStaffCode(faculty.staffCode);
    setFormDepartment(faculty.department);
    setFormEmail(faculty.email);
    setFormPhone(faculty.phone || "+91 ");
    setFormStatus(faculty.status);
    setFormModalOpen(true);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStaffCode.trim() || !formEmail.trim() || !formDepartment.trim()) {
      toast.error("Please enter Name, Staff Code, Email, and Department.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingFaculty) {
        const res = await updateAdminFacultyApi({
          data: {
            id: editingFaculty.id,
            input: {
              name: formName.trim(),
              staffCode: formStaffCode.trim().toUpperCase(),
              department: formDepartment,
              email: formEmail.trim().toLowerCase(),
              phone: formPhone.trim(),
              status: formStatus,
            },
          },
        });

        if (res.success && res.faculty) {
          toast.success("Faculty Updated!", {
            description: `${res.faculty.name} (${res.faculty.staffCode}) updated successfully.`,
          });
          setFormModalOpen(false);
          fetchFacultyList();
        } else {
          toast.error(res.error || "Failed to update faculty member.");
        }
      } else {
        const res = await createAdminFacultyApi({
          data: {
            name: formName.trim(),
            staffCode: formStaffCode.trim().toUpperCase(),
            department: formDepartment,
            email: formEmail.trim().toLowerCase(),
            phone: formPhone.trim(),
            status: formStatus,
          },
        });

        if (res.success && res.faculty) {
          toast.success("Faculty Registered!", {
            description: `${res.faculty.name} registered under ${res.faculty.department}.`,
          });
          setFormModalOpen(false);
          fetchFacultyList();
        } else {
          toast.error(res.error || "Failed to register faculty member.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving faculty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (faculty: DBFacultyMember) => {
    const nextStatus = faculty.status === "Active" ? "Inactive" : "Active";
    setSubmitting(true);
    try {
      const res = await toggleAdminFacultyStatusApi({
        data: {
          id: faculty.id,
          status: nextStatus,
        },
      });

      if (res.success && res.faculty) {
        toast.success("Faculty Status Changed", {
          description: `${res.faculty.name} is now ${res.faculty.status}.`,
        });
        fetchFacultyList();
      } else {
        toast.error(res.error || "Failed to change faculty status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFaculty) return;
    setSubmitting(true);
    try {
      const res = await deleteAdminFacultyApi({
        data: { id: deletingFaculty.id },
      });

      if (res.success) {
        toast.success("Faculty Removed!", {
          description: `${deletingFaculty.name} removed from faculty registry.`,
        });
        setDeleteModalOpen(false);
        setDeletingFaculty(null);
        fetchFacultyList();
      } else {
        toast.error(res.error || "Failed to remove faculty member.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while removing faculty.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Students & Faculty"
            description="Centralized master directory for enrolled student rosters and faculty teaching staff records."
            breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Students & Faculty" }]}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === "students") loadStudents();
                  else fetchFacultyList();
                }}
                disabled={activeTab === "students" ? studentsLoading : facultyLoading}
                className="rounded-xl text-xs h-9 gap-1.5 font-semibold"
              >
                <RefreshCw
                  className={cn(
                    "size-3.5",
                    (activeTab === "students" ? studentsLoading : facultyLoading) && "animate-spin"
                  )}
                />
                Refresh
              </Button>
            }
          />
          {activeTab === "faculty" && (
            <Button
              onClick={handleOpenAddFaculty}
              className="h-10 px-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs shrink-0 w-full sm:w-auto gap-2"
            >
              <Plus className="size-4" />
              <span>Add Faculty Member</span>
            </Button>
          )}
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-divider pb-2">
          <button
            type="button"
            onClick={() => handleTabChange("students")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer",
              activeTab === "students"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <GraduationCap className="size-4" />
            <span>Students ({students.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("faculty")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer",
              activeTab === "faculty"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <UserCog className="size-4" />
            <span>Faculty Members ({facultyList.length})</span>
          </button>
        </div>

        {/* ================= STUDENTS TAB VIEW ================= */}
        {activeTab === "students" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Dynamic Filters Control Toolbar */}
            <section className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-divider pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="size-4 text-primary shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Filter Students by Department, Year & Section
                  </h3>
                </div>
                {(studentDept !== "ALL" ||
                  studentYear !== "ALL" ||
                  studentSection !== "ALL" ||
                  studentSearch.trim()) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetStudentFilters}
                    className="text-xs h-8 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <RotateCcw className="size-3.5 mr-1" /> Reset Filters
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Department Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Department</Label>
                  <Select value={studentDept} onValueChange={setStudentDept}>
                    <SelectTrigger className="h-10 text-xs rounded-xl border-border">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {d === "ALL" ? "All Departments" : `${d} Department`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Academic Year Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Academic Year</Label>
                  <Select value={studentYear} onValueChange={setStudentYear}>
                    <SelectTrigger className="h-10 text-xs rounded-xl border-border">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y} className="text-xs">
                          {y === "ALL" ? "All Academic Years" : y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Section</Label>
                  <Select value={studentSection} onValueChange={setStudentSection}>
                    <SelectTrigger className="h-10 text-xs rounded-xl border-border">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((sec) => (
                        <SelectItem key={sec} value={sec} className="text-xs">
                          {sec === "ALL" ? "All Sections" : sec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Input */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Search Student</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search name or roll no..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 h-10 text-xs rounded-xl border-border"
                    />
                  </div>
                </div>
              </div>
            </section>

            {studentsLoading ? (
              <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
                <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
                <p>Loading student master database...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
                <Users className="size-8 mx-auto text-muted-foreground/50" />
                <p className="font-semibold text-foreground">
                  No students found matching your selected Department, Year, or Section filters.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetStudentFilters}
                    className="rounded-xl text-xs"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStudents.map((s) => (
                  <div
                    key={s.student_code}
                    className="card-surface p-4 sm:p-5 rounded-2xl border border-border text-xs space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm block">{s.name}</span>
                      <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                        {s.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      Roll No: <strong className="text-foreground">{s.student_code}</strong>
                    </p>
                    <p className="text-muted-foreground">
                      Dept: <strong className="text-primary font-bold">{s.department}</strong>
                    </p>
                    <p className="text-muted-foreground">
                      Year/Sec:{" "}
                      <strong className="text-foreground">
                        {s.year} &bull; {s.section}
                      </strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= FACULTY TAB VIEW ================= */}
        {activeTab === "faculty" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total Teaching Staff
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">{facultyMetrics.total}</p>
                </div>
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UserCog className="size-4.5" />
                </span>
              </div>

              <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Active Faculty
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {facultyMetrics.active}
                  </p>
                </div>
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <CheckCircle2 className="size-4.5" />
                </span>
              </div>

              <div className="card-surface p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Inactive / On Leave
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    {facultyMetrics.inactive}
                  </p>
                </div>
                <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                  <Power className="size-4.5" />
                </span>
              </div>
            </div>

            {/* Filter Controls Toolbar */}
            <div className="card-surface p-4 rounded-2xl border border-border shadow-xs space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                    placeholder="Search staff code, name, department or email..."
                    className="pl-9 text-xs h-9 rounded-xl border-border"
                  />
                </div>

                <div>
                  <Select value={facultyDept} onValueChange={setFacultyDept}>
                    <SelectTrigger className="text-xs h-9 rounded-xl border-border">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {d === "ALL" ? "All Departments" : `Dept: ${d}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={facultyStatus} onValueChange={setFacultyStatus}>
                    <SelectTrigger className="text-xs h-9 rounded-xl border-border flex-1">
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

                  {(facultySearch || facultyDept !== "ALL" || facultyStatus !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleResetFacultyFilters}
                      title="Reset Filters"
                      className="h-9 w-9 shrink-0 rounded-lg"
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Faculty Directory Grid */}
            {facultyLoading ? (
              <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
                <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
                <p>Loading faculty list...</p>
              </div>
            ) : facultyList.length === 0 ? (
              <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">
                  No faculty members found matching your search.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFacultyFilters}
                    className="rounded-xl text-xs"
                  >
                    Reset Filters
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenAddFaculty}
                    className="rounded-xl text-xs bg-primary text-primary-foreground"
                  >
                    <Plus className="size-3.5 mr-1" /> Add Faculty
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {facultyList.map((f) => (
                  <div
                    key={f.id}
                    className="card-surface p-5 rounded-2xl border border-border text-xs space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground text-sm block">{f.name}</span>
                        <ToneBadge tone={f.status === "Active" ? "success" : "neutral"}>
                          {f.status}
                        </ToneBadge>
                      </div>

                      <p className="text-muted-foreground font-mono text-[11px]">
                        Staff Code: <strong className="text-primary font-bold">{f.staffCode}</strong>{" "}
                        &bull; Dept: <strong className="text-foreground">{f.department}</strong>
                      </p>

                      <div className="space-y-1 text-muted-foreground pt-1 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{f.email}</span>
                        </div>
                        {f.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="size-3 text-muted-foreground shrink-0" />
                            <span>{f.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-divider flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(f)}
                        title={f.status === "Active" ? "Deactivate Faculty" : "Activate Faculty"}
                        className={cn(
                          "rounded-xl text-[11px] h-7 px-2 font-medium gap-1",
                          f.status === "Active"
                            ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        )}
                      >
                        <Power className="size-3" />
                        <span>{f.status === "Active" ? "Deactivate" : "Activate"}</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenEditFaculty(f)}
                          title="Edit Profile"
                          className="h-7 w-7 rounded-lg"
                        >
                          <Pencil className="size-3.5 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setDeletingFaculty(f);
                            setDeleteModalOpen(true);
                          }}
                          title="Remove Faculty"
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

            {/* Add / Edit Faculty Modal */}
            <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold">
                    {editingFaculty ? (
                      <Pencil className="size-4 text-primary" />
                    ) : (
                      <Plus className="size-4 text-primary" />
                    )}
                    <span>{editingFaculty ? "Edit Faculty Profile" : "Add New Faculty Member"}</span>
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSaveFaculty} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Full Name *</Label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Prof. Vikram Mehta"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Staff Code *</Label>
                      <Input
                        type="text"
                        required
                        placeholder="e.g. FAC-101"
                        value={formStaffCode}
                        onChange={(e) => setFormStaffCode(e.target.value)}
                        className="h-9 text-xs rounded-xl font-mono uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Department *</Label>
                      <Select value={formDepartment} onValueChange={setFormDepartment}>
                        <SelectTrigger className="h-9 text-xs rounded-xl">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Institutional Email *</Label>
                      <Input
                        type="email"
                        required
                        placeholder="e.g. faculty@cmadms.edu"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Phone Number</Label>
                      <Input
                        type="text"
                        placeholder="e.g. +91 9876543210"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Account Status</Label>
                    <Select
                      value={formStatus}
                      onValueChange={(val) => setFormStatus(val as "Active" | "Inactive")}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active" className="text-xs">
                          Active (Eligible for timetable assignments)
                        </SelectItem>
                        <SelectItem value="Inactive" className="text-xs">
                          Inactive (On Leave / Suspended)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="pt-3 border-t border-divider">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormModalOpen(false)}
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
                      {submitting
                        ? "Saving..."
                        : editingFaculty
                          ? "Save Profile Changes"
                          : "Register Faculty Member"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                    <Trash2 className="size-5" /> Remove Faculty Member?
                  </DialogTitle>
                </DialogHeader>

                {deletingFaculty && (
                  <div className="space-y-3 pt-2 text-xs text-muted-foreground">
                    <p>
                      Are you sure you want to remove{" "}
                      <strong>
                        {deletingFaculty.name} ({deletingFaculty.staffCode})
                      </strong>{" "}
                      from the faculty master registry?
                    </p>
                    <p className="text-[11px] text-amber-600 font-semibold">
                      Note: Soft deactivation (setting status to Inactive) is preferred to maintain
                      historical timetable integrity.
                    </p>
                  </div>
                )}

                <DialogFooter className="pt-3 border-t border-divider">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={submitting}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    disabled={submitting}
                    variant="destructive"
                    className="rounded-xl text-xs font-semibold"
                  >
                    {submitting ? "Removing..." : "Remove Faculty"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

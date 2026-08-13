import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Filter, GraduationCap, Plus, RotateCcw, Search, Users } from "lucide-react";
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
import { getAdminStudentsApi, createAdminStudentApi } from "@/lib/api/admin.server";
import type { DBStudent } from "@/lib/db/students.server";

export const Route = createFileRoute("/admin/students")({
  head: () => ({ meta: [{ title: "Student Master — Admin Console" }] }),
  component: AdminStudentsPage,
});

const DEPARTMENTS = ["ALL", "CSE", "ECE", "EEE", "AIML", "CIVIL", "IT", "MECH"] as const;
const YEARS = ["ALL", "1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const SECTIONS = ["ALL", "Section A", "Section B", "Section C"] as const;

function AdminStudentsPage() {
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Add student form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("Section A");
  const [semester, setSemester] = useState(6);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStudents() {
      try {
        const res = await getAdminStudentsApi();
        if (isMounted && res.success) {
          setStudents(res.students);
        }
      } catch (err) {
        console.error("Failed to load students from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStudents();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedDept !== "ALL" && s.department !== selectedDept) return false;
      if (selectedYear !== "ALL" && s.year !== selectedYear) return false;
      if (selectedSection !== "ALL" && s.section !== selectedSection) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCode = s.student_code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [students, selectedDept, selectedYear, selectedSection, searchQuery]);

  const handleResetFilters = () => {
    setSelectedDept("ALL");
    setSelectedYear("ALL");
    setSelectedSection("ALL");
    setSearchQuery("");
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim() || !name.trim()) return;

    setSubmitting(true);
    try {
      const res = await createAdminStudentApi({
        data: {
          studentCode: studentCode.trim(),
          name: name.trim(),
          department,
          year,
          section,
          semester,
        },
      });

      if (res.success && res.student) {
        toast.success("Student Enrolled Successfully!", {
          description: `${res.student.name} (${res.student.student_code}) added to PostgreSQL database.`,
        });
        setStudents((prev) => [res.student!, ...prev]);
        setShowAddModal(false);
        setStudentCode("");
        setName("");
      } else {
        toast.error(res.error || "Failed to create student.");
      }
    } catch (err) {
      console.error("Failed to create student:", err);
      toast.error("Error creating student record in database.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Student Master Database"
          description="Manage institutional student profiles, enrollments, and semester assignments across departments, years, and sections."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Students" }]}
          actions={
            <Button
              onClick={() => setShowAddModal((prev) => !prev)}
              size="sm"
              className="rounded-xl font-semibold bg-primary text-primary-foreground"
            >
              <Plus className="size-4 mr-1.5" /> Enroll New Student
            </Button>
          }
        />

        {showAddModal && (
          <form
            onSubmit={handleCreateStudent}
            className="card-surface p-6 rounded-2xl border border-primary/30 shadow-xs max-w-xl space-y-4"
          >
            <h3 className="text-sm font-bold text-foreground">
              Enroll New Student into Master Database
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="stCode">Student Code / Roll No</Label>
                <Input
                  id="stCode"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="e.g. 23CSE1099"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stName">Full Name</Label>
                <Input
                  id="stName"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Verma"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
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

              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.filter((y) => y !== "ALL").map((y) => (
                      <SelectItem key={y} value={y} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.filter((s) => s !== "ALL").map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={!studentCode.trim() || !name.trim()}
                size="sm"
                className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
              >
                Save Student Record
              </Button>
            </div>
          </form>
        )}

        {/* Dynamic Filters Control Toolbar */}
        <section className="card-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                FILTER STUDENTS BY DEPARTMENT, YEAR & SECTION
              </h3>
            </div>
            {(selectedDept !== "ALL" ||
              selectedYear !== "ALL" ||
              selectedSection !== "ALL" ||
              searchQuery.trim()) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-8 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <RotateCcw className="size-3.5 mr-1" /> Reset Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Department Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Department</Label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
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
              <Select value={selectedYear} onValueChange={setSelectedYear}>
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
              <Select value={selectedSection} onValueChange={setSelectedSection}>
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-border"
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading student master database...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
            <Users className="size-8 mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">
              No students found matching your selected Department, Year, or Section filters.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="rounded-xl text-xs"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {filteredStudents.map((s) => (
              <div
                key={s.student_code}
                className="card-surface p-5 rounded-2xl border border-border text-xs space-y-2 hover:border-primary/40 transition-colors"
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
    </RoleGuard>
  );
}

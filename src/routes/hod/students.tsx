import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Filter, GraduationCap, RotateCcw, Search, Users } from "lucide-react";
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
import { students as staticStudents, type Student } from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { getHodStudentsApi } from "@/lib/api/hod.server";

export const Route = createFileRoute("/hod/students")({
  head: () => ({ meta: [{ title: "Department Students — HOD Portal" }] }),
  component: HODStudentsPage,
});

const YEARS = ["ALL", "1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const SECTIONS = ["ALL", "Section A", "Section B", "Section C"] as const;

function HODStudentsPage() {
  const { reports } = useCmadms();
  const { profile } = useAuth();
  const userDept = profile?.department || "CSE";

  const [deptStudents, setDeptStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDeptStudents() {
      try {
        const res = await getHodStudentsApi();
        if (isMounted && res.success && res.students.length > 0) {
          const mapped: Student[] = res.students.map((s) => ({
            id: s.studentCode || s.id,
            name: s.name,
            department: s.department,
            year: s.year || "3rd Year",
            section: s.section || "Section A",
            semester: s.semester || 6,
            status: "Active",
          }));
          setDeptStudents(mapped);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to load HOD department students from DB:", err);
      }

      if (isMounted) {
        // Fall back strictly to static students belonging ONLY to userDept
        const filteredStatic = staticStudents.filter(
          (s) => s.department.toUpperCase() === userDept.toUpperCase(),
        );
        setDeptStudents(filteredStatic);
        setLoading(false);
      }
    }

    loadDeptStudents();
    return () => {
      isMounted = false;
    };
  }, [userDept]);

  // Dynamically filter students by Year, Section & Search Query
  const filteredStudents = useMemo(() => {
    return deptStudents.filter((s) => {
      if (selectedYear !== "ALL" && s.year !== selectedYear) return false;
      if (selectedSection !== "ALL" && s.section !== selectedSection) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesId = s.id.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      return true;
    });
  }, [deptStudents, selectedYear, selectedSection, searchQuery]);

  const handleResetFilters = () => {
    setSelectedYear("ALL");
    setSelectedSection("ALL");
    setSearchQuery("");
  };

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        <PageHeader
          title={`${userDept} Department Student Directory`}
          description={`Inspect enrolled ${userDept} students dynamically filtered by Academic Year, Section, and disciplinary records.`}
          breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Department Students" }]}
        />

        {/* Dynamic Filters Control Toolbar */}
        <section className="card-surface p-3.5 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-divider pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-primary shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                FILTER STUDENTS BY YEAR & SECTION
              </h3>
            </div>
            {(selectedYear !== "ALL" || selectedSection !== "ALL" || searchQuery.trim()) && (
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      {y === "ALL" ? "All Academic Years (1st-4th)" : y}
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
                      {sec === "ALL" ? "All Sections (Sec A, B, C)" : sec}
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
                  placeholder="Search by student name or roll no..."
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
            Loading {userDept} department student records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
            <Users className="size-8 mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">
              No {userDept} students found matching {selectedYear !== "ALL" ? selectedYear : ""}{" "}
              {selectedSection !== "ALL" ? selectedSection : ""}.
            </p>
            <p className="text-[11px]">Try clearing or changing your Year & Section filters.</p>
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
          /* Student Record Grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((s) => {
              // Count ONLY confirmed/pending violations for this specific student
              const confirmedCount = reports.filter(
                (r) =>
                  (r.studentId === s.id || r.studentId === s.name) &&
                  r.status !== "resolved" &&
                  r.status !== "Exonerated",
              ).length;

              return (
                <div
                  key={s.id}
                  className="card-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs space-y-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-base border border-primary/20">
                      {s.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{s.name}</h4>
                      <p className="text-xs font-semibold text-muted-foreground">{s.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-divider pt-3">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Department</span>
                      <span className="font-bold text-primary">{s.department}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Year / Sec</span>
                      <span className="font-bold text-foreground">
                        {s.year} &bull; {s.section}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Unauthorized Movements:
                    </span>
                    <span className="font-extrabold text-primary text-sm">{confirmedCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

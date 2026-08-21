import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Search, ShieldCheck, FileText, Info, Building2 } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { fetchStudentPermissions } from "@/lib/api/permissions.server";
import { getFacultyStudent } from "@/lib/api/faculty.server";
import type { DBPermission } from "@/lib/db/permissions.server";
import type { DBStudent } from "@/lib/db/students.server";

export const Route = createFileRoute("/faculty/passes")({
  head: () => ({ meta: [{ title: "Student Movement Status — Faculty Portal" }] }),
  component: FacultyPassesPage,
});

function FacultyPassesPage() {
  const { profile } = useAuth();
  const [searchCode, setSearchCode] = useState("23CSE1012");
  const [student, setStudent] = useState<DBStudent | null>(null);
  const [passes, setPasses] = useState<DBPermission[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setLoading(true);
    try {
      const studentRes = await getFacultyStudent({ data: { rollNo: cleanCode } });
      if (studentRes.success && studentRes.student) {
        setStudent(studentRes.student);
        const passRes = await fetchStudentPermissions({ data: { studentCode: cleanCode } });
        if (passRes.success) {
          setPasses(passRes.permissions);
        }
      } else {
        setStudent(null);
        setPasses([]);
        toast.error(`Student "${cleanCode}" not found in database.`);
      }
    } catch (err) {
      console.error("Pass lookup failed:", err);
      toast.error("Failed to query student pass database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch("23CSE1012");
  }, []);

  return (
    <RoleGuard allowedRoles={["faculty"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          title="Student Movement Status"
          description="Check real-time student movement permissions and gate passes for classroom and laboratory attendance."
          breadcrumb={[
            { label: "Faculty", to: "/faculty/dashboard" },
            { label: "Movement Status" },
          ]}
        />

        {/* Policy Notice Banner */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3 text-xs">
          <Info className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-foreground">HOD Authorization Policy Notice</p>
            <p className="text-muted-foreground">
              Official campus movement passes are submitted by students and centrally authorized by their respective <strong>Department HOD</strong>. Faculty can lookup approved passes to verify classroom absence legitimacy.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card-surface p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 w-full">
            <Input
              type="text"
              placeholder="Enter Student Roll No (e.g. 23CSE1012)..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(searchCode)}
              className="font-mono uppercase h-10 text-xs rounded-xl"
            />
            <Button
              variant="secondary"
              onClick={() => handleSearch(searchCode)}
              loading={loading}
              disabled={loading}
              className="h-10 px-5 rounded-xl text-xs font-bold shrink-0"
            >
              {!loading && <Search className="size-3.5 mr-1.5" />}
              {loading ? "Looking up..." : "Lookup Pass Status"}
            </Button>
          </div>
        </div>

        {/* Student Pass Details Card */}
        {student ? (
          <div className="card-surface p-6 rounded-2xl border border-border space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold text-foreground">{student.name}</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {student.student_code} &bull; {student.department} Department &bull; {student.year} (Section {student.section})
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {student.status}
              </span>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Movement Pass History ({passes.length})
            </h3>

            {passes.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {passes.map((pass) => {
                  const isApproved = pass.status.toLowerCase() === "approved";
                  const isPending = pass.status.toLowerCase() === "pending";

                  return (
                    <div
                      key={pass.id}
                      className={`rounded-xl border p-4 text-xs space-y-2 ${
                        isApproved
                          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                          : isPending
                            ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20"
                            : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <ShieldCheck className="size-4 text-primary" /> {pass.reason}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${
                            isApproved
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : isPending
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {pass.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3.5 text-primary" /> {pass.valid_from} &ndash; {pass.valid_until} ({pass.date})
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Authorized By: <strong className="text-foreground">{pass.issued_by}</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-border bg-muted/40 text-center text-xs text-muted-foreground">
                No movement passes found for {student.name}.
              </div>
            )}
          </div>
        ) : (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Search for a student roll number above to check movement pass authorization status.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}


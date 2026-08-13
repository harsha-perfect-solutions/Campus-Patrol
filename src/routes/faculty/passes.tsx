import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Search, ShieldCheck, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { fetchStudentPermissions, issueMovementPass } from "@/lib/api/permissions.server";
import { getFacultyStudent } from "@/lib/api/faculty.server";
import type { DBPermission } from "@/lib/db/permissions.server";
import type { DBStudent } from "@/lib/db/students.server";

export const Route = createFileRoute("/faculty/passes")({
  head: () => ({ meta: [{ title: "Movement Passes — Faculty Portal" }] }),
  component: FacultyPassesPage,
});

function FacultyPassesPage() {
  const { profile } = useAuth();
  const activeFacultyName = profile?.full_name || "Faculty Member";

  const [searchCode, setSearchCode] = useState("23CSE1012");
  const [student, setStudent] = useState<DBStudent | null>(null);
  const [passes, setPasses] = useState<DBPermission[]>([]);
  const [loading, setLoading] = useState(false);

  // New Pass Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [validFrom, setValidFrom] = useState("09:00");
  const [validUntil, setValidUntil] = useState("17:00");
  const [issuing, setIssuing] = useState(false);

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

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !reason.trim()) {
      toast.error("Please provide a valid reason.");
      return;
    }
    setIssuing(true);
    try {
      const res = await issueMovementPass({
        data: {
          studentCode: student.student_code,
          reason,
          validFrom,
          validUntil,
          issuedBy: activeFacultyName,
        },
      });

      if (res.success && res.permission) {
        toast.success(`Movement pass issued for ${student.name}`);
        setPasses((prev) => [res.permission!, ...prev]);
        setIsDialogOpen(false);
        setReason("");
      } else {
        toast.error(res.error || "Failed to issue movement pass.");
      }
    } catch (err) {
      console.error("Pass issue failed:", err);
      toast.error("Server error while issuing movement pass.");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="Movement Passes"
          description="View and issue official campus corridor and gate movement passes stored in PostgreSQL."
          breadcrumb={[
            { label: "Faculty", to: "/faculty/dashboard" },
            { label: "Movement Passes" },
          ]}
        />

        {/* Search Bar & Issue Pass Action */}
        <div className="card-surface p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <Input
              type="text"
              placeholder="Enter Student Roll No (e.g. 23CSE1012)..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(searchCode)}
              className="max-w-md font-mono uppercase"
            />
            <Button variant="secondary" onClick={() => handleSearch(searchCode)} disabled={loading}>
              <Search className="size-4 mr-1.5" /> Search Pass
            </Button>
          </div>

          {student && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="size-4 mr-1.5" /> Issue Movement Pass
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Issue Movement Pass — {student.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePass} className="space-y-4 pt-2">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      Roll No: <strong className="text-foreground">{student.student_code}</strong>
                    </p>
                    <p>
                      Department:{" "}
                      <strong className="text-foreground">
                        {student.department} • {student.year}
                      </strong>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Pass Reason / Destination</Label>
                    <Input
                      id="reason"
                      placeholder="e.g. Library Research / Medical Room / Gate Pass"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="from">Valid From</Label>
                      <Input
                        id="from"
                        type="time"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="until">Valid Until</Label>
                      <Input
                        id="until"
                        type="time"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={issuing}>
                    {issuing ? "Issuing Pass..." : "Confirm & Issue Pass"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Student Pass Details Card */}
        {student ? (
          <div className="card-surface p-6 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{student.name}</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {student.student_code} &bull; {student.department} &bull; {student.year} (
                  {student.section})
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {student.status}
              </span>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Issued Movement Passes ({passes.length})
            </h3>

            {passes.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {passes.map((pass) => (
                  <div
                    key={pass.id}
                    className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="size-4" /> {pass.reason}
                      </span>
                      <span className="text-[10px] uppercase font-bold">{pass.status}</span>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3.5" /> Time: {pass.valid_from} — {pass.valid_until} (
                      {pass.date})
                    </p>
                    <p className="text-muted-foreground text-[11px]">Issued by: {pass.issued_by}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-border bg-muted/40 text-center text-xs text-muted-foreground">
                No movement passes recorded for {student.name} in PostgreSQL.
              </div>
            )}
          </div>
        ) : (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Search for a student roll number above to view or issue movement passes.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

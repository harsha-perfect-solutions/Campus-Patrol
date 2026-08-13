import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
  getAdminPermissionsApi,
  createAdminPermissionApi,
  getAdminStudentsApi,
} from "@/lib/api/admin.server";
import type { DBPermission } from "@/lib/db/permissions.server";
import type { DBStudent } from "@/lib/db/students.server";

export const Route = createFileRoute("/admin/permissions")({
  head: () => ({ meta: [{ title: "Permission Policies — Admin Console" }] }),
  component: AdminPermissionsPage,
});

const REASONS = [
  "Library Pass",
  "Laboratory Pass",
  "Medical Pass",
  "HOD Official Duty Pass",
  "Placement Cell Pass",
  "NSS Duty Pass",
  "NCC Duty Pass",
  "Sports Pass",
  "Other Pass",
];

function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<DBPermission[]>([]);
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [studentCode, setStudentCode] = useState("23CSE1012");
  const [reason, setReason] = useState("Library Pass");
  const [validUntil, setValidUntil] = useState("12:00 PM");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [permRes, stRes] = await Promise.all([
          getAdminPermissionsApi(),
          getAdminStudentsApi(),
        ]);

        if (isMounted && permRes.success) setPermissions(permRes.permissions);
        if (isMounted && stRes.success) setStudents(stRes.students);
      } catch (err) {
        console.error("Failed to load permissions from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreatePerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) return;

    setSubmitting(true);
    try {
      const res = await createAdminPermissionApi({
        data: {
          studentCode,
          reason,
          validUntil,
        },
      });

      if (res.success && res.permission) {
        toast.success("Issued master movement permission pass!");
        setPermissions((prev) => [res.permission!, ...prev]);
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to issue movement permission pass.");
      }
    } catch (err) {
      console.error("Error issuing permission:", err);
      toast.error("Failed to record permission pass in database.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Gate & Movement Permission Policies"
          description="Master movement permission database, pass category rules, and active clearance records."
          breadcrumb={[
            { label: "Admin", to: "/admin/dashboard" },
            { label: "Permission Policies" },
          ]}
          actions={
            <Button
              onClick={() => setOpen(!open)}
              size="sm"
              className="rounded-xl font-semibold bg-primary text-primary-foreground"
            >
              <Plus className="size-4 mr-1.5" /> Issue Movement Pass
            </Button>
          }
        />

        {open && (
          <form
            onSubmit={handleCreatePerm}
            className="card-surface p-6 rounded-2xl border border-border shadow-xs max-w-xl space-y-4"
          >
            <h3 className="text-sm font-bold text-foreground">Issue Master Gate / Corridor Pass</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select value={studentCode} onValueChange={setStudentCode}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.student_code} value={s.student_code}>
                        {s.name} ({s.student_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <Label>Valid Until Time</Label>
              <Input
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <Button
              type="submit"
              loading={submitting}
              className="w-full h-9 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
            >
              Confirm & Save Permission
            </Button>
          </form>
        )}

        {/* Existing Permission Records Table */}
        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading movement permissions from database...
          </div>
        ) : (
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-divider text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Pass ID</th>
                  <th className="py-3 px-4">Student Code</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4">Issued By</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-medium">
                {permissions.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {String(p.id).slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">{p.student_code}</td>
                    <td className="py-3.5 px-4 font-semibold text-primary">{p.reason}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{p.valid_until}</td>
                    <td className="py-3.5 px-4 text-foreground">{p.issued_by}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

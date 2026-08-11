import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCmadms } from "@/lib/cmadms-store";
import type { MovementReason } from "@/lib/cmadms-data";

export const Route = createFileRoute("/admin/permissions")({
  head: () => ({ meta: [{ title: "Permission Policies — Admin Console" }] }),
  component: AdminPermissionsPage,
});

const REASONS: MovementReason[] = [
  "Library",
  "Laboratory",
  "Medical",
  "HOD Official Duty",
  "Placement",
  "NSS",
  "NCC",
  "Sports",
  "Other",
];

function AdminPermissionsPage() {
  const { permissions, addPermission, updatePermissionStatus, studentsList } = useCmadms();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("23CSE1044");
  const [reason, setReason] = useState<MovementReason>("Library");
  const [validUntil, setValidUntil] = useState("12:00 PM");

  const handleCreatePerm = (e: React.FormEvent) => {
    e.preventDefault();
    const st = studentsList.find((s) => s.id === studentId);
    if (!st) return;

    addPermission({
      studentId: st.id,
      studentName: st.name,
      reason,
      date: new Date().toISOString().split("T")[0] || "",
      validFrom: "10:00 AM",
      validUntil,
      status: "Approved",
      approvedBy: "System Admin",
    });

    toast.success(`Issued movement permission for ${st.name}`);
    setOpen(false);
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Gate & Movement Permission Policies"
          description="Master movement permission database, pass category rules, and active clearance records."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Permission Policies" }]}
          actions={
            <Button onClick={() => setOpen(!open)} size="sm" className="rounded-xl font-semibold bg-primary text-primary-foreground">
              <Plus className="size-4 mr-1.5" /> Issue Movement Pass
            </Button>
          }
        />

        {open && (
          <form onSubmit={handleCreatePerm} className="card-surface p-6 rounded-2xl border border-border shadow-xs max-w-xl space-y-4">
            <h3 className="text-sm font-bold text-foreground">Issue Master Gate / Corridor Pass</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as MovementReason)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r} Pass
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <Label>Valid Until Time</Label>
              <Input value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-9 text-xs rounded-xl" />
            </div>

            <Button type="submit" className="w-full h-9 rounded-xl text-xs font-semibold bg-primary text-primary-foreground">
              Confirm & Save Permission
            </Button>
          </form>
        )}

        {/* Existing Permission Records Table */}
        <div className="card-surface p-6 rounded-2xl border border-border shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-divider text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Pass ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Issued By</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider font-medium">
              {permissions.map((p) => (
                <tr key={p.id}>
                  <td className="py-3.5 px-4 font-bold text-foreground">{p.id}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">
                    {p.studentName} <span className="text-[11px] text-muted-foreground">({p.studentId})</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-primary">{p.reason}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{p.validUntil}</td>
                  <td className="py-3.5 px-4 text-foreground">{p.approvedBy}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGuard>
  );
}

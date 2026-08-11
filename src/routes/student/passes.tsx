import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";
import { permissionByStudent } from "@/lib/cmadms-data";

export const Route = createFileRoute("/student/passes")({
  head: () => ({ meta: [{ title: "My Movement Passes — Student Portal" }] }),
  component: StudentPassesPage,
});

function StudentPassesPage() {
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";
  const pass = permissionByStudent[rollNo];

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Movement Passes"
          description="View active and past campus corridor and gate movement passes issued to you."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "My Movement Passes" }]}
        />

        {pass ? (
          <div className="card-surface p-6 rounded-2xl border border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 max-w-lg space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
              <ShieldCheck className="size-5" />
              <span>ACTIVE MOVEMENT PASS</span>
            </div>
            <div className="text-xs space-y-1 text-foreground">
              <p>Reason: <strong className="font-bold">{pass.reason}</strong></p>
              <p>Issued by: {pass.issuedBy}</p>
              <p>Valid until: {pass.validUntil}</p>
            </div>
          </div>
        ) : (
          <div className="card-surface p-8 rounded-2xl border border-border text-center max-w-lg text-xs text-muted-foreground">
            No active movement passes found for roll number {rollNo}.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

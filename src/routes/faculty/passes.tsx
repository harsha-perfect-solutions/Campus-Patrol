import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Search, ShieldCheck } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { permissionByStudent, students } from "@/lib/cmadms-data";

export const Route = createFileRoute("/faculty/passes")({
  head: () => ({ meta: [{ title: "Movement Passes — Faculty Portal" }] }),
  component: FacultyPassesPage,
});

function FacultyPassesPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="Movement Passes"
          description="Read-only lookup of active movement permissions issued to students."
          breadcrumb={[{ label: "Faculty", to: "/faculty/dashboard" }, { label: "Movement Passes" }]}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => {
            const pass = permissionByStudent[s.id];
            return (
              <div key={s.id} className="card-surface p-5 rounded-2xl border border-border shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{s.name}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{s.id}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Department: <strong className="text-foreground">{s.department}</strong></p>
                  <p>Year: <strong className="text-foreground">{s.year} &bull; {s.section}</strong></p>
                </div>

                {pass ? (
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 block">Active Pass: {pass.reason}</span>
                    <p className="text-[11px] text-muted-foreground mt-1">Issued by: {pass.issuedBy}</p>
                    <p className="text-[11px] text-muted-foreground">Valid until: {pass.validUntil}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground text-center">
                    No active movement pass
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </RoleGuard>
  );
}

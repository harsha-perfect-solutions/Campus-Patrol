import { createFileRoute } from "@tanstack/react-router";
import { FolderGit2, ShieldCheck } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { useCmadms } from "@/lib/cmadms-store";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Admin Console" }] }),
  component: AdminAuditLogsPage,
});

function AdminAuditLogsPage() {
  const { auditLogs } = useCmadms();

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Global System Audit Logs"
          description="Append-only audit trail recording user verification, report submissions, HOD decisions, and system configuration events."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Audit Logs" }]}
        />

        <div className="card-surface p-6 rounded-2xl border border-border shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-divider text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider font-medium">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3.5 px-4 font-bold text-foreground">{log.id}</td>
                  <td className="py-3.5 px-4 text-foreground font-semibold">{log.actor}</td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-extrabold text-foreground uppercase">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-primary">{log.action}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{log.target}</td>
                  <td className="py-3.5 px-4 text-right text-subtle-foreground font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
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

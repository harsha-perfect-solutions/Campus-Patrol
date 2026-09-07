import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { getAdminAuditLogsApi } from "@/lib/api/admin.server";
import type { DBAuditLogRecord } from "@/lib/db/admin.server";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Admin Console" }] }),
  component: AdminAuditLogsPage,
});

function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<DBAuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadLogs() {
      try {
        const res = await getAdminAuditLogsApi();
        if (isMounted && res.success) {
          setLogs(res.auditLogs);
        }
      } catch (err) {
        console.error("Failed to load audit logs from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PageHeader
          title="Global System Audit Logs"
          description="Append-only audit trail recording user verification, report submissions, HOD decisions, and system configuration events."
          breadcrumb={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Audit Logs" }]}
        />

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading append-only audit trail from database...
          </div>
        ) : (
          <div className="card-surface p-4 sm:p-6 rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
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
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground font-mono text-[11px]">
                        {log.id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-semibold">{log.actor}</td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-extrabold text-foreground uppercase">
                          {log.actor_role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-primary">{log.action}</td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {log.target} ({log.target_id})
                      </td>
                      <td className="py-3.5 px-4 text-right text-subtle-foreground font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

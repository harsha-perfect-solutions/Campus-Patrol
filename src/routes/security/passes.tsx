import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Clock, Search, ShieldCheck, Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { getGatePassVerificationHistoryApi } from "@/lib/api/security.server";

export const Route = createFileRoute("/security/passes")({
  head: () => ({ meta: [{ title: "Verification History — Security Portal" }] }),
  component: SecurityPassesPage,
});

function SecurityPassesPage() {
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      try {
        const res = await getGatePassVerificationHistoryApi();
        if (isMounted && res.success && res.history) {
          setHistory(res.history);
        }
      } catch (err) {
        console.error("Failed to load gate pass verification history:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredHistory = history.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.passCode && p.passCode.toLowerCase().includes(q)) ||
      (p.studentName && p.studentName.toLowerCase().includes(q)) ||
      (p.studentCode && p.studentCode.toLowerCase().includes(q)) ||
      (p.checkpoint && p.checkpoint.toLowerCase().includes(q))
    );
  });

  return (
    <RoleGuard allowedRoles={["security"]}>
      <div className="space-y-6">
        <PageHeader
          title="Gate Pass Verification History"
          description="Log of all student gate pass verifications recorded server-side by Campus Security Officers."
          breadcrumb={[
            { label: "Security Portal", to: "/security/check" },
            { label: "Verification History" },
          ]}
        />

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search history by Pass Code, Student Name, Roll No, or Checkpoint..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl text-xs font-semibold"
            />
          </div>
        </div>

        {loading ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="size-6 text-primary animate-spin mx-auto" />
            <p>Loading gate verification history logs...</p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold text-left">
                    <th className="p-3.5">Verification Time</th>
                    <th className="p-3.5">Pass ID / Code</th>
                    <th className="p-3.5">Student Details</th>
                    <th className="p-3.5">Checkpoint</th>
                    <th className="p-3.5">Verified By</th>
                    <th className="p-3.5 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3.5 font-medium text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-primary shrink-0" />
                          <span>
                            {new Date(item.timestamp).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-primary whitespace-nowrap">
                        {item.passCode}
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-foreground">{item.studentName}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {item.studentCode} &bull; {item.department}
                        </p>
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">{item.checkpoint}</td>
                      <td className="p-3.5 text-muted-foreground">{item.officerName}</td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {item.authorized ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="size-3" />
                            <span>{item.resultStatus || "EXIT AUTHORIZED"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                            <XCircle className="size-3" />
                            <span>{item.resultStatus || "EXIT NOT AUTHORIZED"}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-surface p-8 rounded-2xl border border-border text-center max-w-xl mx-auto text-xs text-muted-foreground space-y-1">
            <ShieldCheck className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="font-bold text-foreground">No Verification Logs Found</p>
            <p>Gate pass verifications conducted by security officers will appear here.</p>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

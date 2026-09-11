import { createFileRoute } from "@tanstack/react-router";
import { User, Shield, Key, Mail, Building2, UserCheck, MapPin } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/security/profile")({
  head: () => ({ meta: [{ title: "Security Officer Profile — CMADMS" }] }),
  component: SecurityProfilePage,
});

function SecurityProfilePage() {
  const { profile } = useAuth();

  return (
    <RoleGuard allowedRoles={["security"]}>
      <div className="space-y-6">
        <PageHeader
          title="Security Officer Profile"
          description="Read-only identity, staff credentials, and gate checkpoint assignment."
          breadcrumb={[
            { label: "Security Portal", to: "/security/check" },
            { label: "Profile" },
          ]}
        />

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5 sm:space-y-6">
            <div className="flex items-center gap-3.5 sm:gap-4 border-b border-border pb-5 sm:pb-6">
              <div className="size-16 rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-300 grid place-items-center font-bold text-xl">
                SEC
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {profile?.full_name || "Campus Security Officer"}
                </h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                  ROLE: CAMPUS SECURITY OFFICER
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <Mail className="size-3.5" /> Email Address
                </span>
                <p className="font-semibold text-foreground">{profile?.email || "security@cmadms.edu"}</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <Key className="size-3.5" /> Staff Code / Security ID
                </span>
                <p className="font-mono font-bold text-primary">{profile?.staff_code || "SEC-101"}</p>
              </div>

              <div className="p-4 rounded-xl border-2 border-amber-400/50 bg-amber-500/5 space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <MapPin className="size-3.5 text-amber-500" /> Assigned Gate / Checkpoint
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/40">
                    GATE CHECKPOINT
                  </span>
                </div>
                <p className="font-bold text-foreground text-sm">{profile?.department || "Main Gate"}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  When you conduct student gate pass verifications, the checkpoint location defaults to your assigned post. Contact your administrator to update post assignment.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1 sm:col-span-2">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <UserCheck className="size-3.5" /> Account Status
                </span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">ACTIVE & VERIFIED</p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center border-t border-border pt-4">
              Identity fields are read-only and verified by Campus Administration.
            </p>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

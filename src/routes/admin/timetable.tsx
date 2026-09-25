import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  Building2,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Users,
  CheckCircle2,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/timetable")({
  head: () => ({ meta: [{ title: "Timetable Management — Shifted to HOD Portal" }] }),
  component: AdminTimetablePage,
});

function AdminTimetablePage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <PageHeader
          title="Timetable Management"
          description="Institutional timetable creation, slot modification, and faculty subject assignments have been shifted to the Department HOD Module."
          breadcrumb={[
            { label: "Admin Console", to: "/admin/dashboard" },
            { label: "Academic Management" },
            { label: "Timetable Delegation" },
          ]}
        />

        <div className="card-surface p-6 sm:p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-foreground">
                Decentralized Timetable Management Active
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                As per institutional governance policy, Heads of Department (HODs) now hold full autonomy and authority for creating, updating, allocating classrooms, and deleting timetable periods for their respective departments.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl border border-border/80 bg-background/80 space-y-1.5">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <CheckCircle2 className="size-4" />
                <span>HOD Slot Creation</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                HODs can create lecture, lab, library, and sports periods with auto-populated course catalogs.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-background/80 space-y-1.5">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <CheckCircle2 className="size-4" />
                <span>Live Grid Editing</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Click-to-edit slots, modify faculty in-charge, and reassign lecture halls in real-time.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-background/80 space-y-1.5">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <CheckCircle2 className="size-4" />
                <span>Institutional Prints</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                One-click official GMRIT/ADM format timetable generation with mentor signatures.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button variant="outline" asChild className="rounded-xl text-xs font-semibold w-full sm:w-auto">
              <Link to="/admin/dashboard">&larr; Return to Admin Dashboard</Link>
            </Button>

            <Button asChild className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto shadow-md">
              <Link to="/hod/timetable">
                <span>Go to HOD Timetable Module</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

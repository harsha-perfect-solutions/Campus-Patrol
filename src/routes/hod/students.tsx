import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, ShieldAlert, Users } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { students } from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";

export const Route = createFileRoute("/hod/students")({
  head: () => ({ meta: [{ title: "Department Students — HOD Portal" }] }),
  component: HODStudentsPage,
});

function HODStudentsPage() {
  const { reports } = useCmadms();
  const [selectedSem, setSelectedSem] = useState<number>(6);

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <div className="space-y-6">
        <PageHeader
          title="Department Student Records"
          description="View enrolled student profiles, current semester counts, and confirmed violation records."
          breadcrumb={[{ label: "HOD", to: "/hod/dashboard" }, { label: "Department Students" }]}
        />

        {/* Current Semester Selection Control */}
        <section className="card-surface p-5 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-indigo-600" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CURRENT SEMESTER RECORD</h3>
              <p className="text-sm font-semibold text-foreground">Select active semester for student discipline inspection:</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[9, 14, 16].map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSem(sem)}
                className={`size-10 rounded-xl font-extrabold text-xs transition-all ${
                  selectedSem === sem
                    ? "bg-indigo-600 text-white shadow-xs scale-105"
                    : "bg-muted border border-border text-foreground hover:bg-accent"
                }`}
              >
                [{sem}]
              </button>
            ))}
          </div>
        </section>

        {/* Student Record Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => {
            // Count ONLY confirmed/pending violations (exonerated cases excluded!)
            const confirmedCount = reports.filter(
              (r) => r.studentId === s.id && r.status !== "resolved"
            ).length;

            return (
              <div key={s.id} className="card-surface p-5 rounded-2xl border border-border shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-base border border-indigo-200/50">
                    {s.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{s.name}</h4>
                    <p className="text-xs font-semibold text-muted-foreground">{s.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-divider pt-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Department</span>
                    <span className="font-bold text-foreground">{s.department}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Year / Sec</span>
                    <span className="font-bold text-foreground">{s.year} &bull; {s.section}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Unauthorized Movements:</span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">
                    {confirmedCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </RoleGuard>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, ShieldCheck, User } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/profile")({
  head: () => ({ meta: [{ title: "My Profile & Digital ID — Student Portal" }] }),
  component: StudentProfilePage,
});

function StudentProfilePage() {
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";
  const name = profile?.full_name || "Meera Nair";

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Digital Profile & Student ID"
          description="Official student identity record & academic semester details."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "My Profile" }]}
        />

        <div className="card-surface p-6 rounded-2xl border border-border shadow-xs max-w-xl space-y-5">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary font-extrabold text-2xl border border-primary/20">
              MN
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">{name}</h2>
              <p className="text-sm font-semibold text-muted-foreground">{rollNo}</p>
              <span className="inline-block mt-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                Active Student
              </span>
            </div>
          </div>

          <dl className="divide-y divide-divider text-xs">
            {[
              ["Department", "Computer Science & Engineering"],
              ["Year / Section", "3rd Year • Section A"],
              ["Current Semester", "Semester 6"],
              ["Institutional Email", profile?.email || "student@cmadms.edu"],
              ["Gate Pass Status", "Authorized"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-bold text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </RoleGuard>
  );
}

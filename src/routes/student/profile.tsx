import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";
import { getMyStudentProfileApi } from "@/lib/api/student.server";
import type { DBStudent } from "@/lib/db/students.server";

export const Route = createFileRoute("/student/profile")({
  head: () => ({ meta: [{ title: "My Profile & Digital ID — Student Portal" }] }),
  component: StudentProfilePage,
});

function StudentProfilePage() {
  const { profile } = useAuth();
  const rollNo = profile?.student_code || "23CSE1044";

  const [studentData, setStudentData] = useState<{
    student: DBStudent | null;
    email?: string;
  }>({ student: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const res = await getMyStudentProfileApi();
        if (isMounted && res.success) {
          setStudentData({
            student: res.student,
            ...(res.email ? { email: res.email } : {}),
          });
        }
      } catch (err) {
        console.error("Failed to load student profile from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [rollNo]);

  const name = studentData.student?.name || profile?.full_name || "Meera Nair";
  const dept =
    studentData.student?.department || profile?.department || "Computer Science & Engineering";
  const year = studentData.student?.year || "3rd Year";
  const section = studentData.student?.section || "Section A";
  const sem = studentData.student?.semester
    ? `Semester ${studentData.student.semester}`
    : "Semester 6";
  const status = studentData.student?.status || "Active Student";
  const email = studentData.email || profile?.email || "student@cmadms.edu";

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Digital Profile & Student ID"
          description="Official student identity record & academic semester details."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "My Profile" }]}
        />

        {loading ? (
          <div className="card-surface p-8 rounded-2xl border border-border max-w-xl text-center text-xs text-muted-foreground">
            Loading student digital profile...
          </div>
        ) : (
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs max-w-xl space-y-5">
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary font-extrabold text-2xl border border-primary/20">
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div>
                <h2 className="text-xl font-bold text-foreground">{name}</h2>
                <p className="text-sm font-semibold text-muted-foreground">{rollNo}</p>
                <span className="inline-block mt-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                  {status}
                </span>
              </div>
            </div>

            <dl className="divide-y divide-divider text-xs">
              {[
                ["Department", dept],
                ["Year / Section", `${year} • ${section}`],
                ["Current Semester", sem],
                ["Institutional Email", email],
                ["Gate Pass Status", "Authorized"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-bold text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

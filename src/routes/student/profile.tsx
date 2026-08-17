import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";
import { getMyStudentProfileApi } from "@/lib/api/student.server";
import { QRCode } from "@/components/qr-code";
import type { DBStudent } from "@/lib/db/students.server";
import { ShieldCheck, GraduationCap } from "lucide-react";

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

  const name = studentData.student?.name || profile?.full_name || "Student User";
  const dept = studentData.student?.department || profile?.department || "CSE";
  const year = studentData.student?.year || "3rd Year";
  const section = studentData.student?.section || "A";
  const sem = studentData.student?.semester ? `Semester ${studentData.student.semester}` : "Semester 6";
  const status = studentData.student?.status || "Active Student";
  const email = studentData.email || profile?.email || "student@cmadms.edu";
  const qrToken = studentData.student?.qr_token || `CMADMS-ID-${rollNo}`;

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageHeader
          title="My Digital Profile & Student ID"
          description="Official CMADMS Digital Student Identity & Unified Verification QR."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "My Profile & ID" }]}
        />

        {loading ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            Loading student digital ID...
          </div>
        ) : (
          <div className="space-y-6">
            {/* DIGITAL STUDENT ID CARD */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-lg">
              {/* Card Header Banner */}
              <div className="flex items-center justify-between border-b border-primary/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
                    <GraduationCap className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black tracking-wider text-primary">CMADMS</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      DIGITAL STUDENT ID CARD
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3" />
                  <span>{status.toUpperCase()}</span>
                </span>
              </div>

              {/* Card Body Grid */}
              <div className="mt-6 flex flex-col md:flex-row items-center gap-6">
                {/* Student Avatar / Photo */}
                <div className="flex flex-col items-center">
                  {studentData.student?.photo_url ? (
                    <img
                      src={studentData.student.photo_url}
                      alt={name}
                      className="size-28 rounded-2xl object-cover border-2 border-primary/30 shadow-xs"
                    />
                  ) : (
                    <div className="size-28 rounded-2xl bg-primary/10 text-primary grid place-items-center font-extrabold text-3xl border-2 border-primary/30 shadow-xs">
                      {name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                  <span className="mt-2 font-mono font-bold text-xs text-primary">{rollNo}</span>
                </div>

                {/* Details Table */}
                <div className="flex-1 w-full space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-2xl bg-muted/40 border border-border">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground block">Full Name</span>
                      <span className="font-bold text-foreground">{name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground block">Roll Number</span>
                      <span className="font-bold font-mono text-primary">{rollNo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground block">Department</span>
                      <span className="font-bold text-foreground">{dept}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground block">Year / Section</span>
                      <span className="font-bold text-foreground">{year} • {section}</span>
                    </div>
                  </div>
                </div>

                {/* Unified Student QR Code */}
                <div className="flex flex-col items-center p-3 rounded-2xl bg-white/90 dark:bg-card border border-border shadow-xs">
                  <QRCode value={qrToken} size={110} />
                  <span className="mt-1.5 text-[9px] font-mono font-bold text-muted-foreground tracking-tighter">
                    STUDENT ID QR
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 border-t border-primary/20 pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Unified ID for Faculty Verification & Security Gate Exit</span>
                <span>{sem}</span>
              </div>
            </div>

            {/* Account Information Card */}
            <div className="card-surface p-6 rounded-2xl border border-border shadow-xs space-y-3 text-xs">
              <h4 className="font-bold text-foreground text-sm border-b border-border pb-2">
                Institutional Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-muted-foreground block">Institutional Email</span>
                  <span className="font-semibold text-foreground">{email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Opaque QR Token</span>
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground truncate block">
                    {qrToken}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

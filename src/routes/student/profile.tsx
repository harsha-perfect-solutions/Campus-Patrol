import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";
import { getMyStudentProfileApi } from "@/lib/api/student.server";
import { QRCode } from "@/components/qr-code";
import type { DBStudent } from "@/lib/db/students.server";
import {
  ShieldCheck,
  GraduationCap,
  QrCode as QrCodeIcon,
  User,
  Mail,
  Building2,
  Calendar,
  ArrowRight,
  FileText,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <div className="space-y-6 w-full">
        <PageHeader
          title="My Digital Profile & Student ID"
          description="Official CMADMS Digital Student Identity & Unified Verification QR."
          breadcrumb={[{ label: "Student", to: "/student/dashboard" }, { label: "My Profile & ID" }]}
        />

        {loading ? (
          <div className="card-surface p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground w-full">
            Loading student digital ID from database...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            {/* Left 2 Columns: Premium Digital Student ID Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/10 p-6 sm:p-8 shadow-md space-y-6">
                {/* Background Ambient Glow */}
                <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

                {/* Card Header Banner */}
                <div className="flex items-center justify-between border-b border-primary/20 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
                      <GraduationCap className="size-6" />
                    </span>
                    <div>
                      <h3 className="text-base font-black tracking-wider text-primary">CMADMS</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        DIGITAL STUDENT ID CARD
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="size-3.5" />
                    <span>{status.toUpperCase()}</span>
                  </span>
                </div>

                {/* Card Body Grid */}
                <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                  {/* Student Avatar / Photo */}
                  <div className="flex flex-col items-center shrink-0">
                    {studentData.student?.photo_url ? (
                      <img
                        src={studentData.student.photo_url}
                        alt={name}
                        className="size-32 rounded-2xl object-cover border-2 border-primary/30 shadow-xs"
                      />
                    ) : (
                      <div className="size-32 rounded-2xl bg-primary/10 text-primary grid place-items-center font-extrabold text-4xl border-2 border-primary/30 shadow-xs">
                        {name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                    <span className="mt-2.5 font-mono font-bold text-sm text-primary tracking-wider">{rollNo}</span>
                  </div>

                  {/* Student Profile Details */}
                  <div className="flex-1 w-full space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 rounded-2xl bg-muted/40 border border-border">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">Full Name</span>
                        <span className="font-bold text-foreground text-sm truncate block">{name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">Roll Number</span>
                        <span className="font-bold font-mono text-primary text-sm truncate block">{rollNo}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">Department</span>
                        <span className="font-bold text-foreground truncate block">{dept}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">Year / Section</span>
                        <span className="font-bold text-foreground truncate block">{year} • {section}</span>
                      </div>
                    </div>
                  </div>

                  {/* Unified Student QR Code */}
                  <div className="flex flex-col items-center p-4 rounded-2xl bg-white/95 dark:bg-card border border-border shadow-xs shrink-0">
                    <QRCode value={qrToken} size={125} />
                    <span className="mt-2 text-[10px] font-mono font-bold text-muted-foreground tracking-tight">
                      STUDENT VERIFICATION QR
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="border-t border-primary/20 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="size-3.5 text-primary shrink-0" />
                    Unified ID for Faculty Verification & Security Gate Exit
                  </span>
                  <span className="font-bold text-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border">
                    {sem}
                  </span>
                </div>
              </div>

              {/* QR Code Usage & Verification Protocol Card */}
              <div className="card-surface p-6 rounded-2xl border border-border space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <QrCodeIcon className="size-4 text-primary" />
                  <span>How to Use Your Digital ID QR</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your Digital Student ID QR code is cryptographically encoded for fast scanning. Present this QR code to:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-500" /> Faculty Verification
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Faculty members scan this QR code during class hours to verify your attendance & current schedule.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-500" /> Security Gate Exit
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Security officers scan this QR code at campus entry/exit gates to authorize movement pass validity.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Column: Institutional Details & Quick Actions */}
            <div className="space-y-6">
              {/* Institutional Details */}
              <div className="card-surface p-6 rounded-2xl border border-border space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Building2 className="size-4 text-primary" /> Institutional Details
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                    VERIFIED
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Mail className="size-3 text-primary" /> Institutional Email
                    </span>
                    <span className="font-bold text-foreground text-xs break-all block">{email}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <User className="size-3 text-primary" /> Student Roll Number
                    </span>
                    <span className="font-bold font-mono text-primary text-xs block">{rollNo}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3 text-primary" /> Department & Academic Term
                    </span>
                    <span className="font-bold text-foreground text-xs block">
                      {dept} • {year} ({sem})
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Lock className="size-3 text-primary" /> Opaque QR Security Token
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground break-all block">
                      {qrToken}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="card-surface p-6 rounded-2xl border border-border space-y-4">
                <h4 className="font-bold text-foreground text-sm border-b border-border pb-3">
                  Quick Access
                </h4>
                <div className="space-y-2.5">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-between h-10 rounded-xl text-xs font-semibold"
                  >
                    <Link to="/student/passes">
                      <span className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" /> My Movement Passes
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-between h-10 rounded-xl text-xs font-semibold"
                  >
                    <Link to="/student/explanations">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" /> Submit Case Explanation
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

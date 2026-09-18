import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Moon,
  ShieldCheck,
  Sun,
  User,
  KeyRound,
  Award,
  CheckCircle2,
  ChevronRight,
  Mail,
  Building2,
  Shield,
  GraduationCap,
  Sparkles,
  Smartphone,
  Lock,
  BadgeCheck,
  Laptop,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { faculty } from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { RoleGuard } from "@/components/role-guard";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CMADMS" },
      {
        name: "description",
        content: "Manage your profile, security, appearance, and notification preferences.",
      },
    ],
  }),
  component: ProtectedSettingsPage,
});

function ProtectedSettingsPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod", "security", "student", "admin"]}>
      <SettingsPage />
    </RoleGuard>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  description,
  badge,
  children,
}: {
  title: string;
  icon: typeof User;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface rounded-2xl border border-border overflow-hidden shadow-xs">
      <div className="flex items-center justify-between border-b border-divider px-4 py-3.5 sm:px-5 sm:py-4 bg-muted/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
            <p className="text-[11px] text-muted-foreground truncate">{description}</p>
          </div>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useCmadms();
  const { profile, role } = useAuth();
  const [changePassOpen, setChangePassOpen] = useState(false);

  // Form states
  const fullName = profile?.full_name || (role === "admin" ? "System Administrator" : role === "student" ? "Ashok Dora" : faculty.name);
  const userCode = profile?.staff_code || profile?.student_code || (role === "admin" ? "ADM-001" : role === "student" ? "23CSE1012" : faculty.id);
  const email = profile?.email || `${(userCode || "user").toLowerCase()}@campusguard.edu`;
  const dept = profile?.department || faculty.department || "General";
  const post = profile?.assigned_post || "Main Campus Gate #1";

  const isFacultyRole = role === "faculty";
  const isHodRole = role === "hod";
  const isStudentRole = role === "student";
  const isSecurityRole = role === "security";
  const isAdminRole = role === "admin";

  const roleDisplayTitle =
    role === "admin"
      ? "System Administrator"
      : role === "hod"
      ? `HOD — ${dept}`
      : role === "faculty"
      ? "Faculty & NSS Coordinator"
      : role === "security"
      ? "Security Guard"
      : "Student";

  const coordinatorRole = faculty.coordinatorRole || "NSS Co-ordinator";
  const clubName = faculty.club || "National Service Scheme (NSS)";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Profile & Settings"
        description="Manage your institutional profile, appearance, security, and alert preferences."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "System" }, { label: "Settings" }]}
      />

      {/* Role Profile Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="grid size-12 sm:size-14 shrink-0 place-items-center rounded-2xl bg-primary text-white font-semibold text-base sm:text-lg shadow-sm">
              {fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">{fullName}</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 uppercase tracking-wider">
                  <BadgeCheck className="size-3" />
                  {roleDisplayTitle}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {userCode} &bull; {email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setChangePassOpen(true)}
              className="rounded-xl text-xs font-semibold gap-1.5 bg-card/80 shadow-2xs h-9"
            >
              <KeyRound className="size-3.5 text-primary" />
              <span>Change Password</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Details Section */}
        <SettingsSection
          title="Official Identity"
          icon={User}
          description="Verified academic credentials & profile details"
          badge={role?.toUpperCase() || "STAFF"}
        >
          <div className="space-y-3.5">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                Full Name
              </Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="name"
                  defaultValue={fullName}
                  className="pl-9 h-10 text-xs font-semibold rounded-xl bg-muted/20 border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="uid" className="text-xs font-semibold text-foreground">
                  {isStudentRole ? "Roll Number" : "Staff / User Code"}
                </Label>
                <div className="relative mt-1">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="uid"
                    defaultValue={userCode}
                    readOnly
                    className="pl-9 h-10 text-xs font-mono font-bold rounded-xl bg-muted/50 border-border cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dept" className="text-xs font-semibold text-foreground">
                  Department
                </Label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="dept"
                    defaultValue={dept}
                    className="pl-9 h-10 text-xs font-semibold rounded-xl bg-muted/20 border-border"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                Institutional Email
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="email"
                  defaultValue={email}
                  readOnly
                  className="pl-9 h-10 text-xs font-mono rounded-xl bg-muted/50 border-border cursor-not-allowed"
                />
              </div>
            </div>

            {isSecurityRole && (
              <div>
                <Label htmlFor="post" className="text-xs font-semibold text-foreground">
                  Assigned Security Checkpoint
                </Label>
                <div className="relative mt-1">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="post"
                    defaultValue={post}
                    className="pl-9 h-10 text-xs font-semibold rounded-xl bg-muted/20 border-border"
                  />
                </div>
              </div>
            )}

            {/* Special Faculty Coordinator Badge */}
            {(isFacultyRole || isHodRole) && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground">Co-ordinator Role</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                    <CheckCircle2 className="size-3" /> {coordinatorRole}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Assigned to <strong className="text-foreground">{clubName}</strong> for student attendance permissions and volunteer management.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-8 text-xs font-semibold w-full justify-between bg-card hover:bg-accent border-primary/20 rounded-lg mt-1"
                >
                  <Link to="/faculty/clubs" search={{ tab: "members" }}>
                    <span>Manage Club Events & Permissions</span>
                    <ChevronRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            <Button
              type="button"
              onClick={() => toast.success("Profile preferences updated successfully.")}
              className="w-full sm:w-auto rounded-xl text-xs font-bold bg-primary text-primary-foreground h-9 shadow-xs"
            >
              Save Profile Changes
            </Button>
          </div>
        </SettingsSection>

        {/* Right Column: Preferences & Security */}
        <div className="space-y-6">
          {/* Appearance Preference */}
          <SettingsSection
            title="Appearance & Theme"
            icon={theme === "dark" ? Moon : Sun}
            description="Interface color mode preference"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Dark Mode</p>
                <p className="text-[11px] text-muted-foreground">
                  Reduce eye strain during evening rounds or low-light campus shifts.
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                aria-label="Toggle dark mode"
              />
            </div>
          </SettingsSection>

          {/* Role-tailored Notifications Preferences */}
          <SettingsSection
            title="Notification Alerts"
            icon={Bell}
            description="Control real-time push and email notifications"
          >
            <div className="space-y-3 divide-y divide-border/60">
              {isStudentRole ? (
                <>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <p className="text-xs font-bold text-foreground">Disciplinary Incident Reports</p>
                      <p className="text-[11px] text-muted-foreground">Immediate alerts when reported outside class</p>
                    </div>
                    <Switch defaultChecked aria-label="Incident alerts" />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Movement Pass Approvals</p>
                      <p className="text-[11px] text-muted-foreground">Notifications when your out-pass is approved by HOD</p>
                    </div>
                    <Switch defaultChecked aria-label="Pass approval alerts" />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Club & Event Permissions</p>
                      <p className="text-[11px] text-muted-foreground">Updates on duty leave & event participation</p>
                    </div>
                    <Switch defaultChecked aria-label="Club alerts" />
                  </div>
                </>
              ) : isSecurityRole ? (
                <>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <p className="text-xs font-bold text-foreground">Gate Clearance Approvals</p>
                      <p className="text-[11px] text-muted-foreground">Real-time alerts when students are authorized for exit</p>
                    </div>
                    <Switch defaultChecked aria-label="Gate alerts" />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Emergency Security Alarms</p>
                      <p className="text-[11px] text-muted-foreground">High-priority siren sound and visual banner</p>
                    </div>
                    <Switch defaultChecked aria-label="Emergency alerts" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <p className="text-xs font-bold text-foreground">Case Status & Explanations</p>
                      <p className="text-[11px] text-muted-foreground">When a student submits an explanation statement</p>
                    </div>
                    <Switch defaultChecked aria-label="Explanation alerts" />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Department Escalations</p>
                      <p className="text-[11px] text-muted-foreground">When high-severity incidents require HOD review</p>
                    </div>
                    <Switch defaultChecked aria-label="Escalation alerts" />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Pass Approval Requests</p>
                      <p className="text-[11px] text-muted-foreground">New student out-pass requests awaiting authorization</p>
                    </div>
                    <Switch defaultChecked aria-label="Pass requests alerts" />
                  </div>
                </>
              )}
            </div>
          </SettingsSection>

          {/* Account Security Card */}
          <SettingsSection
            title="Account Security"
            icon={KeyRound}
            description="Manage authentication & access credentials"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <Lock className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">Password Authentication</p>
                  <p className="text-[11px] text-muted-foreground">Last updated recently</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangePassOpen(true)}
                className="rounded-xl text-xs font-semibold gap-1.5 bg-card hover:bg-accent border-border"
              >
                <KeyRound className="size-3.5 text-primary" />
                <span>Update Password</span>
              </Button>
            </div>
          </SettingsSection>
        </div>
      </div>

      <ChangePasswordDialog open={changePassOpen} onOpenChange={setChangePassOpen} />
    </div>
  );
}


import { useState, useEffect } from "react";
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
  Send,
  Server,
  Loader2,
  AlertCircle,
  ExternalLink,
  Check,
  Phone,
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
import { ChangePasswordDialog, type DialogMode } from "@/components/change-password-dialog";
import { getSmtpStatusApi, sendTestOtpEmailApi } from "@/lib/api/auth.server";
import { cn, isValidPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

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
  const [dialogInitialMode, setDialogInitialMode] = useState<DialogMode>("change");

  const handleOpenUpdatePassword = () => {
    setDialogInitialMode("change");
    setChangePassOpen(true);
  };

  const handleOpenForgotPassword = () => {
    setDialogInitialMode("forgot_email");
    setChangePassOpen(true);
  };

  // SMTP Gmail state
  const [smtpStatus, setSmtpStatus] = useState<{
    configured: boolean;
    senderEmail: string;
    host: string;
    isGmail: boolean;
  } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTestOtp, setSendingTestOtp] = useState(false);
  const [testOtpResult, setTestOtpResult] = useState<{ success: boolean; message: string; otp?: string | null | undefined } | null>(null);

  useEffect(() => {
    getSmtpStatusApi()
      .then((res) => {
        setSmtpStatus(res);
      })
      .catch(() => {});
  }, []);

  const handleSendTestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = testEmailAddress.trim() || email;
    if (!target) {
      toast.error("Please enter a valid email address to test.");
      return;
    }
    setSendingTestOtp(true);
    setTestOtpResult(null);
    try {
      const res = await sendTestOtpEmailApi({ data: { email: target } });
      if (res.success) {
        if (res.simulated) {
          toast.info(`Simulated OTP [${res.otp}] logged (SMTP_PASS not active in .env)`);
          setTestOtpResult({
            success: true,
            message: `Simulated OTP code [${res.otp}] logged to server terminal. To receive real emails in your inbox, configure your 16-character Gmail App Password in .env.`,
            otp: res.otp,
          });
        } else {
          toast.success(`Live test OTP verification code sent to ${target}!`);
          setTestOtpResult({
            success: true,
            message: `Real verification OTP successfully dispatched to ${target}! Check your inbox/spam folder for the 6-digit OTP email.`,
            otp: res.otp,
          });
        }
      } else {
        toast.error(res.error || "Failed to send test OTP email.");
        setTestOtpResult({
          success: false,
          message: res.error || "Failed to send email. Check your Gmail App Password credentials in .env.",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Error dispatching test OTP.");
      setTestOtpResult({
        success: false,
        message: err?.message || "Connection error during SMTP dispatch.",
      });
    } finally {
      setSendingTestOtp(false);
    }
  };

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

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
                  Contact Mobile Number (10 Digits)
                </Label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  10 Digits (+91)
                </span>
              </div>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground select-none">
                  +91
                </span>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  defaultValue={normalizePhoneNumber((profile as any)?.phone || "9876543210")}
                  className="pl-12 h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
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
            <div className="space-y-3">
              {/* Row 1: Update Password */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <Lock className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Password Authentication</p>
                    <p className="text-[11px] text-muted-foreground">Change password using your current password</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenUpdatePassword}
                  className="rounded-xl text-xs font-semibold gap-1.5 bg-card hover:bg-accent border-primary/40 text-primary shrink-0"
                >
                  <KeyRound className="size-3.5 text-primary" />
                  <span>Update Password</span>
                </Button>
              </div>

              {/* Row 2: Forgot Password */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Password Reset & Recovery</p>
                    <p className="text-[11px] text-muted-foreground">Forgot password? Reset securely using email OTP verification</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenForgotPassword}
                  className="rounded-xl text-xs font-semibold gap-1.5 bg-card hover:bg-accent border-border text-foreground shrink-0"
                >
                  <Mail className="size-3.5 text-primary" />
                  <span>Forgot Password</span>
                </Button>
              </div>
            </div>
          </SettingsSection>

          {/* Institutional SMTP & Gmail Mailer Verification Card (Admin Only) */}
          {isAdminRole && (
            <SettingsSection
              title="Institutional Gmail & SMTP Mailer"
              icon={Server}
              description="OTP verification, automated credentials, and live alert dispatch"
              badge={smtpStatus?.configured ? "LIVE SMTP ACTIVE" : "SIMULATED FALLBACK"}
            >
              <div className="space-y-4">
                {/* Status Header */}
                <div className={cn(
                  "p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs",
                  smtpStatus?.configured
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                )}>
                  <div className="flex items-start sm:items-center gap-2.5">
                    {smtpStatus?.configured ? (
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <div>
                      <p className="font-bold">
                        {smtpStatus?.configured
                          ? "Real Gmail SMTP Mailer Connected & Active"
                          : "Safe Local Simulation Mode Active"}
                      </p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        {smtpStatus?.configured
                          ? `Sending official institutional OTP & credentials from ${smtpStatus.senderEmail || "configured sender"}`
                          : "Emails and OTPs are safely logged in the server terminal until SMTP_USER and SMTP_PASS are set in .env."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider",
                      smtpStatus?.configured
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    )}>
                      {smtpStatus?.isGmail ? "Google Gmail" : "Custom SMTP"}
                    </span>
                  </div>
                </div>

                {/* Test Live OTP Dispatch Form */}
                <form onSubmit={handleSendTestOtp} className="space-y-3 p-3.5 sm:p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="text-xs font-bold text-foreground">Live SMTP / OTP Verification Test</Label>
                      <p className="text-[11px] text-muted-foreground">Send a real 6-digit OTP verification code to any email address to verify delivery</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="email"
                      placeholder={`Enter recipient email (default: ${email})`}
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background"
                    />
                    <Button
                      type="submit"
                      disabled={sendingTestOtp}
                      className="h-10 px-4 text-xs font-bold rounded-xl gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {sendingTestOtp ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                      {sendingTestOtp ? "Sending OTP..." : "Send Test OTP"}
                    </Button>
                  </div>

                  {testOtpResult && (
                    <div className={cn(
                      "p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all",
                      testOtpResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
                    )}>
                      {testOtpResult.success ? (
                        <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold">{testOtpResult.message}</p>
                        {testOtpResult.otp && (
                          <p className="font-mono font-bold text-sm mt-1">Generated OTP: {testOtpResult.otp}</p>
                        )}
                      </div>
                    </div>
                  )}
                </form>

                {/* Setup Guide for Gmail */}
                <div className="p-3.5 rounded-xl border border-border bg-card text-xs space-y-2">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-primary" /> How to enable Real Gmail SMTP delivery in `.env`:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                    <li>Go to your Google Account at <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5">Google Security <ExternalLink className="size-2.5" /></a> and ensure <strong>2-Step Verification</strong> is turned ON.</li>
                    <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5">App Passwords <ExternalLink className="size-2.5" /></a>.</li>
                    <li>Type <code className="px-1 py-0.5 rounded bg-muted font-bold text-foreground">CMADMS</code> in the app name box and click <strong>Create</strong>.</li>
                    <li>Google will give you a 16-character code (e.g. <code className="px-1 py-0.5 rounded bg-muted font-bold text-foreground">xxxx xxxx xxxx xxxx</code>).</li>
                    <li>In your project root <code className="px-1 py-0.5 rounded bg-muted font-bold text-foreground">.env</code> file, set:
                      <pre className="mt-1 p-2 rounded-lg bg-slate-950 text-emerald-400 font-mono text-[10px] overflow-x-auto">
                        SMTP_HOST="smtp.gmail.com"&#10;SMTP_PORT=587&#10;SMTP_USER="your-email@gmail.com"&#10;SMTP_PASS="your-16-char-app-password"
                      </pre>
                    </li>
                  </ol>
                </div>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>

      <ChangePasswordDialog
        open={changePassOpen}
        onOpenChange={setChangePassOpen}
        initialMode={dialogInitialMode}
      />
    </div>
  );
}


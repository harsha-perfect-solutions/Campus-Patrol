import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  GraduationCap,
  Shield,
  Landmark,
  UserRound,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  ArrowRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth, type AppRole } from "@/lib/auth";
import { changeInitialPasswordApi } from "@/lib/api/auth.server";
import { getDefaultDashboardForRole } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — CMADMS Portal" },
      {
        name: "description",
        content:
          "Sign in to CMADMS to verify student movement, report violations or submit an explanation.",
      },
      { property: "og:title", content: "Sign in — CMADMS" },
      { property: "og:description", content: "Access the CMADMS campus discipline portal." },
    ],
  }),
  component: AuthPage,
});

type RoleOption = {
  id: AppRole;
  label: string;
  subtitle: string;
  icon: typeof GraduationCap;
  demoEmail: string;
  placeholder: string;
};

const ROLES: RoleOption[] = [
  {
    id: "faculty",
    label: "Faculty",
    subtitle: "Class Verification",
    icon: GraduationCap,
    demoEmail: "faculty@cmadms.edu",
    placeholder: "Enter your email or roll number",
  },
  {
    id: "security",
    label: "Security",
    subtitle: "Gate Checkpoint",
    icon: Shield,
    demoEmail: "security@cmadms.edu",
    placeholder: "Enter your email or guard ID",
  },
  {
    id: "hod",
    label: "HOD",
    subtitle: "Department Authority",
    icon: Landmark,
    demoEmail: "hod.cse@cmadms.edu",
    placeholder: "Enter your email",
  },
  {
    id: "student",
    label: "Student",
    subtitle: "Pass Request & Cases",
    icon: UserRound,
    demoEmail: "student@cmadms.edu",
    placeholder: "Enter your email or roll number",
  },
  {
    id: "admin",
    label: "Admin",
    subtitle: "System Governance",
    icon: Settings,
    demoEmail: "admin@cmadms.edu",
    placeholder: "Enter your email",
  },
];

const DEFAULT_ROLE: RoleOption = ROLES[0]!;

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const [selectedRole, setSelectedRole] = useState<AppRole>("faculty");
  const [email, setEmail] = useState("faculty@cmadms.edu");
  const [password, setPassword] = useState("Password123!");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // First-Login Password Change State (for onboarding users with default passwords)
  const [mustChangePasswordModalOpen, setMustChangePasswordModalOpen] = useState(false);
  const [pendingUserRole, setPendingUserRole] = useState<AppRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const activeRoleConfig = ROLES.find((r) => r.id === selectedRole) || DEFAULT_ROLE;

  const handleRoleSelect = (roleId: AppRole) => {
    setSelectedRole(roleId);
    const config = ROLES.find((r) => r.id === roleId) || DEFAULT_ROLE;
    setEmail(config.demoEmail);
    setPassword("Password123!");
    setErrorMessage(null);
  };

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your university email or roll number.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setErrorMessage(null);
    setBusy(true);

    try {
      const res = await signIn(email.trim(), password);
      if (res.success && res.role) {
        // Validate selected portal tab against authenticated user's actual server role
        if (selectedRole && res.role !== selectedRole) {
          toast.info(`Signed in. Redirecting to your assigned ${res.role.toUpperCase()} portal.`);
        }

        if (res.mustChangePassword) {
          toast.info("First login detected. Please update your initial default password.");
          setPendingUserRole(res.role);
          setMustChangePasswordModalOpen(true);
          return;
        }

        toast.success("Authentication successful");
        const targetUrl = search.redirect || getDefaultDashboardForRole(res.role);
        try {
          await navigate({ to: targetUrl as any });
        } catch {
          window.location.href = targetUrl;
        }
      } else {
        setErrorMessage(res.error || "Authentication failed.");
        toast.error(res.error || "Authentication failed.");
      }
    } catch {
      setErrorMessage("System error during sign in.");
      toast.error("System error during sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleInitialPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordChangeError(null);

    if (!newPassword || newPassword.length < 8) {
      setPasswordChangeError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changeInitialPasswordApi({ data: { newPassword } });
      if (res.success) {
        toast.success("Initial password updated successfully!");
        setMustChangePasswordModalOpen(false);
        const roleToUse = pendingUserRole || selectedRole;
        const targetUrl = search.redirect || getDefaultDashboardForRole(roleToUse);
        try {
          await navigate({ to: targetUrl as any });
        } catch {
          window.location.href = targetUrl;
        }
      } else {
        const err = res.error || "Failed to update password. Please try again.";
        setPasswordChangeError(err);
        toast.error(err);
      }
    } catch (err: any) {
      setPasswordChangeError(err.message || "Failed to execute password update.");
      toast.error("Password update error.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDemoLogin(demoRole: AppRole) {
    setSelectedRole(demoRole);
    setErrorMessage(null);
    setBusy(true);

    const config = ROLES.find((r) => r.id === demoRole) || DEFAULT_ROLE;
    setEmail(config.demoEmail);
    setPassword("Password123!");

    try {
      const res = await signIn(config.demoEmail, "Password123!");
      if (res.success && res.role) {
        toast.success(`Signed in as ${res.role.toUpperCase()}`);

        const targetUrl = search.redirect || getDefaultDashboardForRole(res.role);
        try {
          await navigate({ to: targetUrl as any });
        } catch {
          window.location.href = targetUrl;
        }
      } else {
        const err = res.error || `Failed to sign in as demo ${demoRole}.`;
        setErrorMessage(err);
        toast.error(err);
      }
    } catch {
      toast.error("Demo login error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-[100svh] w-full overflow-y-auto relative flex items-center justify-center py-6 px-3 sm:px-4 lg:px-6 bg-cover bg-center bg-no-repeat selection:bg-primary/20 selection:text-primary box-border"
      style={{ backgroundImage: "url('/campus-bg.jpg')" }}
    >
      {/* Executive Slate/Navy Tinted Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/65 via-slate-900/50 to-blue-950/65 backdrop-blur-[3px] pointer-events-none auth-bg-fade" />

      {/* Decorative Vector Geometric Patterns */}
      <div className="absolute -left-16 -top-16 size-72 rounded-full border-[28px] border-primary/15 pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-16 -bottom-16 size-80 rounded-full border-[36px] border-primary/15 pointer-events-none" />
      <div className="absolute right-12 top-10 size-12 rounded-full border-2 border-primary/25 pointer-events-none hidden sm:block" />

      {/* FLOATING GLASS CONTAINER */}
      <div className="relative z-10 w-[min(520px,calc(100vw-24px))] my-auto bg-card/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[24px] sm:rounded-[28px] border border-border shadow-2xl p-4 sm:p-6 space-y-3 sm:space-y-3.5 box-border auth-card-entrance">
        
        {/* BRAND HEADER & LOGO */}
        <div className="text-center">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 mx-auto transition-transform duration-200 hover:scale-[1.03]">
            <ShieldCheck className="size-6 stroke-[2.2]" />
          </div>
          
          <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-foreground leading-none">
            CMADMS
          </h1>
          <h2 className="mt-1 text-xs sm:text-sm font-bold text-muted-foreground">
            Campus Movement Portal
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            Secure access to your campus management portal
          </p>

          {/* Graduation Cap Divider Line */}
          <div className="flex items-center justify-center gap-2.5 my-2.5">
            <div className="h-px bg-divider flex-1" />
            <span className="grid size-5.5 place-items-center rounded-full bg-primary/10 text-primary border border-primary/20">
              <GraduationCap className="size-3" />
            </span>
            <div className="h-px bg-divider flex-1" />
          </div>
        </div>

        {/* ROLE SELECTOR TABS ("Select Your Portal") */}
        <div>
          <Label className="text-[11px] font-bold text-foreground mb-1.5 block">
            Select Your Portal
          </Label>

          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Portal Role">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              const RoleIcon = role.icon;
              return (
                <button
                  key={role.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleRoleSelect(role.id)}
                  className={cn(
                    "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-bold"
                      : "bg-muted/60 border border-border text-foreground hover:bg-muted"
                  )}
                >
                  <RoleIcon className={cn("size-3.5 shrink-0", isSelected ? "text-primary-foreground" : "text-primary")} />
                  <span className="truncate text-[10px] sm:text-xs">{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AUTHENTICATION FORM */}
        <form onSubmit={handleSignIn} className="space-y-3">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-[11px] font-medium text-destructive flex items-center gap-2">
              <span className="size-3.5 shrink-0 rounded-full bg-destructive text-destructive-foreground grid place-items-center font-bold text-[9px]">
                !
              </span>
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          {/* Email / Roll Number Field */}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[11px] font-bold text-foreground">
              University Email or Roll Number
            </Label>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-primary/70 pointer-events-none" />
              <Input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={activeRoleConfig.placeholder}
                className="h-10 pl-9 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary font-medium transition-colors duration-150"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <Label htmlFor="password" className="text-[11px] font-bold text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-primary/70 pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your password"
                className="h-10 pl-9 pr-9 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary font-medium transition-colors duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 transition-colors duration-150"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between pt-0.5 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium text-foreground">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                className="size-3.5 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors duration-150"
              />
              <span>Remember me</span>
            </label>

            <Link
              to="/reset-password"
              className="font-bold text-primary hover:underline transition-colors duration-150"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-10 sm:h-10.5 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 gap-2 transition-all duration-150 ease-in-out active:scale-[0.99] flex items-center justify-center mt-1"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Signing in to Portal...</span>
              </>
            ) : (
              <>
                <Lock className="size-3.5" />
                <span>Sign in to Portal</span>
                <ArrowRight className="size-3.5 opacity-80" />
              </>
            )}
          </Button>
        </form>

        {/* OR DIVIDER */}
        <div className="relative text-center my-1.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative px-2.5 py-0.5 text-[10px] font-bold text-primary bg-primary/10 rounded-full border border-primary/20">
            or
          </span>
        </div>

        {/* QUICK DEMO ACCESS */}
        <div>
          <div className="text-center mb-1.5">
            <h3 className="text-[11px] font-bold text-foreground">Quick Demo Access</h3>
            <p className="text-[10px] text-muted-foreground">
              Explore the portal with demo credentials
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {ROLES.map((role) => {
              const RoleIcon = role.icon;
              return (
                <button
                  key={role.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handleDemoLogin(role.id)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] sm:text-[10px] font-semibold bg-card border border-border text-foreground hover:bg-muted shadow-2xs transition-all duration-150 ease-in-out active:scale-[0.98]"
                >
                  <RoleIcon className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER & SECURITY INFO */}
        <div className="pt-2.5 border-t border-border space-y-1 text-center text-[10px] sm:text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-medium">
            <span className="flex items-center gap-1 text-foreground font-semibold">
              <ShieldCheck className="size-3 text-primary" /> Secure Role-Based Access
            </span>
            <span className="text-border">|</span>
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span className="text-border">|</span>
            <a href="#" className="hover:underline">Terms of Use</a>
          </div>

          <p className="text-[9.5px] text-muted-foreground/80">
            © 2026 CMADMS • Campus Movement & Administration Digital Management System
          </p>
        </div>

      </div>

      {/* FIRST LOGIN PASSWORD CHANGE MODAL */}
      {mustChangePasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card dark:bg-slate-900 border border-border rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-4 text-foreground animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto">
                <Lock className="size-6 stroke-[2.2]" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                First-Login Password Update Required
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As a security policy for newly onboarded accounts, please update your initial default password to a new secure password before continuing.
              </p>
            </div>

            <form onSubmit={handleInitialPasswordChange} className="space-y-3 pt-2">
              {passwordChangeError && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs font-medium text-destructive flex items-center gap-2">
                  <span className="size-4 shrink-0 rounded-full bg-destructive text-destructive-foreground grid place-items-center font-bold text-[10px]">
                    !
                  </span>
                  <span>{passwordChangeError}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="newPassword" className="text-xs font-bold text-foreground">
                  New Secure Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 8 chars)"
                  className="h-10 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-xs font-bold text-foreground">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-10 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={changingPassword}
                className="w-full h-10 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2 flex items-center justify-center mt-3"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>Update Password & Continue</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



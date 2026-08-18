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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRoleConfig = ROLES.find((r) => r.id === selectedRole) || DEFAULT_ROLE;

  const goHome = (targetRole?: AppRole) => {
    if (search.redirect) {
      navigate({ to: search.redirect as any });
      return;
    }
    const dashboard = getDefaultDashboardForRole(targetRole || null);
    navigate({ to: dashboard as any });
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
        toast.success(`Signed in successfully as ${res.role.toUpperCase()}`);
        goHome(res.role);
      } else {
        const err = res.error || "Invalid credentials. Please try again.";
        setErrorMessage(err);
        toast.error(err);
      }
    } catch {
      const err = "Authentication failed. Please check your server connection.";
      setErrorMessage(err);
      toast.error(err);
    } finally {
      setBusy(false);
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
        goHome(res.role);
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
      className="h-[100svh] min-h-[100svh] w-full overflow-hidden relative flex items-center justify-center p-3 sm:p-4 lg:p-6 bg-cover bg-center bg-no-repeat selection:bg-purple-500/20 selection:text-purple-900 box-border"
      style={{ backgroundImage: "url('/campus-bg.jpg')" }}
    >
      {/* Soft Purple/Lavender Tinted Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-300/35 via-purple-100/25 to-indigo-300/35 backdrop-blur-[2px] pointer-events-none auth-bg-fade" />

      {/* Decorative Vector Geometric Patterns */}
      <div className="absolute -left-16 -top-16 size-72 rounded-full border-[28px] border-purple-400/20 pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 size-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-16 -bottom-16 size-80 rounded-full border-[36px] border-purple-400/20 pointer-events-none" />
      <div className="absolute right-12 top-10 size-12 rounded-full border-2 border-purple-400/30 pointer-events-none hidden sm:block" />

      {/* FLOATING WHITE GLASS CONTAINER */}
      <div className="relative z-10 w-[min(520px,calc(100vw-24px))] max-h-[calc(100svh-24px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[24px] sm:rounded-[28px] border border-white/80 dark:border-purple-900/40 shadow-[0_20px_50px_rgba(107,33,168,0.18)] p-4 sm:p-6 space-y-3 sm:space-y-3.5 box-border overflow-y-auto sm:overflow-y-visible auth-card-entrance">
        
        {/* BRAND HEADER & LOGO */}
        <div className="text-center">
          <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 mx-auto transition-transform duration-200 hover:scale-[1.03]">
            <ShieldCheck className="size-6 stroke-[2.2]" />
          </div>
          
          <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-purple-950 dark:text-white leading-none">
            CMADMS
          </h1>
          <h2 className="mt-1 text-xs sm:text-sm font-bold text-purple-900/80 dark:text-purple-200">
            Campus Movement Portal
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Secure access to your campus management portal
          </p>

          {/* Graduation Cap Divider Line */}
          <div className="flex items-center justify-center gap-2.5 my-2.5">
            <div className="h-px bg-purple-100 dark:bg-purple-900/50 flex-1" />
            <span className="grid size-5.5 place-items-center rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">
              <GraduationCap className="size-3" />
            </span>
            <div className="h-px bg-purple-100 dark:bg-purple-900/50 flex-1" />
          </div>
        </div>

        {/* ROLE SELECTOR TABS ("Select Your Portal") */}
        <div>
          <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1.5 block">
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
                  onClick={() => {
                    setSelectedRole(role.id);
                    setErrorMessage(null);
                  }}
                  className={cn(
                    "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-purple-600",
                    isSelected
                      ? "bg-purple-700 text-white shadow-md shadow-purple-700/25 font-bold"
                      : "bg-slate-50/80 dark:bg-slate-800/60 border border-purple-100/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-purple-50/60"
                  )}
                >
                  <RoleIcon className={cn("size-3.5 shrink-0", isSelected ? "text-white" : "text-purple-600 dark:text-purple-400")} />
                  <span className="truncate text-[10px] sm:text-xs">{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AUTHENTICATION FORM */}
        <form onSubmit={handleSignIn} className="space-y-3">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-[11px] font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <span className="size-3.5 shrink-0 rounded-full bg-red-200 text-red-800 grid place-items-center font-bold text-[9px]">
                !
              </span>
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          {/* Email / Roll Number Field */}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              University Email or Roll Number
            </Label>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-purple-600/70 pointer-events-none" />
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
                className="h-10 pl-9 rounded-xl bg-slate-50/60 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-purple-600 font-medium transition-colors duration-150"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <Label htmlFor="password" className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-purple-600/70 pointer-events-none" />
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
                className="h-10 pl-9 pr-9 rounded-xl bg-slate-50/60 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-purple-600 font-medium transition-colors duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-colors duration-150"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between pt-0.5 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium text-slate-700 dark:text-slate-300">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                className="size-3.5 rounded-md border-purple-300 data-[state=checked]:bg-purple-700 data-[state=checked]:border-purple-700 transition-colors duration-150"
              />
              <span>Remember me</span>
            </label>

            <Link
              to="/reset-password"
              className="font-semibold text-purple-700 dark:text-purple-300 hover:underline transition-colors duration-150"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-10 sm:h-10.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-md shadow-purple-700/25 gap-2 transition-all duration-150 ease-in-out active:scale-[0.99] flex items-center justify-center mt-1"
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
            <div className="w-full border-t border-purple-100 dark:border-slate-800" />
          </div>
          <span className="relative px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 rounded-full border border-purple-200/70 dark:border-purple-800">
            or
          </span>
        </div>

        {/* QUICK DEMO ACCESS */}
        <div>
          <div className="text-center mb-1.5">
            <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Quick Demo Access</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Explore the portal with demo credentials
            </p>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {ROLES.map((role) => {
              const RoleIcon = role.icon;
              return (
                <button
                  key={role.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handleDemoLogin(role.id)}
                  className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[10px] font-semibold bg-white dark:bg-slate-800/80 border border-purple-200/70 dark:border-slate-700 text-purple-900 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/60 shadow-2xs transition-all duration-150 ease-in-out active:scale-[0.98]"
                >
                  <RoleIcon className="size-3 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="truncate">{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER & SECURITY INFO */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-center text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-medium">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <ShieldCheck className="size-3 text-purple-600" /> Secure Role-Based Access
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <a href="#" className="hover:underline">Terms of Use</a>
          </div>

          <p className="text-[9.5px] text-slate-400">
            © 2026 CMADMS • Campus Movement & Administration Digital Management System
          </p>
        </div>

      </div>
    </div>
  );
}



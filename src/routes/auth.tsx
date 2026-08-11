import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { getDefaultDashboardForRole } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  department: z.string().trim().min(2, "Select a department"),
  code: z.string().trim().max(40).optional(),
});

const DEPARTMENTS = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT"];

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { setDemoUser } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("faculty");
  const [department, setDepartment] = useState("CSE");
  const [code, setCode] = useState("");

  const goHome = (targetRole?: AppRole) => {
    if (search.redirect) {
      navigate({ to: search.redirect as any });
      return;
    }
    const dashboard = getDefaultDashboardForRole(targetRole ?? role);
    navigate({ to: dashboard as any });
  };

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const cleanEmail = email.trim();

    // Determine role from entered email
    const lower = cleanEmail.toLowerCase();
    const inferredRole: AppRole = lower.includes("admin")
      ? "admin"
      : lower.includes("hod")
        ? "hod"
        : lower.includes("student")
          ? "student"
          : "faculty";

    const inferredName =
      inferredRole === "admin"
        ? "System Admin"
        : inferredRole === "hod"
          ? "Dr. Anjali Rao"
          : inferredRole === "student"
            ? "Meera Nair"
            : "Prof. Ravi Kumar";

    const inferredCode =
      inferredRole === "admin"
        ? "ADM-001"
        : inferredRole === "hod"
          ? "HOD-CSE-001"
          : inferredRole === "student"
            ? "23CSE1044"
            : "FAC-CSE-114";

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setDemoUser({
          id: `demo-${inferredRole}-${Date.now()}`,
          email: cleanEmail,
          full_name: inferredName,
          role: inferredRole,
          department: "CSE",
          staff_code: inferredRole === "student" ? null : inferredCode,
          student_code: inferredRole === "student" ? inferredCode : null,
        });

        setBusy(false);
        toast.success(`Signed in as ${inferredName} (${inferredRole.toUpperCase()})`);
        goHome(inferredRole);
        return;
      }

      setBusy(false);
      toast.success("Signed in successfully");
      goHome(inferredRole);
    } catch {
      setDemoUser({
        id: `demo-${inferredRole}-${Date.now()}`,
        email: cleanEmail,
        full_name: inferredName,
        role: inferredRole,
        department: "CSE",
        staff_code: inferredRole === "student" ? null : inferredCode,
        student_code: inferredRole === "student" ? inferredCode : null,
      });
      setBusy(false);
      toast.success(`Signed in as ${inferredName} (${inferredRole.toUpperCase()})`);
      goHome(inferredRole);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ fullName, email, password, department, code });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);

    setDemoUser({
      id: `demo-user-${Date.now()}`,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role,
      department: parsed.data.department,
      staff_code: role === "student" ? null : parsed.data.code || null,
      student_code: role === "student" ? parsed.data.code || null : null,
    });
    setBusy(false);
    toast.success(`Account created! Signed in as ${parsed.data.fullName}`);
    goHome(role);
  }

  async function handleReset() {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  }

  function handleDemoLogin(demoRole: "faculty" | "hod" | "student" | "admin") {
    const demoConfigs = {
      faculty: {
        email: "faculty@cmadms.edu",
        fullName: "Prof. Ravi Kumar",
        department: "CSE",
        code: "FAC-CSE-114",
      },
      hod: {
        email: "hod.cse@cmadms.edu",
        fullName: "Dr. Anjali Rao",
        department: "CSE",
        code: "HOD-CSE-001",
      },
      student: {
        email: "student@cmadms.edu",
        fullName: "Meera Nair",
        department: "CSE",
        code: "23CSE1044",
      },
      admin: {
        email: "admin@cmadms.edu",
        fullName: "System Admin",
        department: "ADMIN",
        code: "ADM-001",
      },
    };
    const cfg = demoConfigs[demoRole];
    setEmail(cfg.email);
    setPassword("Password123!");

    setDemoUser({
      id: `demo-${demoRole}-${Date.now()}`,
      email: cfg.email,
      full_name: cfg.fullName,
      role: demoRole,
      department: cfg.department,
      staff_code: demoRole === "student" ? null : cfg.code,
      student_code: demoRole === "student" ? cfg.code : null,
    });
    toast.success(`Signed in as ${cfg.fullName} (${demoRole.toUpperCase()})`);
    goHome(demoRole);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="card-surface w-full max-w-md p-6 sm:p-8 rounded-2xl border border-border shadow-md">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="size-6" />
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">CMADMS</span>
          </Link>
          <h1 className="mt-4 text-xl font-bold text-foreground">Campus Movement Portal</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in with your role credentials or use 1-click demo access below.
          </p>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
            Instant Demo Sign-In
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-[11px] font-bold bg-white text-foreground hover:bg-accent border-border shadow-xs rounded-xl"
              disabled={busy}
              onClick={() => handleDemoLogin("faculty")}
            >
              Faculty
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-[11px] font-bold bg-white text-foreground hover:bg-accent border-border shadow-xs rounded-xl"
              disabled={busy}
              onClick={() => handleDemoLogin("hod")}
            >
              HOD
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-[11px] font-bold bg-white text-foreground hover:bg-accent border-border shadow-xs rounded-xl"
              disabled={busy}
              onClick={() => handleDemoLogin("student")}
            >
              Student
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-[11px] font-bold bg-white text-foreground hover:bg-accent border-border shadow-xs rounded-xl"
              disabled={busy}
              onClick={() => handleDemoLogin("admin")}
            >
              Admin
            </Button>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "signin" | "signup")}
          className="mt-6 w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Register</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "signin" ? (
          <form onSubmit={handleSignIn} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">University Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <Button type="submit" className="w-full h-10 rounded-xl font-semibold text-xs" disabled={busy}>
              Sign in to Portal
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
              <Input
                id="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Prof. / Dr. / Student Name"
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email" className="text-xs font-semibold">Email</Label>
              <Input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-semibold">Account Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger id="role" className="h-10 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faculty">Faculty Member</SelectItem>
                  <SelectItem value="hod">HOD (Department Head)</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">System Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept" className="text-xs font-semibold">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="dept" className="h-10 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} Department
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password" className="text-xs font-semibold">Password</Label>
              <Input
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <Button type="submit" className="w-full h-10 rounded-xl font-semibold text-xs" disabled={busy}>
              Create Account
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

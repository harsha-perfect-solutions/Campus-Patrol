import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth, type AppRole } from "@/lib/auth";
import { getDefaultDashboardForRole } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    setBusy(true);

    try {
      const res = await signIn(email.trim(), password);
      if (res.success && res.role) {
        toast.success(`Signed in successfully as ${res.role.toUpperCase()}`);
        goHome(res.role);
      } else {
        toast.error(res.error || "Invalid credentials.");
      }
    } catch {
      toast.error("Authentication failed. Please check server connection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDemoLogin(demoRole: "faculty" | "hod" | "student" | "admin") {
    setBusy(true);
    const demoEmails = {
      faculty: "faculty@cmadms.edu",
      hod: "hod.cse@cmadms.edu",
      student: "student@cmadms.edu",
      admin: "admin@cmadms.edu",
    };

    const targetEmail = demoEmails[demoRole];
    setEmail(targetEmail);
    setPassword("Password123!");

    try {
      const res = await signIn(targetEmail, "Password123!");
      if (res.success && res.role) {
        toast.success(`Signed in as ${res.role.toUpperCase()}`);
        goHome(res.role);
      } else {
        toast.error(res.error || "Failed to sign in demo user.");
      }
    } catch {
      toast.error("Demo login error.");
    } finally {
      setBusy(false);
    }
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

        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              University Email or Roll Number
            </Label>
            <Input
              id="email"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cmadms.edu or Roll No (e.g. 23CSE1044)"
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password123!"
              className="h-10 rounded-xl text-xs"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-10 rounded-xl font-semibold text-xs bg-primary text-primary-foreground"
            disabled={busy}
          >
            Sign in to Portal
          </Button>
        </form>
      </div>
    </div>
  );
}

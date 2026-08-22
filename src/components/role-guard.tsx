import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { getDefaultDashboardForRole, normalizeRole } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[];
  children: ReactNode;
}) {
  const { role, session, loading } = useAuth();
  const navigate = useNavigate();

  const userRole = role ? normalizeRole(role) : null;
  const targetRoles = allowedRoles.map(normalizeRole);
  const isAllowed = userRole ? targetRoles.includes(userRole) : false;

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" as any });
      return;
    }

    if (!loading && session && userRole && !isAllowed) {
      const target = getDefaultDashboardForRole(userRole);
      navigate({ to: target as any });
    }
  }, [loading, session, userRole, isAllowed, navigate]);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Verifying role permissions...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6 space-y-3">
        <div className="grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 mb-2">
          <ShieldAlert className="size-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">401 — Authentication Required</h2>
        <p className="text-xs text-muted-foreground max-w-md">
          Please sign in to your CMADMS account to access this portal route.
        </p>
        <Button onClick={() => navigate({ to: "/auth" as any })} className="rounded-xl text-xs font-semibold">
          Sign In to CMADMS
        </Button>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
        <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="size-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">403 — Access Forbidden</h2>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
          Your account role (
          <strong className="uppercase text-foreground">{userRole ?? "Guest"}</strong>) does not have
          authorization to access this portal route.
        </p>
        <Button
          onClick={() => navigate({ to: getDefaultDashboardForRole(userRole) as any })}
          className="mt-6 rounded-xl font-semibold text-xs"
        >
          Return to My Role Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

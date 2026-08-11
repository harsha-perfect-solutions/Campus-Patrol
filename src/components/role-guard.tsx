import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { getDefaultDashboardForRole } from "@/lib/permissions";
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

  const isAllowed = role ? allowedRoles.includes(role) : false;

  useEffect(() => {
    if (!loading && session && role && !isAllowed) {
      const target = getDefaultDashboardForRole(role);
      navigate({ to: target as any });
    }
  }, [loading, session, role, isAllowed, navigate]);

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

  if (!isAllowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
        <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="size-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">403 — Access Forbidden</h2>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
          Your account role (<strong className="uppercase text-foreground">{role ?? "Guest"}</strong>) does not have authorization to access this portal route.
        </p>
        <Button
          onClick={() => navigate({ to: getDefaultDashboardForRole(role) as any })}
          className="mt-6 rounded-xl font-semibold text-xs"
        >
          Return to My Role Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

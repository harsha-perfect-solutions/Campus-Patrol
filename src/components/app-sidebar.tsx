import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/check?view=students", label: "Students", icon: User },
  { to: "/check", label: "Verification", icon: Shield },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/timetable", label: "Schedule", icon: Calendar },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  collapsed,
  onNavigate,
  mobile = false,
  onClose,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { unreadCount } = useCmadms();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const isCollapsed = collapsed && !mobile;

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "flex h-full flex-col bg-card border-r border-border text-foreground transition-[width] duration-200",
          isCollapsed ? "w-[76px]" : "w-[240px]",
        )}
      >
        {/* Sidebar Top Brand Header */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between border-b border-border px-4",
            isCollapsed && "justify-center px-0",
          )}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight text-primary">CMADMS</span>
            )}
          </Link>
          {mobile && (
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-3 py-5">
          {navItems.map((item) => {
            const active =
              item.label === "Students"
                ? pathname === "/check" && searchStr.includes("view=students")
                : item.label === "Verification"
                  ? pathname === "/check" && !searchStr.includes("view=students")
                  : item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
            const badge = item.to === "/notifications" && unreadCount > 0 ? unreadCount : null;

            const link = (
              <Link
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors duration-150",
                  active
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isCollapsed && "justify-center px-0",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {!isCollapsed && badge && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {badge}
                  </span>
                )}
              </Link>
            );

            return (
              <div key={item.label}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Help & Logout Section */}
        <div className="border-t border-border p-3 space-y-1">
          <button
            type="button"
            onClick={() => navigate({ to: "/settings" })}
            className={cn(
              "flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              isCollapsed && "justify-center px-0",
            )}
          >
            <HelpCircle className="size-4 text-muted-foreground shrink-0" />
            {!isCollapsed && <span>Help</span>}
          </button>

          <button
            type="button"
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className={cn(
              "flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
              isCollapsed && "justify-center px-0",
            )}
          >
            <LogOut className="size-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

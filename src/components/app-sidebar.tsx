import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { faculty } from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const groups = [
  {
    label: "Main",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Verification",
    items: [{ to: "/check", label: "Check Student", icon: Search }],
  },
  {
    label: "Reporting",
    items: [
      { to: "/violations", label: "Reported Violations", icon: AlertTriangle },
      { to: "/reports", label: "My Reports", icon: FileText },
    ],
  },
  {
    label: "Academic",
    items: [{ to: "/timetable", label: "My Timetable", icon: CalendarDays }],
  },
  {
    label: "System",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
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
  const isCollapsed = collapsed && !mobile;

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
          isCollapsed ? "w-[76px]" : "w-[262px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4",
            isCollapsed && "justify-center px-0",
          )}
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-wide">CMADMS</p>
              <p className="truncate text-[11px] text-sidebar-muted">Faculty Portal</p>
            </div>
          )}
          {mobile && (
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="grid size-9 place-items-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.label}>
              {!isCollapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  const badge = item.to === "/notifications" && unreadCount > 0 ? unreadCount : null;
                  const link = (
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
                        active
                          ? "bg-sidebar-active text-sidebar-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]"
                          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                        isCollapsed && "justify-center px-0",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <item.icon className="size-[18px] shrink-0" aria-hidden />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                      {!isCollapsed && badge && (
                        <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );

                  return (
                    <li key={item.to}>
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-2 py-2",
              isCollapsed && "justify-center px-0",
            )}
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-hover text-xs font-semibold">
              {faculty.initials}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{faculty.name}</p>
                <p className="truncate text-[11px] text-sidebar-muted">{faculty.id}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            className={cn(
              "mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground",
              isCollapsed && "justify-center px-0",
            )}
            aria-label="Log out"
          >
            <LogOut className="size-[18px] shrink-0" aria-hidden />
            {!isCollapsed && "Logout"}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

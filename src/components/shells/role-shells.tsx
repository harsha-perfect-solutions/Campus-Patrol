import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  FileText,
  FolderGit2,
  GraduationCap,
  HelpCircle,
  Home,
  Key,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserCog,
  UserSearch,
  Users,
  X,
  Settings,
  User,
  Shield,
  Search,
  Ticket,
  Building,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { useEffect } from "react";
import { getUnreadNotificationCountApi } from "@/lib/api/notifications.server";

import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

function useUnreadCount() {
  const { unreadCount } = useRealtimeNotifications();
  return unreadCount;
}

/* ==========================================================================
   FACULTY SIDEBAR & SHELL
   ========================================================================== */

const facultyNavGroups = [
  {
    category: "OPERATIONS",
    items: [
      { to: "/faculty/dashboard", label: "Dashboard", icon: Home },
      { to: "/faculty/check", label: "Verify Student", icon: UserSearch },
      { to: "/faculty/reports", label: "My Reports", icon: BarChart2 },
    ],
  },
  {
    category: "MY RESPONSIBILITIES",
    items: [
      {
        label: "COUNSELOR",
        icon: UserCheck,
        badgeBg: "bg-slate-700 text-white dark:bg-slate-600",
        cardBg: "bg-slate-100/80 border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700/60",
        textColor: "text-slate-800 dark:text-slate-200",
        lineColor: "border-slate-300 dark:border-slate-700",
        dotColor: "bg-slate-500 dark:bg-slate-400",
        activeBg: "bg-blue-100/90 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-bold",
        subItems: [
          { to: "/faculty/counselor", label: "Violation Cases", icon: ShieldAlert },
          { to: "/faculty/counselor?tab=passes", label: "Pass Approvals", icon: CheckCircle2 },
          { to: "/faculty/counselor?tab=students", label: "Assigned Students", icon: Users },
        ],
      },
      {
        label: "CLUB COORDINATOR",
        icon: Users,
        badgeBg: "bg-slate-700 text-white dark:bg-slate-600",
        cardBg: "bg-slate-100/80 border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700/60",
        textColor: "text-slate-800 dark:text-slate-200",
        lineColor: "border-slate-300 dark:border-slate-700",
        dotColor: "bg-slate-500 dark:bg-slate-400",
        activeBg: "bg-blue-100/90 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-bold",
        subItems: [
          { to: "/faculty/clubs", label: "My Club", icon: Building },
          { to: "/faculty/clubs?tab=events", label: "Events", icon: Calendar },
          { to: "/faculty/clubs?tab=permissions", label: "Give Permission", icon: Ticket },
        ],
      },
    ],
  },
  {
    category: "SYSTEM",
    items: [
      { to: "/faculty/settings", label: "Settings", icon: Settings },
      { action: "signOut", label: "Sign out", icon: LogOut },
    ],
  },
];

function FacultySidebarNavItem({
  item,
  pathname,
  unreadCount,
  onSelect,
  onSignOut,
}: {
  item: any;
  pathname: string;
  unreadCount: number;
  onSelect?: () => void;
  onSignOut?: () => void;
}) {
  const fullPath = pathname + (typeof window !== "undefined" ? window.location.search : "");

  if (item.action === "signOut") {
    return (
      <button
        type="button"
        onClick={() => {
          if (onSelect) onSelect();
          if (onSignOut) onSignOut();
        }}
        className="flex min-h-[38px] w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
      >
        <item.icon className="size-4 shrink-0 text-slate-500 hover:text-destructive" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  if (item.subItems) {
    const isGroupActive = item.subItems.some((sub: any) => {
      if (sub.to.includes("?")) {
        return fullPath === sub.to;
      }
      return pathname === sub.to && !fullPath.includes("?tab=");
    });

    const [expanded, setExpanded] = useState(isGroupActive);

    return (
      <div className="my-1.5 space-y-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs",
            item.cardBg
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className={cn("grid size-6 place-items-center rounded-lg text-white shadow-xs shrink-0", item.badgeBg)}>
              <item.icon className="size-3.5" />
            </span>
            <span className={cn("tracking-wide font-extrabold uppercase truncate text-[11px]", item.textColor)}>
              {item.label}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform duration-200",
              item.textColor,
              expanded ? "rotate-180" : "rotate-0"
            )}
          />
        </button>

        {expanded && (
          <div className={cn("relative ml-5 pl-3.5 pb-1 pt-1 border-l-2 space-y-1.5", item.lineColor)}>
            {item.subItems.map((sub: any) => {
              const active = sub.to.includes("?")
                ? fullPath === sub.to
                : pathname === sub.to && !fullPath.includes("?tab=");

              return (
                <Link
                  key={sub.to}
                  to={sub.to as any}
                  onClick={onSelect}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? item.activeBg
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <span className={cn("absolute -left-[19px] size-2 rounded-full ring-2 ring-background", item.dotColor)} />
                  <sub.icon className="size-3.5 shrink-0 opacity-80" />
                  <span className="truncate">{sub.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const active =
    item.to && item.to.includes("?")
      ? fullPath === item.to
      : pathname === item.to || (pathname.startsWith(`${item.to}/`) && !fullPath.includes("?tab="));

  const badge = item.to && item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;

  return (
    <Link
      to={(item.to || "#") as any}
      onClick={onSelect}
      className={cn(
        "relative flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold transition-all",
        active
          ? "bg-blue-100/90 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-bold border-l-4 border-blue-600 shadow-2xs"
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
      )}
    >
      <item.icon className={cn("size-4 shrink-0", active ? "text-blue-600 dark:text-blue-400" : "text-slate-500")} />
      <span className="truncate">{item.label}</span>
      {badge && (
        <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function FacultyShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unreadCount = useUnreadCount();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    void signOut().then(() => navigate({ to: "/auth" }));
  };

  const activeName = profile?.full_name || "Prof. Ravi Kumar";
  const initials = activeName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col justify-between border-r border-border bg-card transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">CMADMS</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Faculty Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {facultyNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => (
                <FacultySidebarNavItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  unreadCount={unreadCount}
                  onSelect={() => setMobileOpen(false)}
                  onSignOut={handleSignOut}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50/80 dark:bg-slate-800/60 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-blue-100 dark:border-slate-700/60">
            <GraduationCap className="size-4 text-blue-600 shrink-0" />
            <span>Safe Campus &bull; Responsible Tomorrow</span>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">CMADMS</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Faculty Portal</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {facultyNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => (
                <FacultySidebarNavItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  unreadCount={unreadCount}
                  onSignOut={handleSignOut}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50/80 dark:bg-slate-800/60 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-blue-100 dark:border-slate-700/60">
            <GraduationCap className="size-4 text-blue-600 shrink-0" />
            <span>Safe Campus &bull; Responsible Tomorrow</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="text-xs font-bold text-foreground leading-snug">
              <span className="sm:hidden">Faculty Portal</span>
              <span className="hidden sm:inline">Faculty Portal &bull; Academic Oversight</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell role="faculty" />
            <Link
              to="/faculty/settings"
              title="View Profile & Settings"
              className="flex items-center gap-2 rounded-full p-0.5 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <span className="grid size-7 sm:size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                {initials}
              </span>
              <span className="hidden text-xs font-semibold text-foreground sm:inline hover:underline">
                {activeName}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-20 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-15 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/faculty/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname === "/faculty/dashboard" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/faculty/check"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/faculty/check") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <UserSearch className="size-5 mb-0.5" />
          <span>Verify</span>
        </Link>
        <Link
          to="/faculty/timetable"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/faculty/timetable") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Calendar className="size-5 mb-0.5" />
          <span>Schedule</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="size-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}

/* ==========================================================================
   HOD SIDEBAR & SHELL
   ========================================================================== */

const hodNavGroups = [
  {
    category: "Department Safety",
    items: [
      { to: "/hod/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/hod/safety-analytics", label: "Safety Analytics", icon: BarChart2 },
      { to: "/hod/violations", label: "Violations & Cases", icon: ShieldAlert },
      { to: "/hod/passes", label: "Movement Passes", icon: CheckCircle2 },
      { to: "/hod/cases", label: "Reviews & Hearings", icon: FileText },
    ],
  },
  {
    category: "Academic Administration",
    items: [
      { to: "/hod/students", label: "Department Students", icon: GraduationCap },
      { to: "/hod/department", label: "Department Structure", icon: Building2 },
      { to: "/hod/timetable", label: "Department Timetable", icon: Calendar },
    ],
  },
  {
    category: "System",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/hod/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function HODShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unreadCount = useUnreadCount();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const activeName = profile?.full_name || "Department HOD";
  const activeDept = profile?.department || "General";
  const initials = activeName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col justify-between border-r border-border bg-card transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground">HOD Portal ({activeDept})</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {hodNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">HOD Portal ({activeDept})</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {hodNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className={cn(
                      "flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="text-xs font-bold text-foreground leading-snug">
              <span className="sm:hidden">HOD Office &bull; {activeDept}</span>
              <span className="hidden sm:inline">HOD Office &bull; {activeDept} Department</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell role="hod" />
            <Link
              to="/hod/settings"
              title="View Profile & Settings"
              className="flex items-center gap-2 rounded-full p-0.5 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <span className="grid size-7 sm:size-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {initials}
              </span>
              <span className="hidden text-xs font-semibold text-foreground sm:inline hover:underline">
                {activeName}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-20 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-15 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/hod/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname === "/hod/dashboard" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/hod/violations"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/hod/violations") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldAlert className="size-5 mb-0.5" />
          <span>Incidents</span>
        </Link>
        <Link
          to="/hod/passes"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/hod/passes") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CheckCircle2 className="size-5 mb-0.5" />
          <span>Passes</span>
        </Link>
        <Link
          to="/hod/students"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/hod/students") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <GraduationCap className="size-5 mb-0.5" />
          <span>Students</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="size-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}

/* ==========================================================================
   STUDENT SIDEBAR & SHELL
   ========================================================================== */

const studentNavGroups = [
  {
    category: "My Campus Life",
    items: [
      { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/student/profile", label: "My Profile & ID", icon: User },
      { to: "/student/timetable", label: "My Timetable", icon: Calendar },
      { to: "/student/passes", label: "My Movement Passes", icon: CheckCircle2 },
      { to: "/student/event-permissions", label: "Event Permissions", icon: CheckCircle2 },
    ],
  },
  {
    category: "Disciplinary & Case Response",
    items: [
      { to: "/student/violations", label: "My Incidents", icon: ShieldAlert },
      { to: "/student/explanations", label: "Submit Explanation", icon: FileText },
    ],
  },
  {
    category: "Account",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/student/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function StudentShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unreadCount = useUnreadCount();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const activeName = profile?.full_name || "Student User";
  const studentCode = profile?.student_code || "";
  const initials = activeName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col justify-between border-r border-border bg-card transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Student Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {studentNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Student Portal</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {studentNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className={cn(
                      "flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="text-xs font-bold text-foreground leading-snug">
              <span className="sm:hidden">Student Portal</span>
              <span className="hidden sm:inline">Student Portal {studentCode ? `• ${studentCode}` : ""}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell role="student" />
            <Link
              to="/student/profile"
              title="View Profile & ID"
              className="flex items-center gap-2 rounded-full p-0.5 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <span className="grid size-7 sm:size-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {initials}
              </span>
              <span className="hidden text-xs font-semibold text-foreground sm:inline hover:underline">
                {activeName}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-20 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-15 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/student/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname === "/student/dashboard" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/student/timetable"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/student/timetable") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Calendar className="size-5 mb-0.5" />
          <span>Timetable</span>
        </Link>
        <Link
          to="/student/passes"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/student/passes") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CheckCircle2 className="size-5 mb-0.5" />
          <span>Passes</span>
        </Link>
        <Link
          to="/student/violations"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/student/violations") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldAlert className="size-5 mb-0.5" />
          <span>Incidents</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="size-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

/* ==========================================================================
   ADMIN SIDEBAR & SHELL
   ========================================================================== */

const adminNavGroups = [
  {
    category: "Safety & Command",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/safety-analytics", label: "Safety Analytics", icon: BarChart2 },
      { to: "/admin/safety-reports", label: "Executive Reports", icon: FileText },
      { to: "/admin/violations", label: "Violations & Cases", icon: FileText },
      { to: "/admin/movement-passes", label: "Movement Passes", icon: ShieldCheck },
    ],
  },
  {
    category: "Institutional Masters",
    items: [
      { to: "/admin/users", label: "User Accounts", icon: Users },
      { to: "/admin/counselors", label: "Counselor Management", icon: Users },
      { to: "/admin/clubs", label: "Club Management", icon: Users },
      { to: "/admin/students", label: "Student Master", icon: GraduationCap },
      { to: "/admin/faculty", label: "Faculty Master", icon: UserCog },
      { to: "/admin/departments", label: "Departments", icon: Building2 },
      { to: "/admin/courses", label: "Courses", icon: FileSpreadsheet },
      { to: "/admin/rooms", label: "Rooms & Buildings", icon: Building2 },
      { to: "/admin/timetable", label: "Master Timetable", icon: Calendar },
    ],
  },
  {
    category: "Governance & System",
    items: [
      { to: "/admin/permissions", label: "Permission Policies", icon: CheckCircle2 },
      { to: "/admin/audit-logs", label: "Audit Logs", icon: FolderGit2 },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unreadCount = useUnreadCount();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const activeName = profile?.full_name || "Admin User";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col justify-between border-r border-border bg-card transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Key className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Admin Console</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {adminNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Key className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {adminNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className={cn(
                      "flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="text-xs font-bold text-foreground leading-snug">
              <span className="sm:hidden">Admin Console</span>
              <span className="hidden sm:inline">System Administration</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell role="admin" />
            <Link
              to="/admin/settings"
              title="View Profile & System Settings"
              className="flex items-center gap-2 rounded-full p-0.5 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <span className="grid size-7 sm:size-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                AD
              </span>
              <span className="hidden text-xs font-semibold text-foreground sm:inline hover:underline">
                {activeName}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-20 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-15 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/admin/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname === "/admin/dashboard" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/admin/violations"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/admin/violations") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldAlert className="size-5 mb-0.5" />
          <span>Incidents</span>
        </Link>
        <Link
          to="/admin/movement-passes"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/admin/movement-passes") ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldCheck className="size-5 mb-0.5" />
          <span>Passes</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="size-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}

/* ==========================================================================
   SECURITY SIDEBAR & SHELL
   ========================================================================== */

const securityNavGroups = [
  {
    category: "Gate & Operations",
    items: [
      { to: "/security/check", label: "Gate Pass Verification", icon: ShieldCheck },
      { to: "/security/passes", label: "Verification History", icon: Clock },
    ],
  },
  {
    category: "Account",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/security/profile", label: "Profile", icon: User },
    ],
  },
];

export function SecurityShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unreadCount = useUnreadCount();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const activeName = profile?.full_name || "Campus Security Officer";
  const staffCode = profile?.staff_code || "SEC-101";
  const initials = activeName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col justify-between border-r border-border bg-card transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-500 text-amber-950 font-bold shadow-xs">
              <Shield className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Campus Security Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {securityNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-500 text-amber-950 font-bold shadow-xs">
            <Shield className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">Campus Security Portal</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {securityNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className={cn(
                      "flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="text-xs font-bold text-foreground leading-snug">
              <span className="sm:hidden">Security Portal</span>
              <span className="hidden sm:inline">Security Portal ({staffCode})</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell role="security" />
            <Link
              to="/security/profile"
              title="View Security Officer Profile"
              className="flex items-center gap-2 rounded-full p-0.5 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <span className="grid size-7 sm:size-8 place-items-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold shrink-0">
                {initials}
              </span>
              <span className="hidden text-xs font-semibold text-foreground sm:inline hover:underline">
                {activeName}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-20 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-15 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/security/check"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/security/check") ? "text-amber-600 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldCheck className="size-5 mb-0.5" />
          <span>Verify</span>
        </Link>
        <Link
          to="/security/passes"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/security/passes") ? "text-amber-600 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock className="size-5 mb-0.5" />
          <span>History</span>
        </Link>
        <Link
          to="/notifications"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors relative",
            pathname.startsWith("/notifications") ? "text-amber-600 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Bell className="size-5 mb-0.5" />
          <span>Alerts</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-5 size-2 rounded-full bg-destructive" />
          )}
        </Link>
        <Link
          to="/security/profile"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/security/profile") ? "text-amber-600 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="size-5 mb-0.5" />
          <span>Profile</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="size-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}

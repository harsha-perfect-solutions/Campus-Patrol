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
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";
import { getUnreadNotificationCountApi } from "@/lib/api/notifications.server";

import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

function useUnreadCount() {
  const { unreadCount } = useRealtimeNotifications();
  return unreadCount;
}

function UserProfileDropdown({
  activeName,
  initials,
  settingsTo,
  roleLabel,
  onSignOut,
  avatarBg = "bg-primary/10 text-primary",
}: {
  activeName: string;
  initials: string;
  settingsTo: string;
  roleLabel?: string;
  onSignOut: () => void;
  avatarBg?: string;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-1 sm:px-2.5 sm:py-1 hover:bg-muted/70 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer border border-transparent hover:border-border select-none"
          title="Account Menu"
        >
          <span className={cn("grid size-7 sm:size-8 place-items-center rounded-full text-xs font-bold shrink-0", avatarBg)}>
            {initials}
          </span>
          <span className="hidden text-xs font-semibold text-foreground sm:inline truncate max-w-[130px]">
            {activeName}
          </span>
          <ChevronDown className="size-3 text-muted-foreground hidden sm:block shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56 p-1.5 rounded-2xl shadow-lg border border-border bg-card">
        <DropdownMenuLabel className="px-3 py-2">
          <p className="text-xs font-extrabold text-foreground leading-tight truncate">{activeName}</p>
          {roleLabel && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{roleLabel}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-border/60" />
        <DropdownMenuItem
          onClick={() => navigate({ to: settingsTo as any })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary transition-colors"
        >
          <User className="size-4 text-primary shrink-0" />
          <span>My Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-border/60" />
        <DropdownMenuItem
          onClick={onSignOut}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
        badgeBg: "bg-blue-600 text-white dark:bg-blue-500",
        cardBg: "bg-blue-50/80 border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-800/60 hover:border-blue-300 dark:hover:border-blue-700",
        textColor: "text-blue-900 dark:text-blue-200",
        lineColor: "border-blue-200 dark:border-blue-800/60",
        dotColor: "bg-blue-600 dark:bg-blue-400",
        activeBg: "bg-blue-600 text-white font-semibold shadow-xs dark:bg-blue-600 dark:text-white",
        subItems: [
          { to: "/faculty/counselor?tab=cases", label: "Violation Cases", icon: ShieldAlert },
          { to: "/faculty/counselor?tab=passes", label: "Pass Approvals", icon: CheckCircle2 },
          { to: "/faculty/counselor?tab=students", label: "Assigned Students", icon: Users },
        ],
      },
      {
        label: "CLUB COORDINATOR",
        icon: Users,
        badgeBg: "bg-indigo-600 text-white dark:bg-indigo-500",
        cardBg: "bg-indigo-50/80 border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800/60 hover:border-indigo-300 dark:hover:border-indigo-700",
        textColor: "text-indigo-900 dark:text-indigo-200",
        lineColor: "border-indigo-200 dark:border-indigo-800/60",
        dotColor: "bg-indigo-600 dark:bg-indigo-400",
        activeBg: "bg-indigo-600 text-white font-semibold shadow-xs dark:bg-indigo-600 dark:text-white",
        subItems: [
          { to: "/faculty/clubs?tab=members", label: "My Club", icon: Building },
          { to: "/faculty/clubs?tab=events", label: "Events", icon: Calendar },
          { to: "/faculty/clubs?tab=permissions", label: "Give Permission", icon: Ticket },
        ],
      },
    ],
  },
  {
    category: "SYSTEM",
    items: [
      { to: "/faculty/settings", label: "My Profile", icon: User },
      { action: "signOut", label: "Sign out", icon: LogOut },
    ],
  },
];

function isFacultyRouteActive(itemTo: string | undefined, currentPath: string, searchStr: string): boolean {
  if (!itemTo || itemTo === "#") return false;

  const currentParams = new URLSearchParams(searchStr || "");
  const currentTab = currentParams.get("tab");

  if (itemTo.includes("?")) {
    const [targetPath, targetQuery] = itemTo.split("?");
    if (currentPath !== targetPath) return false;

    const targetParams = new URLSearchParams(targetQuery);
    const targetTab = targetParams.get("tab");

    if (targetTab) {
      if (currentTab) {
        return currentTab === targetTab;
      }
      // Default fallbacks when URL has no explicit ?tab= query
      if (targetPath === "/faculty/counselor" && targetTab === "cases") return true;
      if (targetPath === "/faculty/clubs" && targetTab === "members") return true;
      return false;
    }
    return true;
  }

  // itemTo has no query string
  if (currentPath === itemTo) {
    if (itemTo === "/faculty/counselor") {
      return !currentTab || currentTab === "cases";
    }
    if (itemTo === "/faculty/clubs") {
      return !currentTab || currentTab === "members";
    }
    return true;
  }

  return currentPath.startsWith(`${itemTo}/`);
}

function FacultySidebarNavItem({
  item,
  pathname,
  searchStr = "",
  unreadCount,
  onSelect,
  onSignOut,
}: {
  item: any;
  pathname: string;
  searchStr?: string;
  unreadCount: number;
  onSelect?: () => void;
  onSignOut?: () => void;
}) {
  if (item.action === "signOut") {
    return (
      <button
        type="button"
        onClick={() => {
          if (onSelect) onSelect();
          if (onSignOut) onSignOut();
        }}
        className="flex min-h-[38px] w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
      >
        <item.icon className="size-4 shrink-0 text-slate-500 hover:text-destructive" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  if (item.subItems) {
    const isGroupActive = item.subItems.some((sub: any) =>
      isFacultyRouteActive(sub.to, pathname, searchStr)
    );

    const [expanded, setExpanded] = useState(isGroupActive);

    useEffect(() => {
      if (isGroupActive) {
        setExpanded(true);
      }
    }, [isGroupActive]);

    return (
      <div className="my-1.5 space-y-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer shadow-2xs",
            item.cardBg
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className={cn("grid size-6 place-items-center rounded-lg text-white shadow-xs shrink-0", item.badgeBg)}>
              <item.icon className="size-3.5" />
            </span>
            <span className={cn("tracking-wider font-semibold uppercase truncate text-[11px]", item.textColor)}>
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
              const active = isFacultyRouteActive(sub.to, pathname, searchStr);

              return (
                <Link
                  key={sub.to}
                  to={sub.to as any}
                  onClick={onSelect}
                  className={cn(
                    "group/subitem relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                    active
                      ? item.activeBg
                      : "text-slate-600 dark:text-slate-400 hover:bg-blue-50/90 hover:text-blue-700 dark:hover:bg-blue-950/60 dark:hover:text-blue-300"
                  )}
                >
                  <span
                    className={cn(
                      "absolute -left-[19px] size-2 rounded-full ring-2 ring-background transition-all duration-150",
                      active
                        ? (item.dotColor || "bg-blue-600")
                        : "bg-slate-300 dark:bg-slate-600 group-hover/subitem:bg-blue-600 dark:group-hover/subitem:bg-blue-400"
                    )}
                  />
                  <sub.icon
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      active
                        ? "opacity-100"
                        : "opacity-75 group-hover/subitem:opacity-100 group-hover/subitem:text-blue-600 dark:group-hover/subitem:text-blue-400"
                    )}
                  />
                  <span className="truncate">{sub.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const active = isFacultyRouteActive(item.to, pathname, searchStr);
  const badge = item.to && item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;

  return (
    <Link
      to={(item.to || "#") as any}
      onClick={onSelect}
      className={cn(
        "group relative flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium transition-all duration-150",
        active
          ? "bg-blue-100/90 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold border-l-4 border-blue-600 shadow-2xs"
          : "text-slate-600 dark:text-slate-400 hover:bg-blue-50/80 hover:text-blue-700 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
      )}
    >
      <item.icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
        )}
      />
      <span className="truncate">{item.label}</span>
      {badge && (
        <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function FacultyShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useRouterState({ select: (s) => s.location });
  const pathname = location.pathname;
  const searchStr = location.searchStr || "";
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
              <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">CMADMS</p>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Faculty &bull; NSS Coordinator</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {facultyNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group.category}
              </p>
              {group.items.map((item) => (
                <FacultySidebarNavItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  searchStr={searchStr}
                  unreadCount={unreadCount}
                  onSelect={() => setMobileOpen(false)}
                  onSignOut={handleSignOut}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50/80 dark:bg-slate-800/60 px-3 py-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-blue-100 dark:border-slate-700/60">
            <GraduationCap className="size-4 text-blue-600 shrink-0" />
            <span>Safe Campus &bull; Responsible Tomorrow</span>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">CMADMS</p>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Faculty &bull; NSS Coordinator</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {facultyNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group.category}
              </p>
              {group.items.map((item) => (
                <FacultySidebarNavItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  searchStr={searchStr}
                  unreadCount={unreadCount}
                  onSignOut={handleSignOut}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 bg-card">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50/80 dark:bg-slate-800/60 px-3 py-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-blue-100 dark:border-slate-700/60">
            <GraduationCap className="size-4 text-blue-600 shrink-0" />
            <span>Safe Campus &bull; Responsible Tomorrow</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center size-9 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-xs font-semibold text-foreground leading-snug">
              <span className="sm:hidden">Faculty Portal</span>
              <span className="hidden sm:inline">Faculty Portal &bull; Academic Oversight</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <NotificationBell role="faculty" />
            <UserProfileDropdown
              activeName={activeName}
              initials={initials}
              settingsTo="/faculty/settings"
              roleLabel="Faculty & Coordinator"
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-28 sm:pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-16 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/faculty/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname === "/faculty/dashboard" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/faculty/check"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/faculty/check") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <UserSearch className="size-5 mb-0.5" />
          <span>Verify</span>
        </Link>
        <Link
          to="/faculty/reports"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/faculty/reports") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText className="size-5 mb-0.5" />
          <span>Reports</span>
        </Link>
        <Link
          to="/faculty/timetable"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/faculty/timetable") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Calendar className="size-5 mb-0.5" />
          <span>Schedule</span>
        </Link>
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
      { to: "/hod/violations", label: "Violations & Cases", icon: ShieldAlert },
      { to: "/hod/passes", label: "Movement Passes", icon: CheckCircle2 },
      { to: "/hod/cases", label: "Reviews & Hearings", icon: FileText },
    ],
  },
  {
    category: "Academic Administration",
    items: [
      { to: "/hod/students", label: "Department Students", icon: GraduationCap },
      { to: "/hod/timetable", label: "Department Timetable", icon: Calendar },
    ],
  },
  {
    category: "System",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/hod/settings", label: "My Profile", icon: User },
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
              <p className="text-[10px] font-normal text-muted-foreground">HOD Portal ({activeDept})</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {hodNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                      "group flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-2xs border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
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
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex print:hidden">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-normal text-muted-foreground mt-0.5">HOD Portal ({activeDept})</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {hodNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                      "group flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-2xs border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
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
            className="flex w-full min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center size-9 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-xs font-semibold text-foreground leading-snug">
              <span className="sm:hidden">HOD Office &bull; {activeDept}</span>
              <span className="hidden sm:inline">HOD Office &bull; {activeDept} Department</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <NotificationBell role="hod" />
            <UserProfileDropdown
              activeName={activeName}
              initials={initials}
              settingsTo="/hod/settings"
              roleLabel={`HOD • ${activeDept}`}
              onSignOut={() => void signOut().then(() => navigate({ to: "/auth" }))}
            />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-28 sm:pb-24 lg:pb-8 print:p-0 print:m-0">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6 print:m-0 print:p-0 print:max-w-none">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-16 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg print:hidden">
        <Link
          to="/hod/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname === "/hod/dashboard" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/hod/violations"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/hod/violations") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldAlert className="size-5 mb-0.5" />
          <span>Incidents</span>
        </Link>
        <Link
          to="/hod/passes"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/hod/passes") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CheckCircle2 className="size-5 mb-0.5" />
          <span>Passes</span>
        </Link>
        <Link
          to="/hod/students"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/hod/students") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <GraduationCap className="size-5 mb-0.5" />
          <span>Students</span>
        </Link>
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
              <p className="text-[10px] font-normal text-muted-foreground">Student Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {studentNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                      "group flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-2xs border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
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
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-normal text-muted-foreground mt-0.5">Student Portal</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {studentNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                      "group flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-2xs border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
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
            className="flex w-full min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center size-9 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-xs font-semibold text-foreground leading-snug">
              <span className="sm:hidden">Student Portal</span>
              <span className="hidden sm:inline">Student Portal {studentCode ? `• ${studentCode}` : ""}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <NotificationBell role="student" />
            <UserProfileDropdown
              activeName={activeName}
              initials={initials}
              settingsTo="/student/profile"
              roleLabel={studentCode ? `Student • ${studentCode}` : "Student"}
              onSignOut={() => void signOut().then(() => navigate({ to: "/auth" }))}
            />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-28 sm:pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-16 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/student/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname === "/student/dashboard" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/student/timetable"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/student/timetable") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Calendar className="size-5 mb-0.5" />
          <span>Timetable</span>
        </Link>
        <Link
          to="/student/passes"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/student/passes") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CheckCircle2 className="size-5 mb-0.5" />
          <span>Passes</span>
        </Link>
        <Link
          to="/student/violations"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/student/violations") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldAlert className="size-5 mb-0.5" />
          <span>Incidents</span>
        </Link>
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
      { to: "/admin/violations", label: "Violations & Cases", icon: FileText, aliases: ["/admin/reports", "/reports"] },
      { to: "/admin/movement-passes", label: "Movement Passes", icon: ShieldCheck },
    ],
  },
  {
    category: "Institutional Masters",
    items: [
      { to: "/admin/users", label: "User Accounts", icon: Users },
      { to: "/admin/counselors", label: "Counselor Management", icon: Users },
      { to: "/admin/clubs", label: "Club Management", icon: Users },
      { to: "/admin/students", label: "Students & Faculty", icon: GraduationCap, aliases: ["/admin/faculty"] },
      { to: "/admin/departments", label: "Departments & Rooms", icon: Building2, aliases: ["/admin/rooms"] },
    ],
  },
  {
    category: "Governance & System",
    items: [
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

  const isItemActive = (item: any) => {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true;
    if (item.aliases && item.aliases.some((alias: string) => pathname === alias || pathname.startsWith(`${alias}/`))) {
      return true;
    }
    return false;
  };

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
              <p className="text-[10px] font-normal text-muted-foreground">Admin Console</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {adminNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = isItemActive(item);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-2xs border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
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
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Key className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-normal text-muted-foreground mt-0.5">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {adminNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = isItemActive(item);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className={cn(
                      "group flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-2xs border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
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
            className="flex w-full min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center size-9 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-xs font-semibold text-foreground leading-snug">
              <span className="sm:hidden">Admin Console</span>
              <span className="hidden sm:inline">System Administration</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <NotificationBell role="admin" />
            <UserProfileDropdown
              activeName={activeName}
              initials="AD"
              settingsTo="/admin/settings"
              roleLabel="System Administrator"
              onSignOut={() => void signOut().then(() => navigate({ to: "/auth" }))}
            />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-28 sm:pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-16 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/admin/dashboard"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname === "/admin/dashboard" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/admin/violations"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/admin/violations") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldAlert className="size-5 mb-0.5" />
          <span>Incidents</span>
        </Link>
        <Link
          to="/admin/movement-passes"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/admin/movement-passes") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldCheck className="size-5 mb-0.5" />
          <span>Passes</span>
        </Link>
        <Link
          to="/admin/users"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/admin/users") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="size-5 mb-0.5" />
          <span>Users</span>
        </Link>
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
      { to: "/security/check", label: "Gate Pass Verification", icon: ShieldCheck, aliases: ["/security/verify", "/security/scan"] },
      { to: "/security/passes", label: "Verification History", icon: Clock },
    ],
  },
  {
    category: "Account",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/security/profile", label: "Profile", icon: User, aliases: ["/security/settings"] },
    ],
  },
];

export function SecurityShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unreadCount = useUnreadCount();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const isItemActive = (item: any) => {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true;
    if (item.aliases && item.aliases.some((alias: string) => pathname === alias || pathname.startsWith(`${alias}/`))) {
      return true;
    }
    return false;
  };

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
            <span className="grid size-9 place-items-center rounded-xl bg-amber-500 text-amber-950 font-semibold shadow-xs">
              <Shield className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-normal text-amber-700 dark:text-amber-400">Campus Security Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {securityNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = isItemActive(item);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold shadow-2xs border-l-4 border-amber-500"
                        : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400")} />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
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
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 z-20 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-500 text-amber-950 font-semibold shadow-xs">
            <Shield className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-normal text-amber-700 dark:text-amber-400 mt-0.5">Campus Security Portal</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {securityNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </p>
              {group.items.map((item) => {
                const active = isItemActive(item);
                const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className={cn(
                      "group flex min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold shadow-2xs border-l-4 border-amber-500"
                        : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400")} />
                    <span className="truncate">{item.label}</span>
                    {badge && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
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
            className="flex w-full min-h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-card/95 px-3 sm:px-4 lg:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center size-9 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-xs font-semibold text-foreground leading-snug">
              <span className="sm:hidden">Security Portal</span>
              <span className="hidden sm:inline">Security Portal ({staffCode})</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <NotificationBell role="security" />
            <UserProfileDropdown
              activeName={activeName}
              initials={initials}
              settingsTo="/security/profile"
              roleLabel={`Security Staff (${staffCode})`}
              avatarBg="bg-amber-500/20 text-amber-800 dark:text-amber-300"
              onSignOut={() => void signOut().then(() => navigate({ to: "/auth" }))}
            />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-28 sm:pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden flex items-center justify-around h-16 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg">
        <Link
          to="/security/check"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/security/check") ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldCheck className="size-5 mb-0.5" />
          <span>Verify</span>
        </Link>
        <Link
          to="/security/passes"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/security/passes") ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock className="size-5 mb-0.5" />
          <span>History</span>
        </Link>
        <Link
          to="/notifications"
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors relative",
            pathname.startsWith("/notifications") ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground hover:text-foreground",
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
            "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
            pathname.startsWith("/security/profile") ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="size-5 mb-0.5" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}

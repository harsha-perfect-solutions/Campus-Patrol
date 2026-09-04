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
import { LiveClock } from "@/components/live-clock";
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
    category: "Operations",
    items: [
      { to: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/faculty/check", label: "Verify Student", icon: UserSearch },
      { to: "/faculty/passes", label: "Movement Passes", icon: CheckCircle2 },
      { to: "/faculty/reports", label: "My Reports", icon: FileText },
    ],
  },
  {
    category: "Counseling",
    items: [
      {
        label: "Counselor Workspace",
        icon: ShieldAlert,
        subItems: [
          { to: "/faculty/counselor", label: "Violation Cases", icon: ShieldAlert },
          { to: "/faculty/counselor?tab=passes", label: "Pass Approvals", icon: CheckCircle2 },
          { to: "/faculty/counselor?tab=students", label: "Assigned Students", icon: Users },
        ],
      },
    ],
  },
  {
    category: "Club Management",
    items: [
      {
        label: "My Club",
        icon: Building,
        subItems: [
          { to: "/faculty/clubs", label: "Overview", icon: Building },
          { to: "/faculty/clubs?tab=events", label: "Events", icon: Calendar },
          { to: "/faculty/clubs?tab=permissions", label: "Give Permission", icon: Ticket },
        ],
      },
    ],
  },
  {
    category: "Academics & Account",
    items: [
      { to: "/faculty/timetable", label: "My Timetable", icon: Calendar },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/faculty/settings", label: "Settings", icon: Settings },
    ],
  },
];

function FacultySidebarNavItem({
  item,
  pathname,
  unreadCount,
  onSelect,
}: {
  item: any;
  pathname: string;
  unreadCount: number;
  onSelect?: () => void;
}) {
  const isGroupActive = item.subItems
    ? item.subItems.some((sub: any) => pathname.startsWith(sub.to.split("?")[0]))
    : pathname === item.to;
  const [expanded, setExpanded] = useState(true);

  if (item.subItems) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex w-full min-h-[38px] items-center justify-between rounded-xl px-3 text-xs font-semibold transition-colors",
            isGroupActive
              ? "bg-primary/10 text-primary font-bold shadow-2xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </div>
          {expanded ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="ml-4 pl-3 border-l-2 border-border/80 space-y-1 my-1">
            {item.subItems.map((sub: any) => {
              const fullPath =
                pathname + (typeof window !== "undefined" ? window.location.search : "");
              const active = sub.to.includes("?")
                ? fullPath === sub.to
                : pathname === sub.to && !fullPath.includes("?tab=");
              return (
                <Link
                  key={sub.to}
                  to={sub.to as any}
                  onClick={onSelect}
                  className={cn(
                    "flex min-h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <sub.icon className="size-3.5 shrink-0" />
                  <span className="truncate">{sub.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const fullPath = pathname + (typeof window !== "undefined" ? window.location.search : "");
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
}

export function FacultyShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unreadCount = useUnreadCount();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

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
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Faculty Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {facultyNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
                {group.category}
              </p>
              {group.items.map((item) => (
                <FacultySidebarNavItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  unreadCount={unreadCount}
                  onSelect={() => setMobileOpen(false)}
                />
              ))}
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
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary leading-none">CMADMS</p>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Faculty Portal</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {facultyNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
                {group.category}
              </p>
              {group.items.map((item) => (
                <FacultySidebarNavItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  unreadCount={unreadCount}
                />
              ))}
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
            <div className="hidden sm:block">
              <LiveClock />
            </div>
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

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>
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
      { to: "/hod/safety-prevention", label: "Safety Prevention", icon: ShieldAlert },
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
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
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
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
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
            <div className="hidden sm:block">
              <LiveClock />
            </div>
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

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>
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
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
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
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
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
            <div className="hidden sm:block">
              <LiveClock />
            </div>
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

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>
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
      { to: "/admin/safety-prevention", label: "Safety Prevention", icon: ShieldAlert },
      { to: "/admin/emergency", label: "Emergency Command", icon: ShieldAlert },
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
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
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
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
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
            <div className="hidden sm:block">
              <LiveClock />
            </div>
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

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>
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
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
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
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
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
            <div className="hidden sm:block">
              <LiveClock />
            </div>
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

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1240px] space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

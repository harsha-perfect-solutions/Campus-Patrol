import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
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
} from "lucide-react";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ==========================================================================
   FACULTY SIDEBAR & SHELL
   ========================================================================== */

const facultyNav = [
  { to: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/faculty/check", label: "Check Student", icon: UserSearch },
  { to: "/faculty/passes", label: "Movement Passes", icon: CheckCircle2 },
  { to: "/faculty/reports", label: "My Reports", icon: FileText },
  { to: "/faculty/timetable", label: "My Timetable", icon: Calendar },
  { to: "/faculty/notifications", label: "Notifications", icon: Bell },
  { to: "/faculty/settings", label: "Settings", icon: Settings },
];

export function FacultyShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { unreadCount } = useCmadms();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const activeName = profile?.full_name || "Prof. Ravi Kumar";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div>
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Faculty Portal</p>
            </div>
          </div>

          <nav className="space-y-1 p-3">
            {facultyNav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={cn(
                    "flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-bold"
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
          </nav>
        </div>

        <div className="border-t border-border p-3">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <span className="text-xs font-bold text-foreground">Faculty Portal &bull; CSE Department</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 text-muted-foreground" />
              <span>10:42 AM &nbsp; 8 Nov 2026</span>
            </div>

            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              RK
            </span>
            <span className="hidden text-xs font-semibold text-foreground sm:inline">{activeName}</span>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-16 lg:px-8 lg:pt-8 lg:pb-16">
          <div className="mx-auto w-full max-w-[1240px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ==========================================================================
   HOD SIDEBAR & SHELL
   ========================================================================== */

const hodNav = [
  { to: "/hod/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hod/cases", label: "Cases & Reviews", icon: ShieldAlert },
  { to: "/hod/students", label: "Department Students", icon: GraduationCap },
  { to: "/hod/department", label: "Department Overview", icon: Building2 },
  { to: "/hod/timetable", label: "Department Timetable", icon: Calendar },
  { to: "/hod/notifications", label: "Notifications", icon: Bell },
  { to: "/hod/settings", label: "Settings", icon: Settings },
];

export function HODShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { unreadCount } = useCmadms();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const activeName = profile?.full_name || "Dr. Anjali Rao (HOD)";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div>
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground">HOD Portal</p>
            </div>
          </div>

          <nav className="space-y-1 p-3">
            {hodNav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={cn(
                    "flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-bold"
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
          </nav>
        </div>

        <div className="border-t border-border p-3">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 lg:px-6">
          <span className="text-xs font-bold text-foreground">HOD Office &bull; CSE Department</span>

          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              AR
            </span>
            <span className="hidden text-xs font-semibold text-foreground sm:inline">{activeName}</span>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-16 lg:px-8 lg:pt-8 lg:pb-16">
          <div className="mx-auto w-full max-w-[1240px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ==========================================================================
   STUDENT SIDEBAR & SHELL
   ========================================================================== */

const studentNav = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/profile", label: "My Profile & ID", icon: User },
  { to: "/student/timetable", label: "My Timetable", icon: Calendar },
  { to: "/student/passes", label: "My Movement Passes", icon: CheckCircle2 },
  { to: "/student/violations", label: "My Violations", icon: ShieldAlert },
  { to: "/student/explanations", label: "Submit Explanation", icon: FileText },
  { to: "/student/notifications", label: "Notifications", icon: Bell },
  { to: "/student/settings", label: "Settings", icon: Settings },
];

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { unreadCount } = useCmadms();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const activeName = profile?.full_name || "Meera Nair";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div>
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Student Portal</p>
            </div>
          </div>

          <nav className="space-y-1 p-3">
            {studentNav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              const badge = item.to.includes("notifications") && unreadCount > 0 ? unreadCount : null;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={cn(
                    "flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-bold"
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
          </nav>
        </div>

        <div className="border-t border-border p-3">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 lg:px-6">
          <span className="text-xs font-bold text-foreground">Student Portal &bull; Roll No: 23CSE1042</span>

          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              MN
            </span>
            <span className="hidden text-xs font-semibold text-foreground sm:inline">{activeName}</span>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-16 lg:px-8 lg:pt-8 lg:pb-16">
          <div className="mx-auto w-full max-w-[1240px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ==========================================================================
   ADMIN SIDEBAR & SHELL
   ========================================================================== */

const adminNav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/reports", label: "Reported Cases", icon: ShieldAlert },
  { to: "/admin/users", label: "User Accounts", icon: Users },
  { to: "/admin/students", label: "Student Master", icon: GraduationCap },
  { to: "/admin/faculty", label: "Faculty Master", icon: UserCog },
  { to: "/admin/departments", label: "Departments", icon: Building2 },
  { to: "/admin/courses", label: "Courses", icon: FileSpreadsheet },
  { to: "/admin/rooms", label: "Rooms & Buildings", icon: Building2 },
  { to: "/admin/timetable", label: "Master Timetable", icon: Calendar },
  { to: "/admin/permissions", label: "Permission Policies", icon: CheckCircle2 },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: FolderGit2 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const activeName = profile?.full_name || "Admin User";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border bg-card flex-col justify-between lg:flex">
        <div>
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Key className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Admin Console</p>
            </div>
          </div>

          <nav className="space-y-1 p-3">
            {adminNav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={cn(
                    "flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border p-3">
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 lg:px-6">
          <span className="text-xs font-bold text-foreground">System Administration &bull; Master Control</span>

          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              AD
            </span>
            <span className="hidden text-xs font-semibold text-foreground sm:inline">{activeName}</span>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-16 lg:px-8 lg:pt-8 lg:pb-16">
          <div className="mx-auto w-full max-w-[1240px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

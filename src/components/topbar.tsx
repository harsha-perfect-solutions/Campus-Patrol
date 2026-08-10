import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronDown, Menu, PanelLeft, Search, Settings, User } from "lucide-react";
import { faculty, students } from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const titles: Record<string, { title: string; crumb: string }> = {
  "/": { title: "Dashboard", crumb: "Home / Dashboard" },
  "/check": { title: "Check Student", crumb: "Home / Verification" },
  "/violations": { title: "Reported Violations", crumb: "Home / Reporting" },
  "/reports": { title: "My Reports", crumb: "Home / Reporting" },
  "/timetable": { title: "My Timetable", crumb: "Home / Academic" },
  "/notifications": { title: "Notifications", crumb: "Home / System" },
  "/settings": { title: "Settings", crumb: "Home / System" },
};

export function Topbar({
  onToggleSidebar,
  onOpenMobileNav,
}: {
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { unreadCount } = useCmadms();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const meta =
    titles[pathname] ??
    (pathname.startsWith("/reports/")
      ? { title: "Violation Details", crumb: "Home / Reporting / Case" }
      : { title: "CMADMS", crumb: "Home" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden lg:inline-flex"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft />
        </Button>

        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-semibold text-foreground">{meta.title}</p>
          <p className="truncate text-[11px] text-subtle-foreground">{meta.crumb}</p>
        </div>

        <p className="truncate text-sm font-semibold text-foreground lg:hidden">CMADMS</p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mx-auto hidden h-10 w-full max-w-md items-center gap-2 rounded-[10px] border border-border bg-background px-3 text-sm text-subtle-foreground transition-colors hover:border-input md:flex"
          aria-label="Search students and reports"
        >
          <Search className="size-[18px]" aria-hidden />
          <span className="truncate">Search student, report or Student ID...</span>
          <kbd className="ml-auto rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Search"
          >
            <Search />
          </Button>
          <Button variant="ghost" size="icon-sm" asChild aria-label="Notifications">
            <Link to="/notifications" className="relative">
              <Bell />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="ml-1 flex min-h-11 items-center gap-2 rounded-[10px] px-2 transition-colors hover:bg-accent"
                aria-label="Account menu"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy text-xs font-semibold text-navy-foreground">
                  {faculty.initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[13px] font-medium leading-tight text-foreground">
                    {faculty.name}
                  </span>
                  <span className="block text-[11px] leading-tight text-subtle-foreground">
                    {faculty.role}
                  </span>
                </span>
                <ChevronDown className="size-4 text-subtle-foreground" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block text-sm">{faculty.name}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {faculty.id}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                <User className="mr-2 size-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                <Settings className="mr-2 size-4" /> Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search students, reports or pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Students">
            {students.map((s) => (
              <CommandItem
                key={s.id}
                value={`${s.name} ${s.id}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: "/check", search: { student: s.id } });
                }}
              >
                <User className="mr-2 size-4" />
                {s.name} · {s.id}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Pages">
            {Object.entries(titles).map(([to, t]) => (
              <CommandItem
                key={to}
                value={t.title}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to });
                }}
              >
                {t.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

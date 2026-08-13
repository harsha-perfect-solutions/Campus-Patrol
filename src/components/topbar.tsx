import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, Clock, Menu, Search, Settings, ShieldCheck, User } from "lucide-react";
import { faculty, students } from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LiveClock } from "@/components/live-clock";
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

export function Topbar({
  onToggleSidebar,
  onOpenMobileNav,
}: {
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
}) {
  const { unreadCount } = useCmadms();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const activeName = profile?.full_name || faculty.name;
  const activeRole = profile?.staff_code || faculty.role;
  const initials = activeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Time Badge */}
          <LiveClock />

          {/* Notifications Button */}
          <Button variant="ghost" size="icon-sm" asChild aria-label="Notifications">
            <Link to="/notifications" className="relative">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Link>
          </Button>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent"
                aria-label="Account menu"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold leading-tight text-foreground">
                    {activeName}
                  </span>
                  <span className="block text-[10px] leading-tight text-muted-foreground">
                    {activeRole}
                  </span>
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block text-sm font-semibold">{activeName}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {activeRole}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                <User className="mr-2 size-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                <Settings className="mr-2 size-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => void signOut().then(() => navigate({ to: "/auth" }))}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search Modal */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search students, reports or roll number..." />
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
        </CommandList>
      </CommandDialog>
    </>
  );
}

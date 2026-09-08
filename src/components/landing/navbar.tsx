import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Menu, X, ArrowRight, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function LandingNavbar() {
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navLinks = [
    { label: "Home", to: "/" },
    { label: "Features", to: "/features" },
    { label: "How It Works", to: "/how-it-works" },
    { label: "Modules", to: "/modules" },
    { label: "About", to: "/about" },
    { label: "Security", to: "/security" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Branding */}
        <Link to="/" className="flex items-center gap-3 group">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-transform group-hover:scale-105">
            <ShieldCheck className="size-5" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight text-foreground leading-none">
              CMADMS
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              Campus Movement System
            </span>
          </div>
        </Link>

        {/* Center Desktop Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 backdrop-blur-xs">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to as any}
              activeProps={{
                className: "text-primary font-bold bg-primary/10",
              }}
              inactiveProps={{
                className: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              }}
              className="px-3 py-1 text-xs font-semibold transition-colors rounded-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="rounded-xl text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </Button>

          {/* Mobile Drawer Trigger */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-xl text-muted-foreground"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-card p-4 space-y-2 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to as any}
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <Button asChild size="sm" className="w-full rounded-xl font-semibold bg-primary text-primary-foreground">
              <Link to={session ? ("/admin/dashboard" as any) : "/auth"}>
                {session ? "Go to Dashboard" : "Sign In to System"}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

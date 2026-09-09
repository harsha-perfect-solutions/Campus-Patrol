import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-border/80 bg-card pt-12 pb-8 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 pt-4">
          {/* Brand Info */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-base font-extrabold text-foreground leading-none">CMADMS</p>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                  Campus Movement System
                </p>
              </div>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              CMADMS is an enterprise campus movement authorization & discipline management platform providing digital passes, gate verification, and HOD approval workflows.
            </p>
          </div>

          {/* Nav Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link to="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
              <li><Link to="/modules" className="hover:text-primary transition-colors">Modules</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
              <li><Link to="/security" className="hover:text-primary transition-colors">Security</Link></li>
            </ul>
          </div>

          {/* Role Portals */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              Role Portals
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-muted-foreground">
              <li><Link to="/student/passes" className="hover:text-primary transition-colors">Student Portal</Link></li>
              <li><Link to="/check" className="hover:text-primary transition-colors">Faculty Check</Link></li>
              <li><Link to="/security/check" className="hover:text-primary transition-colors">Security Gate</Link></li>
              <li><Link to="/hod/passes" className="hover:text-primary transition-colors">HOD Authorization</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-primary transition-colors">Admin Console</Link></li>
            </ul>
          </div>

          {/* System Security Note */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              Institutional Status
            </h4>
            <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>v2.4 Production Live</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Server-authoritative authorization engine with PostgreSQL storage & SSE bus.
              </p>
            </div>
          </div>
        </div>

        {/* Copyright Footer */}
        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p className="text-center sm:text-left">
            CMADMS &bull; Campus Movement Authorization & Discipline System &copy; 2026
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/auth" className="hover:underline">Sign In</Link>
            <span>&bull;</span>
            <Link to="/security" className="hover:underline">Privacy & Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

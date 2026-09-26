import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-border/80 bg-card py-10 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Brand Info - Centered */}
        <div className="flex flex-col items-center text-center mx-auto max-w-2xl space-y-3">
          <Link to="/" className="inline-flex items-center justify-center gap-3 group">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="size-5" />
            </span>
            <div className="text-left">
              <p className="text-base font-extrabold text-foreground leading-none">CMADMS</p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                Campus Movement &amp; Absence Detection Management System
              </p>
            </div>
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Enterprise campus movement authorization &amp; discipline management platform providing digital passes, gate verification, and HOD approval workflows.
          </p>
        </div>

        {/* Copyright Footer - Centered */}
        <div className="pt-6 border-t border-border/60 text-center text-xs text-muted-foreground">
          <p>
            CMADMS &bull; Campus Movement Authorization &amp; Discipline System &copy; 2026
          </p>
        </div>
      </div>
    </footer>
  );
}

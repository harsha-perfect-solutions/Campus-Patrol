import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Activity, CheckCircle2, Sparkles, QrCode, Lock } from "lucide-react";

export function LandingFeatureCards() {
  return (
    <section id="features" className="w-full py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
            CORE CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Intelligent Campus Governance
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Automated digital clearance workflows designed for university movement compliance.
          </p>
        </div>

        {/* 3 Grid Cards Inspired by Reference Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card 1 — Large Light Feature Card */}
          <div className="md:col-span-2 lg:col-span-6 card-surface p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card flex flex-col justify-between space-y-6 shadow-xs group hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-6" />
              </span>
              <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                Smart & Secure Verification
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
                Real-time verification against live timetables and approved movement passes ensures only authorized movement across department corridors and gates.
              </p>
            </div>

            {/* Visual Decorative Accent */}
            <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted/40 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <QrCode className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">Timetable & Pass Engine</p>
                  <p className="text-[10px] text-muted-foreground">Server-authoritative check</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Card 2 — Executive Navy Feature Card */}
          <div className="md:col-span-1 lg:col-span-3 rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-5 sm:p-7 text-card-foreground flex flex-col justify-between space-y-6 shadow-xs hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Activity className="size-6" />
              </span>
              <h3 className="text-xl font-extrabold tracking-tight text-foreground">
                Real-Time Monitoring
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Monitor student movement, gate activity, and verification events in real time across all institutional checkpoints.
              </p>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] font-bold text-primary">Live SSE Feed</span>
            </div>
          </div>

          {/* Card 3 — Executive Navy Feature Card */}
          <div className="md:col-span-1 lg:col-span-3 rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-5 sm:p-7 text-card-foreground flex flex-col justify-between space-y-6 shadow-xs hover:border-primary/40 transition-colors">
            <div className="space-y-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="size-6" />
              </span>
              <h3 className="text-xl font-extrabold tracking-tight text-foreground">
                Automated Authorization
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Digital passes, QR verification, and HOD approvals simplify campus movement management without paperwork.
              </p>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] font-bold text-primary">HOD Workflow</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

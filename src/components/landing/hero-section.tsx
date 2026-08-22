import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Play,
  ShieldCheck,
  Zap,
  Eye,
  CheckCircle2,
  Lock,
  QrCode,
  TrendingUp,
  Users,
  Building2,
  Activity,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LandingHeroSection() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section id="hero" className="w-full pt-4 pb-8 sm:pt-6 sm:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Large Rounded Main Hero Shell Card */}
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-primary/20 bg-gradient-to-b from-primary/5 via-primary/[0.02] to-background p-6 sm:p-10 lg:p-12 shadow-sm">
          {/* Subtle Background Lighting Accent Glows */}
          <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8 lg:items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-4 py-1.5 text-xs font-bold text-primary shadow-2xs backdrop-blur-xs">
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <span>SMART CAMPUS DISCIPLINE & AUTHORIZATION</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08]">
                Campus Movement, <br />
                <span className="bg-gradient-to-r from-primary via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Simplified.
                </span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed max-w-xl">
                Instant student verification against live timetables and approved movement passes.
                Eliminating unauthorized corridor movement across all departments.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 px-7 font-extrabold shadow-md transition-all hover:scale-[1.02] active:scale-95 text-xs sm:text-sm"
                >
                  <Link to="/auth">
                    Sign In <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>

                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => setDemoOpen(true)}
                  className="h-12 rounded-2xl border-primary/30 bg-card text-foreground hover:bg-primary/10 px-6 font-semibold shadow-2xs transition-all hover:scale-[1.02] text-xs sm:text-sm gap-2"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary">
                    <Play className="size-3 fill-primary ml-0.5" />
                  </span>
                  Watch Demo
                </Button>
              </div>

              {/* Trust Indicators Bar */}
              <div className="pt-4 border-t border-border/50 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Lock className="size-3.5 text-primary shrink-0" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-500 shrink-0" />
                  <span>Real-time</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="size-3.5 text-blue-500 shrink-0" />
                  <span>Transparent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                  <span>Reliable</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual with Overlay Floating Cards */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-border/80 shadow-lg group">
                {/* Background Campus Photograph */}
                <img
                  src="/images/hero-campus.jpg"
                  alt="CMADMS Modern Campus Architecture"
                  className="w-full h-[380px] sm:h-[460px] object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Floating Card 1: Top Right Metrics Panel */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-56 sm:w-64 card-surface p-3.5 sm:p-4 rounded-2xl border border-white/20 bg-card/90 backdrop-blur-md shadow-md space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                        <QrCode className="size-4" />
                      </span>
                      <span>Pass Statistics</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Verified Passes</span>
                      <span className="font-extrabold text-foreground text-sm">12,400+</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <TrendingUp className="size-2.5" /> ↑ 18.6%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Active Users</span>
                      <span className="font-extrabold text-foreground text-sm">3,256</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <TrendingUp className="size-2.5" /> ↑ 12.3%
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Today's Gate Check</span>
                    <span className="font-extrabold text-primary">1,284 scans</span>
                  </div>
                </div>

                {/* Floating Status Badge */}
                <div className="absolute right-4 sm:right-6 bottom-4 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-card/90 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-bold text-foreground shadow-md">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>System Online &bull; All Services Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Watch Demo Dialog Modal */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              CMADMS System Interactive Demo Walkthrough
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs text-muted-foreground pt-2">
            <p className="leading-relaxed">
              CMADMS streamlines campus movement authorization across 5 dedicated roles:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-foreground">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="font-bold text-primary block">1. Student Portal</span>
                <span className="text-[11px] text-muted-foreground block">Request digital gate passes & view live timetable clearance.</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="font-bold text-primary block">2. Security Gate Console</span>
                <span className="text-[11px] text-muted-foreground block">Scan QR codes & log real-time entry/exit timestamps.</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="font-bold text-primary block">3. HOD Approval Office</span>
                <span className="text-[11px] text-muted-foreground block">Review pass requests & investigate department movement.</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="font-bold text-primary block">4. Master Admin Command</span>
                <span className="text-[11px] text-muted-foreground block">System governance, emergency control & full audit logs.</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground">
                <Link to="/auth" onClick={() => setDemoOpen(false)}>
                  Sign In to Experience Demo <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

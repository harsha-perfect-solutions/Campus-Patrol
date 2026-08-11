import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, CheckCircle2, ShieldCheck, Sparkles, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CMADMS — Campus Movement Authorization & Discipline System" },
      {
        name: "description",
        content:
          "Faculty verify student movement against live timetables and permissions, report violations, and let HODs review explanations.",
      },
      { property: "og:title", content: "CMADMS — Campus Movement Authorization" },
      {
        property: "og:description",
        content:
          "Verify a student in seconds: timetable check, permission check, semester record and one-tap reporting.",
      },
    ],
  }),
  component: Landing,
});

function VerticalGridPattern() {
  return (
    <div className="absolute inset-0 pointer-events-none flex justify-center items-center overflow-hidden z-0">
      <div className="w-full max-w-5xl h-full flex justify-between px-6 opacity-45 [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_95%)]">
        {Array.from({ length: 23 }).map((_, i) => (
          <div key={i} className="h-full w-px bg-border/60" />
        ))}
      </div>
    </div>
  );
}

function Landing() {
  const { session, loading } = useAuth();

  return (
    <div className="h-screen w-screen max-h-screen max-w-vw flex flex-col justify-between bg-background overflow-hidden relative select-none p-4 sm:p-6">
      {/* Background Vertical Lines Pattern */}
      <VerticalGridPattern />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto w-full shrink-0">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-foreground">CMADMS</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
              v2.4 Live
            </span>
          </div>
        </div>
      </header>

      {/* Centered Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-3xl mx-auto my-auto">
        {/* Top AI Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary shadow-2xs mb-5 animate-pulse">
          <Sparkles className="size-3.5 text-primary" />
          <span>Smart Campus Discipline & Authorization</span>
        </div>

        {/* Main Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
          Campus Movement, <br />
          <span className="bg-gradient-to-r from-primary via-indigo-600 to-blue-500 bg-clip-text text-transparent">
            Simplified.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-xl text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
          Instant student verification against live timetables & approved movement passes. Eliminating unauthorized corridor movement across all departments.
        </p>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <Button
            asChild
            size="lg"
            className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-95"
          >
            <Link to="/auth">
              Faculty Sign In <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 border-border bg-card text-foreground hover:bg-accent rounded-xl px-6 font-semibold shadow-2xs transition-all hover:scale-[1.02]"
          >
            <Link to="/check">
              <UserSearch className="size-4 mr-2 text-primary" /> Verify Student ID
            </Link>
          </Button>
        </div>

        {/* Intelligent Feature Pill Badges */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
          {[
            { label: "Instant Roll No Lookup", icon: UserSearch },
            { label: "Live Class Timetable", icon: Calendar },
            { label: "Gate Pass Permission", icon: CheckCircle2 },
            { label: "Violation Case Logs", icon: ShieldCheck },
            { label: "HOD Approval Pass", icon: CheckCircle2 },
          ].map((pill) => (
            <div
              key={pill.label}
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/90 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs backdrop-blur-xs transition-colors hover:border-primary/40"
            >
              <pill.icon className="size-3.5 text-primary" />
              <span>{pill.label}</span>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <p className="mt-7 text-xs font-medium text-muted-foreground/80">
          Verified <strong className="text-foreground font-semibold">12,400+</strong> student passes across CSE, ECE, EEE & Mech
        </p>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center text-[11px] text-muted-foreground shrink-0 py-1">
        CMADMS &bull; Campus Movement Authorization & Discipline System &copy; 2026
      </footer>
    </div>
  );
}

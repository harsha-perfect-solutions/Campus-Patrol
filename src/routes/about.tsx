import { createFileRoute, Link } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingAboutSection } from "@/components/landing/about-section";
import { LandingTrustBar } from "@/components/landing/trust-bar";
import { LandingFooter } from "@/components/landing/footer";
import { ShieldCheck, ArrowRight, Building, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CMADMS" },
      {
        name: "description",
        content: "About CMADMS: Campus Movement Authorization & Discipline Management System.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />

      <main className="flex-1 w-full space-y-8 pt-6 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-background p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-4 py-1.5 text-xs font-bold text-primary">
              <ShieldCheck className="size-3.5 text-primary" />
              INSTITUTIONAL OVERVIEW
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              About CMADMS Platform
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              CMADMS was engineered to transform campus discipline, movement compliance, and gate security across modern higher education institutions.
            </p>
          </div>
        </div>

        <LandingAboutSection />
        <LandingTrustBar />
      </main>

      <LandingFooter />
    </div>
  );
}

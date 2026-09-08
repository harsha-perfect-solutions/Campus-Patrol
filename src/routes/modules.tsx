import { createFileRoute, Link } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingUseCasesSection } from "@/components/landing/use-cases-section";
import { LandingFooter } from "@/components/landing/footer";
import { User, ShieldCheck, Building2, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/modules")({
  head: () => ({
    meta: [
      { title: "System Modules — CMADMS" },
      {
        name: "description",
        content: "Explore the 5 dedicated portals in CMADMS: Student, Faculty, Security, HOD, and Admin.",
      },
    ],
  }),
  component: ModulesPage,
});

function ModulesPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />

      <main className="flex-1 w-full space-y-8 pt-6 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-background p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-4 py-1.5 text-xs font-bold text-primary">
              <Building2 className="size-3.5 text-primary" />
              ROLE-BASED PORTALS
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              Integrated System Modules
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              CMADMS provides tailored workspaces for Students, Faculty, Security Officers, HODs, and System Administrators.
            </p>
          </div>
        </div>

        <LandingUseCasesSection />
      </main>

      <LandingFooter />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingFooter } from "@/components/landing/footer";
import { Send, UserCheck, QrCode, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — CMADMS" },
      {
        name: "description",
        content: "Learn how CMADMS automates student movement requests, HOD approvals, and security gate verification.",
      },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />

      <main className="flex-1 w-full space-y-8 pt-6 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-background p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-4 py-1.5 text-xs font-bold text-primary">
              <ShieldCheck className="size-3.5 text-primary" />
              END-TO-END WORKFLOW
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              How CMADMS Works
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Discover the 4 simple steps that take a movement request from initial student submission to gate QR validation.
            </p>
          </div>
        </div>

        <LandingHowItWorksSection />
      </main>

      <LandingFooter />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHeroSection } from "@/components/landing/hero-section";
import { LandingAboutSection } from "@/components/landing/about-section";
import { LandingFeatureCards } from "@/components/landing/feature-cards";
import { LandingTrustBar } from "@/components/landing/trust-bar";
import { LandingUseCasesSection } from "@/components/landing/use-cases-section";
import { LandingHowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingSystemMetricsSection } from "@/components/landing/system-metrics-section";
import { LandingSecuritySection } from "@/components/landing/security-section";
import { LandingFooter } from "@/components/landing/footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CMADMS — Campus Movement Authorization & Discipline System" },
      {
        name: "description",
        content:
          "Instant student movement verification against live timetables & approved passes. Elevate campus security with real-time digital authorization.",
      },
      { property: "og:title", content: "CMADMS — Campus Movement Authorization" },
      {
        property: "og:description",
        content:
          "Unified campus movement authorization & discipline management platform for Students, Faculty, Security, HODs, and Admins.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary scroll-smooth">
      {/* 1. Sticky Navigation Bar */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main className="flex-1 w-full space-y-4">
        {/* 2. Hero Section (Two-Column Layout with Visual & Floating Metric Cards) */}
        <LandingHeroSection />

        {/* 3. About CMADMS Section */}
        <LandingAboutSection />

        {/* 4. Feature Card Section (3 Cards: Light Card + 2 Dark Cards) */}
        <LandingFeatureCards />

        {/* 5. Department Trust Bar (CSE, ECE, EEE, MECH) */}
        <LandingTrustBar />

        {/* 6. Use Cases Section (4 Role Cards: Student, Security, HOD, Admin) */}
        <LandingUseCasesSection />

        {/* 7. How It Works Timeline (01 -> 02 -> 03 -> 04 Process) */}
        <LandingHowItWorksSection />

        {/* 8. System Metrics Section */}
        <LandingSystemMetricsSection />

        {/* 9. Security Section (Light Purple Container) */}
        <LandingSecuritySection />
      </main>

      {/* 10. Final CTA & Footer */}
      <LandingFooter />
    </div>
  );
}

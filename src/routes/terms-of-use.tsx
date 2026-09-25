import { createFileRoute, Link } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { LandingTrustBar } from "@/components/landing/trust-bar";
import {
  FileCode2,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Smartphone,
  Eye,
  Server,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export const Route = createFileRoute("/terms-of-use")({
  head: () => ({
    meta: [
      { title: "Terms of Use (TOU) — CMADMS" },
      {
        name: "description",
        content: "Acceptable User Policy and Terms of Use (TOU) for the CMADMS Campus Movement & Security Portal.",
      },
    ],
  }),
  component: TermsOfUsePage,
});

function TermsOfUsePage() {
  const policies = [
    {
      title: "1. Acceptable Use Policy (AUP)",
      content:
        "Users must access CMADMS solely for verified academic, security, administrative, and approved extracurricular functions. Automated scraping, penetration testing without administrative consent, denial-of-service attempts, or credential stuffing are strictly prohibited.",
    },
    {
      title: "2. User Account Security & Credentials",
      content:
        "You are solely responsible for maintaining the confidentiality of your credentials. Newly issued accounts must undergo a mandatory initial password change. Sharing session cookies, OTP codes, or temporary passwords with third parties violates institutional IT policy.",
    },
    {
      title: "3. Mobile Device & QR Scanner Usage",
      content:
        "When using camera-based QR scanners at campus gates or classrooms, users agree to grant camera access strictly for instant code validation. No image recordings are stored on client browsers; verification occurs instantaneously against server endpoints.",
    },
    {
      title: "4. Notification Bus & Real-Time Alerts",
      content:
        "CMADMS utilizes Server-Sent Events (SSE) and institutional email dispatch to broadcast critical pass approvals, counselor notes, gate departures, and emergency security broadcasts. Users must maintain active email inboxes to receive operational communications.",
    },
    {
      title: "5. Intellectual Property & System Ownership",
      content:
        "The software architecture, user interface components, server logic, database schemas, and branding of CMADMS are the proprietary intellectual property of the institution. Reverse engineering or unauthorized distribution is prohibited.",
    },
    {
      title: "6. Disciplinary Enforcement & Account Termination",
      content:
        "Violation of these Terms of Use may result in immediate suspension of portal privileges, invalidation of active gate passes, and formal referral to the College Disciplinary Committee.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />

      <main className="flex-1 w-full space-y-12 pt-6 pb-16">
        {/* Header Hero Banner */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-background p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-4 py-1.5 text-xs font-semibold text-primary">
              <FileCode2 className="size-3.5 text-primary" />
              ACCEPTABLE USE & SYSTEM POLICIES
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
              Terms of Use (TOU)
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Rules governing authentication, portal interaction, camera scanning protocols, and digital credential integrity.
            </p>
            <div className="text-[11px] text-muted-foreground font-mono pt-2">
              Last Revised: Academic Year 2025–2026 &bull; CMADMS v2.4
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          {policies.map((policy, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-xs space-y-4"
            >
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2.5">
                <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                  {idx + 1}
                </span>
                {policy.title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {policy.content}
              </p>
            </div>
          ))}

          {/* Quick Links Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Lock className="size-4 text-primary" /> Security Architecture
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Read about PostgreSQL row-level security and time-to-live pass encryption.
              </p>
              <Link to="/security" className="inline-block text-xs font-bold text-primary hover:underline pt-1">
                View Security Architecture &rarr;
              </Link>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Terms &amp; Conditions (TOC)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Review institutional movement pass policies and counselor approval guidelines.
              </p>
              <Link to="/terms" className="inline-block text-xs font-bold text-primary hover:underline pt-1">
                View Terms &amp; Conditions &rarr;
              </Link>
            </div>
          </div>
        </div>

        <LandingTrustBar />
      </main>

      <LandingFooter />
    </div>
  );
}

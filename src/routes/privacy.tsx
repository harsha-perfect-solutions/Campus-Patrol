import { createFileRoute, Link } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { LandingTrustBar } from "@/components/landing/trust-bar";
import {
  ShieldCheck,
  Lock,
  Eye,
  Server,
  Database,
  CheckCircle2,
  FileCheck,
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy & Data Protection — CMADMS" },
      {
        name: "description",
        content: "Institutional Privacy Policy, Student Record Protection, and Data Retention Policies for CMADMS.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const privacyPillars = [
    {
      title: "1. Institutional Data Collected",
      content:
        "CMADMS collects only data necessary for academic movement verification: student roll number, full name, institutional email, department, class section, gate timestamps, counselor approvals, and violation incident logs.",
    },
    {
      title: "2. Data Protection & Encryption",
      content:
        "All credentials and password hashes are secured with cryptographic hashing (scrypt / SHA-256). Passes and QR tokens employ temporary nonces and time-to-live restrictions to prevent unauthorized replay or tracking.",
    },
    {
      title: "3. Access Restrictions & Role Isolation",
      content:
        "Data access is strictly compartmentalized: faculty counselors only view assigned students, security officers only view pass verification windows, and HODs only review department-level escalations.",
    },
    {
      title: "4. Audit Logs & Data Retention",
      content:
        "Movement pass histories and violation records are preserved in the institutional database for the duration of the academic year for accreditation and compliance audits, after which logs may be archived.",
    },
    {
      title: "5. Third-Party Sharing Non-Disclosure",
      content:
        "CMADMS never sells, leases, or shares student or faculty personal data with external commercial third parties. Data remains strictly on campus-authorized cloud and on-premise infrastructure.",
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
              <Lock className="size-3.5 text-primary" />
              INSTITUTIONAL DATA GOVERNANCE
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
              Privacy Policy &amp; Data Protection
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              How CMADMS handles student identity, movement pass logs, and role-restricted credentials in full compliance with institutional privacy standards.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          {privacyPillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-xs space-y-3"
            >
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2.5">
                <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                  {idx + 1}
                </span>
                {pillar.title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {pillar.content}
              </p>
            </div>
          ))}

          {/* Cross Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <FileCheck className="size-4 text-primary" /> Terms &amp; Conditions (TOC)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Read operational pass authorization rules and counselor workflows.
              </p>
              <Link to="/terms" className="inline-block text-xs font-bold text-primary hover:underline pt-1">
                View Terms &amp; Conditions &rarr;
              </Link>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Terms of Use (TOU)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Review acceptable usage and camera verification guidelines.
              </p>
              <Link to="/terms-of-use" className="inline-block text-xs font-bold text-primary hover:underline pt-1">
                View Terms of Use &rarr;
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

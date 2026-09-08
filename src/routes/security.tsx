import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { LandingTrustBar } from "@/components/landing/trust-bar";
import { ShieldCheck, Lock, Key, Server, Eye, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & Compliance — CMADMS" },
      {
        name: "description",
        content: "Institutional Security, Encryption, and Access Control Architecture of CMADMS.",
      },
    ],
  }),
  component: SecurityLayout,
});

function SecurityLayout() {
  const { pathname } = useLocation();

  if (pathname === "/security" || pathname === "/security/") {
    return <SecurityPage />;
  }

  return <Outlet />;
}

function SecurityPage() {
  const securityPillars = [
    {
      icon: Lock,
      title: "End-to-End Token Encryption",
      description: "Digital pass QR codes and verification tokens are cryptographically signed with time-to-live restrictions to prevent unauthorized forgery.",
    },
    {
      icon: Key,
      title: "Role-Based Access Control (RBAC)",
      description: "Strict isolation between Student, Faculty, HOD, Security Guard, and Admin roles ensures user data is only accessible to authorized personnel.",
    },
    {
      icon: Server,
      title: "Server-Authoritative Validation",
      description: "Gate verification requests execute directly against PostgreSQL database transactions. No client-side state tampered bypasses are permitted.",
    },
    {
      icon: Eye,
      title: "Real-Time Audit Logging",
      description: "Every pass issuance, approval, gate check-in, check-out, and violation report is logged with timestamped user signatures.",
    },
  ];

  const complianceItems = [
    "FERPA & Institutional Data Privacy Standard Compliant",
    "PostgreSQL Row-Level Access Policies & Secure DB Pooling",
    "Server-Sent Events (SSE) Encrypted Notification Delivery",
    "Automated TTL Expiry for Emergency Out Passes",
    "Tamper-Proof Gate Audit Logs for Campus Discipline Reviews",
  ];

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />

      <main className="flex-1 w-full space-y-12 pt-6 pb-16">
        {/* Header Hero Banner */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-background p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-4 py-1.5 text-xs font-bold text-primary">
              <ShieldCheck className="size-3.5 text-primary" />
              SECURITY & COMPLIANCE ARCHITECTURE
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              Enterprise Institutional Security
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              CMADMS protects institutional integrity with server-authoritative verification, encrypted QR tokens, and role-restricted data pipelines.
            </p>
          </div>
        </div>

        {/* Security Pillars */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Core Security Features</h2>
            <p className="text-xs text-muted-foreground">Built to institutional cybersecurity standards</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {securityPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-border/80 bg-card p-6 space-y-3 hover:border-primary/40 transition-colors"
                >
                  <div className="inline-flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{pillar.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance Checklist */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <h2 className="text-xl font-bold text-foreground text-center">Institutional Compliance Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {complianceItems.map((item) => (
                <div key={item} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-foreground leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <LandingTrustBar />
      </main>

      <LandingFooter />
    </div>
  );
}

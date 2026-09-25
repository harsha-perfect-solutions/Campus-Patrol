import { createFileRoute, Link } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { LandingTrustBar } from "@/components/landing/trust-bar";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Clock,
  UserCheck,
  Building,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions (TOC) — CMADMS" },
      {
        name: "description",
        content: "Official Terms and Conditions for Campus Movement Authorization & Discipline Management System (CMADMS).",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By accessing or utilizing the Campus Movement Authorization & Discipline Management System (CMADMS), students, faculty members, counselors, Heads of Departments (HODs), campus security personnel, and administrators agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use this portal.",
    },
    {
      title: "2. Authorized Academic & Institutional Usage",
      content:
        "CMADMS is an official institutional software system deployed exclusively for verified college members. Any attempt to access unauthorized role portals, spoof digital QR passes, simulate gate timestamps, bypass faculty counseling workflows, or falsify reasons for out-passes constitutes a direct disciplinary violation subject to college review.",
    },
    {
      title: "3. Digital Passes & QR Code Integrity",
      content:
        "All student movement passes (Emergency, Academic, NSS, Sports, and Club Events) generate time-bound cryptographic QR tokens upon approval by authorized Counselors or HODs. Passing or sharing digital tokens to unauthorized peers, taking screenshots to bypass gate scanners, or tampering with pass validity windows is strictly prohibited.",
    },
    {
      title: "4. Role Responsibilities & Workflow Governance",
      subsections: [
        {
          heading: "Student Responsibilities",
          text: "Students must submit accurate justification, adhere strictly to authorized departure/return windows, and present valid digital QR passes at designated security checkpoints.",
        },
        {
          heading: "Faculty & Counselor Responsibilities",
          text: "Counselors are responsible for vetting student movement and club event permission requests based on academic attendance criteria prior to approval.",
        },
        {
          heading: "Security Personnel Responsibilities",
          text: "Security guards must scan or verify active passes using the official gate verification module and log real-time entry and exit timestamps.",
        },
      ],
    },
    {
      title: "5. Violation Reporting & Explanation Protocols",
      content:
        "When an unauthorized movement, absence, or campus discipline breach is detected, an official violation report is recorded into the institutional ledger. Students are granted an allotted period to submit digital explanations through the student portal before case escalation to the Head of Department (HOD).",
    },
    {
      title: "6. System Modifications & Policy Updates",
      content:
        "Campus administration reserves the right to modify system permissions, attendance threshold rules, gate checkpoint routes, and operational guidelines at any time to preserve campus safety and discipline standards.",
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
              <Scale className="size-3.5 text-primary" />
              INSTITUTIONAL GOVERNANCE & POLICY
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
              Terms &amp; Conditions (TOC)
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Standard operating terms, pass authorization rules, and institutional discipline governance for the CMADMS platform.
            </p>
            <div className="text-[11px] text-muted-foreground font-mono pt-2">
              Effective Date: Academic Year 2025–2026 &bull; Version 2.4.0
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          {sections.map((section, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-xs space-y-4"
            >
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2.5">
                <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                  {idx + 1}
                </span>
                {section.title}
              </h2>
              {section.content && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              )}
              {section.subsections && (
                <div className="grid gap-3 pt-2">
                  {section.subsections.map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-4 rounded-xl bg-muted/30 border border-border space-y-1"
                    >
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        {sub.heading}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {sub.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Contact & Support Section */}
          <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center space-y-3">
            <h3 className="text-sm font-bold text-foreground">Need Institutional Policy Assistance?</h3>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              For inquiries regarding movement pass guidelines, counselor routing, or grievance escalations, contact the Department Office or Campus Discipline Committee.
            </p>
            <div className="pt-2">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                Learn more about CMADMS Architecture &rarr;
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

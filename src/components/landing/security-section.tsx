import { ShieldCheck, Lock, Key, Bell, FileText, Smartphone, CheckCircle2 } from "lucide-react";

export function LandingSecuritySection() {
  const features = [
    {
      title: "Server-side RBAC",
      desc: "Strict 5-tier role validation (Student, Faculty, Security, HOD, Admin) enforced on every server call.",
      icon: Key,
    },
    {
      title: "Secure Session Tokens",
      desc: "Encrypted cookie-based sessions with HTTP-only tokens protecting against unauthorized access.",
      icon: Lock,
    },
    {
      title: "QR Verification Engine",
      desc: "Digital QR pass generation with cryptographic signature verification at campus gates.",
      icon: ShieldCheck,
    },
    {
      title: "Server-Authoritative Validity",
      desc: "Live timestamp & class schedule verification preventing pass misuse or early exit bypass.",
      icon: CheckCircle2,
    },
    {
      title: "Real-Time Event Bus",
      desc: "Instant SSE push alerts for emergency alerts, pass approvals, and violation events.",
      icon: Bell,
    },
    {
      title: "Immutable Audit Trails",
      desc: "Every verification, exit/entry timestamp, and disciplinary action is logged permanently.",
      icon: FileText,
    },
  ];

  return (
    <section id="security" className="w-full py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card-surface p-8 sm:p-12 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-xs space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
              ENTERPRISE SECURITY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Security First. At Every Gate.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Institutional security controls designed to safeguard campus integrity, data privacy, and student movement compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-5 rounded-2xl bg-card border border-border/80 space-y-2.5 shadow-2xs transition-colors hover:border-primary/40"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="text-sm font-extrabold text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

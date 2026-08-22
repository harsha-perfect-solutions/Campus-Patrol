import { Send, UserCheck, QrCode, ShieldCheck, ArrowRight } from "lucide-react";

export function LandingHowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Student Requests Pass",
      desc: "Student logs into portal and submits reason, movement date, and validity window.",
      icon: Send,
    },
    {
      num: "02",
      title: "HOD Reviews Request",
      desc: "Department HOD receives real-time notification to evaluate and approve or reject.",
      icon: UserCheck,
    },
    {
      num: "03",
      title: "Digital QR Pass Generated",
      desc: "Upon approval, an encrypted digital QR code token is generated on the student pass.",
      icon: QrCode,
    },
    {
      num: "04",
      title: "Security Verifies at Gate",
      desc: "Security guards scan QR at gates, validating validity window & logging entry/exit times.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="how-it-works" className="w-full py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
            WORKFLOW LIFECYCLE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            How CMADMS Works
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            From request submission to gate validation in 4 automated steps.
          </p>
        </div>

        {/* Timeline Desktop Horizontal / Mobile Vertical */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative card-surface p-6 rounded-3xl border border-border shadow-2xs flex flex-col justify-between space-y-4 group hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-primary/40 group-hover:text-primary transition-colors font-mono">
                      {step.num}
                    </span>
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>

                {/* Arrow Connector for Desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary border border-primary/20">
                      <ArrowRight className="size-3" />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { QrCode, Users, ShieldCheck, Zap } from "lucide-react";

export function LandingSystemMetricsSection() {
  const metrics = [
    {
      value: "12,400+",
      label: "Verified Passes",
      subtext: "↑ 18.6% vs last month",
      icon: QrCode,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      value: "3,256",
      label: "Active Users",
      subtext: "↑ 12.3% vs last month",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      value: "98.7%",
      label: "Verification Accuracy",
      subtext: "System Reliability",
      icon: ShieldCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      value: "0.8s",
      label: "Average Verification Time",
      subtext: "Lightning Fast Check",
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <section className="w-full py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card-surface p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-border shadow-xs">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex items-center gap-3 sm:gap-3.5 p-2 rounded-xl">
                  <span className={`grid size-11 sm:size-12 place-items-center rounded-xl sm:rounded-2xl ${m.bg} ${m.color} shrink-0`}>
                    <Icon className="size-5 sm:size-6" />
                  </span>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-none">
                      {m.value}
                    </p>
                    <p className="text-xs font-bold text-foreground truncate">{m.label}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground truncate">{m.subtext}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

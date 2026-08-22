import { Cpu, Zap, Radio, Wrench, Building2 } from "lucide-react";

export function LandingTrustBar() {
  const departments = [
    { code: "CSE", name: "Computer Science & Engineering", icon: Cpu },
    { code: "ECE", name: "Electronics & Communication", icon: Radio },
    { code: "EEE", name: "Electrical & Electronics", icon: Zap },
    { code: "MECH", name: "Mechanical Engineering", icon: Wrench },
  ];

  return (
    <section className="w-full py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card-surface p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            <Building2 className="size-4 text-primary" />
            <span>Trusted across campus departments</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            {departments.map((dept) => {
              const Icon = dept.icon;
              return (
                <div
                  key={dept.code}
                  className="flex items-center gap-2 rounded-xl bg-card border border-border/60 px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Icon className="size-4 text-primary shrink-0" />
                  <span>{dept.code}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

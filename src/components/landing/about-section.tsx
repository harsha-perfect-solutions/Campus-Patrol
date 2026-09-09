import { ShieldCheck } from "lucide-react";

export function LandingAboutSection() {
  return (
    <section id="about" className="w-full py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card-surface p-8 sm:p-12 rounded-3xl border border-border shadow-xs">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Header */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                ABOUT CMADMS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                What is CMADMS?
              </h2>
            </div>

            {/* Right Explanation */}
            <div className="lg:col-span-7 space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground font-semibold">CMADMS</strong> is a unified campus movement authorization and discipline management system that helps institutions maintain security, transparency, and efficiency across departments using real-time verification and automated authorization workflows.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
                  <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>Real-time cross-checking against live class timetables & approved HOD passes.</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
                  <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>Encrypted digital QR passes & server-authoritative gate security logs.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

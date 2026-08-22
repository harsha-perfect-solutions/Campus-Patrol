import { Link } from "@tanstack/react-router";
import {
  User,
  ShieldCheck,
  Building2,
  Settings,
  ArrowRight,
  CheckCircle2,
  QrCode,
  FileText,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingUseCasesSection() {
  const roles = [
    {
      title: "Student",
      roleCode: "student",
      image: "/images/use-case-student.jpg",
      icon: User,
      bullets: [
        "Apply movement passes",
        "View pass approval status",
        "View movement history & QR",
      ],
      link: "/student/passes",
    },
    {
      title: "Security",
      roleCode: "security",
      image: "/images/use-case-security.jpg",
      icon: ShieldCheck,
      bullets: [
        "Verify passes instantly",
        "Digital QR code scanning",
        "Gate exit / entry verification",
      ],
      link: "/security/check",
    },
    {
      title: "HOD",
      roleCode: "hod",
      image: "/images/use-case-hod.jpg",
      icon: Building2,
      bullets: [
        "Approve & reject pass requests",
        "Monitor department movement",
        "Investigate & resolve incidents",
      ],
      link: "/hod/passes",
    },
    {
      title: "Admin",
      roleCode: "admin",
      image: "/images/use-case-admin.jpg",
      icon: Settings,
      bullets: [
        "Manage users & roles",
        "Manage master departments & courses",
        "System settings & audit logs",
      ],
      link: "/admin/dashboard",
    },
  ];

  return (
    <section id="modules" className="w-full py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
              USE CASES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Built for Every Department
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              CMADMS adapts to the unique needs of every campus role, ensuring secure, organized, and efficient campus movement.
            </p>
          </div>

          <Button
            asChild
            size="sm"
            className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-5 shadow-2xs shrink-0"
          >
            <Link to="/auth">
              View All Modules <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* 4 Role Cards Grid Matching Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="card-surface rounded-3xl border border-border shadow-xs overflow-hidden flex flex-col justify-between group hover:border-primary/40 transition-colors"
              >
                <div>
                  {/* Photo Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-muted">
                    <img
                      src={r.image}
                      alt={`${r.title} Role Portal`}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                      <Icon className="size-4" />
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-lg font-extrabold text-foreground">{r.title}</h3>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {r.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="p-5 pt-0">
                  <Link
                    to={r.link as any}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
                  >
                    Access Portal <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

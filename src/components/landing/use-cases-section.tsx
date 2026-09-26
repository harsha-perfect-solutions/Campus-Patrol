import {
  User,
  ShieldCheck,
  Building2,
  Settings,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

export function LandingUseCasesSection() {
  const roles = [
    {
      title: "Student Portal",
      roleCode: "student",
      image: "/images/use-case-student.jpg",
      icon: User,
      bullets: [
        "Apply movement passes",
        "View digital pass QR codes",
        "Track case explanations & status",
      ],
      link: "/student/passes",
    },
    {
      title: "Faculty Portal",
      roleCode: "faculty",
      image: "/images/use-case-hod.jpg",
      icon: GraduationCap,
      bullets: [
        "Verify students in corridors",
        "Review counselor pass requests",
        "Manage club events & permissions",
      ],
      link: "/faculty/dashboard",
    },
    {
      title: "Security Gate",
      roleCode: "security",
      image: "/images/use-case-security.jpg",
      icon: ShieldCheck,
      bullets: [
        "Scan QR passes at gate",
        "Verify departure & return",
        "Real-time pass verification logs",
      ],
      link: "/security/check",
    },
    {
      title: "Department HOD",
      roleCode: "hod",
      image: "/images/use-case-hod.jpg",
      icon: Building2,
      bullets: [
        "Approve departmental passes",
        "Investigate student violations",
        "Review safety metrics & analytics",
      ],
      link: "/hod/dashboard",
    },
    {
      title: "Administration",
      roleCode: "admin",
      image: "/images/use-case-admin.jpg",
      icon: Settings,
      bullets: [
        "Manage users & role privileges",
        "Configure timetable & departments",
        "Audit logs & campus compliance",
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
        </div>

        {/* 5 Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="card-surface rounded-3xl border border-border shadow-xs overflow-hidden flex flex-col justify-between group hover:border-primary/40 transition-colors"
              >
                <div>
                  {/* Photo Header */}
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <img
                      src={r.image}
                      alt={`${r.title} Role Portal`}
                      className="h-full w-full object-cover object-center"
                      onError={(e) => {
                        // graceful fallback for missing static images
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                      <Icon className="size-4" />
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3 pb-6">
                    <h3 className="text-base font-extrabold text-foreground">{r.title}</h3>
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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

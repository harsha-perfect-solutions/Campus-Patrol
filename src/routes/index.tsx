import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, FileText, ShieldCheck, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CMADMS — Campus Movement Authorization & Discipline System" },
      {
        name: "description",
        content:
          "Faculty verify student movement against live timetables and permissions, report violations, and let HODs review explanations.",
      },
      { property: "og:title", content: "CMADMS — Campus Movement Authorization" },
      {
        property: "og:description",
        content:
          "Verify a student in seconds: timetable check, permission check, semester record and one-tap reporting.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: UserSearch,
    title: "Check a student",
    body: "Enter a roll number and instantly see identity, current class and movement authorization.",
  },
  {
    icon: CalendarCheck,
    title: "Timetable & permission",
    body: "Live timetable lookup plus approved movement passes — no guesswork in the corridor.",
  },
  {
    icon: FileText,
    title: "Report & review",
    body: "File a violation with location and remarks, collect the student's 24-hour explanation, and let the HOD decide.",
  },
];

function Landing() {
  const { session, isStaff, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-foreground">CMADMS</p>
            <p className="text-[11px] text-muted-foreground">Campus Movement Authorization</p>
          </div>
        </div>
        {!loading && (
          <Button asChild>
            {session ? (
              <Link to={isStaff ? "/dashboard" : "/my-record"}>Open portal</Link>
            ) : (
              <Link to="/auth">Sign in</Link>
            )}
          </Button>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-20">
        <section className="card-surface mt-6 overflow-hidden p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            University discipline platform
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Verify student movement in seconds, not in arguments.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            CMADMS puts the timetable, the movement permission and the semester record of every
            student one search away — so faculty can decide fairly and report cleanly.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Faculty sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create an account
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="card-surface p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-base font-semibold text-foreground">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

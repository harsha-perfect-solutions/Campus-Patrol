import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileWarning,
  Search,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCmadms } from "@/lib/cmadms-store";
import { faculty } from "@/lib/cmadms-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Faculty Dashboard — CMADMS" },
      {
        name: "description",
        content:
          "Verify student movement, review today's activity and report unauthorized movement from the CMADMS faculty dashboard.",
      },
      { property: "og:title", content: "Faculty Dashboard — CMADMS" },
      {
        property: "og:description",
        content: "Verify student movement and review today's verification activity.",
      },
    ],
  }),
  component: Dashboard,
});

const activity = [
  { id: "V-20260809-014", text: "Violation resolved", time: "10 minutes ago", tone: "resolved" },
  { id: "V-20260810-002", text: "New violation reported", time: "32 minutes ago", tone: "violation" },
  {
    id: "V-20260810-001",
    text: "Student explanation submitted",
    time: "1 hour ago",
    tone: "pending",
  },
  { id: "V-20260807-021", text: "Case closed without penalty", time: "Yesterday", tone: "resolved" },
] as const;

const activityIcon = {
  resolved: { Icon: CheckCircle2, cls: "bg-success-soft text-success" },
  violation: { Icon: AlertTriangle, cls: "bg-destructive-soft text-destructive" },
  pending: { Icon: Clock, cls: "bg-warning-soft text-warning" },
} as const;

function StatCard({
  label,
  value,
  hint,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  Icon: typeof Clock;
  tone: "danger" | "warning" | "success" | "info";
}) {
  const tones = {
    danger: "bg-destructive-soft text-destructive",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
  };
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tones[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-subtle-foreground">{hint}</p>
    </div>
  );
}

function Dashboard() {
  const { reports } = useCmadms();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");

  const attention = reports.filter((r) => r.status === "pending" || r.status === "escalated");

  return (
    <>
      <PageHeader
        title="Good Morning, Professor 👋"
        description="Monitor student movement and review today's verification activity."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "Dashboard" }]}
        actions={
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Monday, 10 August 2026
          </span>
        }
      />

      {/* 1. Primary action */}
      <section className="card-surface overflow-hidden">
        <div className="bg-navy px-6 py-6 text-navy-foreground sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">Check Student</h2>
              <p className="mt-1.5 max-w-lg text-sm text-navy-foreground/75">
                Verify whether a student should currently be attending their scheduled class.
              </p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/25">
              <Search className="size-5" aria-hidden />
            </span>
          </div>
        </div>
        <form
          className="px-6 py-6 sm:px-8"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/check", search: { student: studentId.trim().toUpperCase() } });
          }}
        >
          <label htmlFor="dash-student" className="text-[13px] font-medium text-foreground">
            Student ID
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Input
              id="dash-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="23CSE1012"
              className="h-11 flex-1"
            />
            <Button type="submit" size="lg" className="sm:w-56">
              Check Student <ArrowRight />
            </Button>
          </div>
          <p className="mt-2 text-xs text-subtle-foreground">
            Enter a valid student ID, or press{" "}
            <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">Ctrl + K</kbd> for
            quick search.
          </p>
        </form>
      </section>

      {/* 2 & 3. Attention + activity */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="card-surface">
          <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Requires Your Attention</h2>
              <p className="text-xs text-subtle-foreground">
                Cases awaiting action from {faculty.name}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/reports">View all</Link>
            </Button>
          </div>
          <ul className="divide-y divide-divider">
            {attention.slice(0, 4).map((r) => (
              <li key={r.id}>
                <Link
                  to="/reports/$reportId"
                  params={{ reportId: r.id }}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive-soft text-destructive">
                    <FileWarning className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {r.studentName} · {r.studentId}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.className} • {r.incidentTime} • {r.location}
                    </span>
                  </span>
                  <StatusBadge status={r.status} className="hidden sm:inline-flex" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-surface">
          <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/violations">View All</Link>
            </Button>
          </div>
          <ol className="px-5 py-5">
            {activity.map((a, i) => {
              const { Icon, cls } = activityIcon[a.tone];
              return (
                <li key={a.id + i} className="relative flex gap-3 pb-6 last:pb-0">
                  {i !== activity.length - 1 && (
                    <span className="absolute left-[15px] top-8 h-full w-px bg-divider" aria-hidden />
                  )}
                  <span className={cn("z-10 grid size-8 shrink-0 place-items-center rounded-full", cls)}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">
                      <span className="font-medium">{a.id}</span> — {a.text}
                    </span>
                    <span className="block text-xs text-subtle-foreground">{a.time}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* 5. Statistics */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
          Today's Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Reports Today"
            value="05"
            hint="+2 from yesterday"
            Icon={AlertTriangle}
            tone="danger"
          />
          <StatCard
            label="Under Review"
            value="03"
            hint="2 awaiting action"
            Icon={Clock}
            tone="warning"
          />
          <StatCard
            label="Resolved"
            value="18"
            hint="+12% this month"
            Icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Escalated"
            value="02"
            hint="Requires attention"
            Icon={ShieldAlert}
            tone="info"
          />
        </div>
      </section>
    </>
  );
}

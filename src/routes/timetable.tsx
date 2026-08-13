import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, DoorOpen, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ToneBadge } from "@/components/status-badge";
import { timetable } from "@/lib/cmadms-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "My Timetable — CMADMS" },
      {
        name: "description",
        content:
          "Your weekly teaching schedule with rooms, batches and the class currently running.",
      },
      { property: "og:title", content: "My Timetable — CMADMS" },
      { property: "og:description", content: "Weekly teaching schedule for CMADMS faculty." },
    ],
  }),
  component: TimetablePage,
});

const days = ["Today", "Mon", "Tue", "Wed", "Thu", "Fri"];
const CURRENT = "10:00 AM";

export function TimetablePage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const [day, setDay] = useState("Today");
  const slots = timetable[day] ?? [];

  return (
    <>
      {!hideHeader && (
        <PageHeader
          title="My Timetable"
          description="Your teaching schedule for the current academic week."
          breadcrumb={[{ label: "Home", to: "/" }, { label: "Academic" }, { label: "Timetable" }]}
        />
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Select day">
        {days.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={day === d}
            onClick={() => setDay(d)}
            className={cn(
              "min-h-11 rounded-[10px] border px-4 text-sm font-medium transition-colors duration-150",
              day === d
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <section className="card-surface p-5 sm:p-6">
        {slots.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No classes scheduled"
            description="You have no scheduled sessions on this day."
          />
        ) : (
          <ol className="space-y-1">
            {slots.map((s, i) => {
              const active = day === "Today" && s.start === CURRENT;
              return (
                <li key={`${s.code}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                  {i !== slots.length - 1 && (
                    <span
                      className="absolute left-[52px] top-7 h-full w-px bg-divider sm:left-[70px]"
                      aria-hidden
                    />
                  )}
                  <span className="w-[52px] shrink-0 pt-3 text-right text-xs font-semibold text-subtle-foreground sm:w-[70px] sm:text-sm">
                    {s.start.replace(" AM", "").replace(" PM", "")}
                  </span>
                  <span
                    className={cn(
                      "z-10 mt-4 size-3 shrink-0 rounded-full border-2 bg-card",
                      active ? "border-primary" : "border-input",
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "min-w-0 flex-1 rounded-[12px] border p-4 transition-colors",
                      active
                        ? "border-primary/40 bg-accent"
                        : "border-border bg-card hover:border-input",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{s.subject}</h3>
                      {active && <ToneBadge tone="info">In session</ToneBadge>}
                    </div>
                    <p className="mt-1 text-xs text-subtle-foreground">
                      {s.start} — {s.end} • {s.code}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-4" aria-hidden /> {s.batch}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DoorOpen className="size-4" aria-hidden /> {s.room}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}

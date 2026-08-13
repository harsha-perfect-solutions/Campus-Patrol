import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  UserSearch,
} from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/faculty/dashboard")({
  head: () => ({ meta: [{ title: "Faculty Dashboard — CMADMS" }] }),
  component: FacultyDashboardPage,
});

function FacultyDashboardPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod"]}>
      <FacultyDashboardContent />
    </RoleGuard>
  );
}

function FacultyDashboardContent() {
  const { reports } = useCmadms();
  const { profile } = useAuth();

  const myReports = reports.filter((r) => r.reportedBy.includes("Ravi") || true);
  const pendingCount = myReports.filter((r) => r.status === "pending").length;
  const reviewCount = myReports.filter((r) => r.status === "review").length;
  const resolvedCount = myReports.filter((r) => r.status === "resolved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile?.full_name || "Prof. Ravi Kumar"}`}
        description="Faculty Discipline & Student Movement Authorization Workspace."
        breadcrumb={[{ label: "Faculty", to: "/faculty/dashboard" }, { label: "Dashboard" }]}
        actions={
          <Button asChild size="lg" className="rounded-xl font-semibold shadow-xs">
            <Link to="/faculty/check">
              <UserSearch className="size-4 mr-2" /> Check Student Roll No
            </Link>
          </Button>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          {
            label: "Today's Reports",
            value: myReports.length,
            color: "text-primary bg-primary/10",
          },
          {
            label: "Pending Review",
            value: pendingCount,
            color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
          },
          {
            label: "Under Review",
            value: reviewCount,
            color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
          },
          {
            label: "Resolved Cases",
            value: resolvedCount,
            color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="card-surface p-5 rounded-2xl border border-border shadow-2xs"
          >
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${s.color}`}>
              {s.label}
            </span>
            <p className="mt-3 text-3xl font-extrabold text-foreground">
              {String(s.value).padStart(2, "0")}
            </p>
          </div>
        ))}
      </div>

      {/* Main Two Column Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Check Shortcut Card */}
        <section className="card-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-divider pb-3">
              <UserSearch className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                STUDENT VERIFICATION ENGINE
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">Verify Student Movement</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Check identity, timetable schedule, and active gate permissions for any student roll
              number before reporting unauthorized movement.
            </p>
          </div>

          <div className="mt-6">
            <Button
              asChild
              className="w-full h-11 rounded-xl font-semibold bg-primary text-primary-foreground shadow-xs"
            >
              <Link to="/faculty/check">Open Verification Workspace &rarr;</Link>
            </Button>
          </div>
        </section>

        {/* Today's Teaching Schedule */}
        <section className="card-surface p-6 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center gap-2 border-b border-divider pb-3">
            <BookOpen className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              TODAY'S TEACHING SCHEDULE
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {[
              {
                time: "09:00 AM – 10:00 AM",
                subject: "Data Structures Lab",
                room: "Lab C-102",
                active: false,
              },
              {
                time: "10:00 AM – 11:00 AM",
                subject: "Data Structures (3rd Year CSE)",
                room: "Room C-204",
                active: true,
              },
              {
                time: "02:00 PM – 03:00 PM",
                subject: "Algorithms & Logic",
                room: "Room C-206",
                active: false,
              },
            ].map((slot) => (
              <div
                key={slot.time}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  slot.active
                    ? "border-primary/40 bg-primary/5 text-foreground font-semibold"
                    : "border-border/60 bg-card text-muted-foreground"
                }`}
              >
                <div>
                  <p className="font-bold text-foreground">{slot.subject}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {slot.time} &bull; {slot.room}
                  </p>
                </div>
                {slot.active && (
                  <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                    In Session
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Violation Reports Filed by Faculty */}
      <section className="card-surface p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center justify-between border-b border-divider pb-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              RECENT VIOLATION REPORTS FILED
            </span>
          </div>
          <Button variant="outline" size="sm" asChild className="rounded-xl text-xs">
            <Link to="/faculty/reports">View All My Reports</Link>
          </Button>
        </div>

        <div className="mt-4 divide-y divide-divider">
          {myReports.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3 text-xs">
              <div>
                <span className="font-bold text-foreground">{r.id}</span> &bull;{" "}
                <strong className="text-foreground">{r.studentName}</strong> ({r.studentId})
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {r.className} &bull; {r.incidentTime}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="rounded-xl text-xs">
                <Link to="/faculty/reports">Details</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

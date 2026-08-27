import { createFileRoute } from "@tanstack/react-router";
import { Bell, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { faculty } from "@/lib/cmadms-data";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CMADMS" },
      {
        name: "description",
        content: "Manage your faculty profile, appearance and notification preferences in CMADMS.",
      },
      { property: "og:title", content: "Settings — CMADMS" },
      { property: "og:description", content: "Profile, appearance and notification preferences." },
    ],
  }),
  component: ProtectedSettingsPage,
});

function ProtectedSettingsPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "hod", "security", "student", "admin"]}>
      <SettingsPage />
    </RoleGuard>
  );
}

function Card({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface">
      <div className="flex items-start gap-3 border-b border-divider px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useCmadms();
  const { profile, role } = useAuth();

  const fullName = profile?.full_name || faculty.name;
  const staffCode = profile?.staff_code || faculty.id;
  const dept = profile?.department || faculty.department;
  const roleTitle = (role || "faculty").toUpperCase();

  return (
    <>
      <PageHeader
        title="Account Profile & Settings"
        description="Manage your staff profile, appearance and notification preferences."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "System" }, { label: "Settings" }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`${roleTitle} Profile`} icon={UserRound} description="Your CMADMS official identity">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" defaultValue={fullName} className="mt-1.5 h-11 font-semibold" />
          </div>
          <div>
            <Label htmlFor="fid">Staff / User Code</Label>
            <Input id="fid" defaultValue={staffCode} readOnly className="mt-1.5 h-11 font-mono font-bold" />
            <p className="mt-1 text-xs text-subtle-foreground">
              Official staff credentials are issued by Administration.
            </p>
          </div>
          <div>
            <Label htmlFor="dept">Department</Label>
            <Input id="dept" defaultValue={dept} className="mt-1.5 h-11 font-semibold" />
          </div>
          <Button onClick={() => toast.success("Profile preferences updated successfully.")}>Save Profile Changes</Button>
        </Card>

        <div className="space-y-6">
          <Card
            title="Appearance"
            icon={theme === "dark" ? Moon : Sun}
            description="Theme preference"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Dark mode</p>
                <p className="text-xs text-muted-foreground">
                  Reduce glare during evening invigilation duty.
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                aria-label="Toggle dark mode"
              />
            </div>
          </Card>

          <Card title="Notifications" icon={Bell} description="Choose what you get alerted about">
            {[
              ["Case status updates", "When a case you filed changes status"],
              ["Student explanations", "When a student responds to your report"],
              ["Escalations", "When a case is escalated to the HOD"],
            ].map(([t, d], i) => (
              <div key={t} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
                <Switch defaultChecked={i !== 2} aria-label={t} />
              </div>
            ))}
          </Card>

          <Card
            title="Verification Policy"
            icon={ShieldCheck}
            description="How CMADMS handles your reports"
          >
            <p className="text-sm text-muted-foreground">
              Reports are visible to the department head and the reported student. Violations can
              only be filed when a scheduled class exists and no active movement permission is
              found.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

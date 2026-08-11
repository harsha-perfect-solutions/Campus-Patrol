import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, CheckCircle2, CheckCheck, Clock, Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useCmadms } from "@/lib/cmadms-store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CMADMS" },
      {
        name: "description",
        content: "Case updates, student explanations and resolution alerts for your reports.",
      },
    ],
  }),
  component: NotificationsPage,
});

const tones = {
  violation: { cls: "bg-destructive-soft text-destructive", Icon: AlertTriangle, label: "Violation" },
  pending: { cls: "bg-warning-soft text-warning", Icon: Clock, label: "Pending" },
  resolved: { cls: "bg-success-soft text-success", Icon: CheckCircle2, label: "Resolved" },
  info: { cls: "bg-info-soft text-info", Icon: Info, label: "Info" },
} as const;

export function NotificationsPage() {
  const { notifications, markRead, markAllRead, clearNotifications } = useCmadms();
  const { role } = useAuth();
  const navigate = useNavigate();

  // Filter notifications for active user role
  const roleNotifications = notifications.filter(
    (n) => n.recipientRole === "all" || n.recipientRole === role || !n.recipientRole,
  );

  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  const handleNotificationClick = (n: (typeof notifications)[0]) => {
    markRead(n.id);

    if (n.relatedReportId) {
      if (role === "hod") {
        navigate({ to: `/hod/cases/${n.relatedReportId}` as any });
      } else if (role === "student") {
        navigate({ to: "/student/explanations" as any });
      } else {
        navigate({ to: "/faculty/reports" as any });
      }
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread update${unreadCount === 1 ? "" : "s"} across your cases.`}
        breadcrumb={[{ label: "Home", to: "/" }, { label: "System" }, { label: "Notifications" }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck /> Mark all as read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearNotifications();
                toast.success("Notifications cleared");
              }}
              disabled={roleNotifications.length === 0}
            >
              <Trash2 /> Clear
            </Button>
          </>
        }
      />

      <section className="card-surface overflow-hidden rounded-2xl border border-border">
        {roleNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="New case updates will appear here as soon as they happen."
          />
        ) : (
          <ul className="divide-y divide-divider">
            {roleNotifications.map((n) => {
              const { cls, Icon, label } = tones[n.tone] || tones.info;
              return (
                <li
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer hover:bg-accent/60",
                    !n.read && "bg-accent/30 font-medium",
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", cls)}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                    <p className="mt-1 text-[10px] text-subtle-foreground font-semibold">
                      {label} • {n.time}
                    </p>
                  </div>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(n.id);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

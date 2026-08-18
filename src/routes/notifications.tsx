import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CheckCheck,
  Clock,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  getMyNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "@/lib/api/notifications.server";
import type { DBNotification } from "@/lib/db/notifications.server";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CMADMS" },
      {
        name: "description",
        content: "Your personal notifications from CMADMS — gate pass updates, violation reports, and case decisions.",
      },
    ],
  }),
  component: NotificationsPage,
});

// ─── Tone Config ─────────────────────────────────────────────────────────────

const TONE_CONFIG = {
  violation: {
    cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    Icon: AlertTriangle,
    label: "Violation",
  },
  pending: {
    cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    Icon: Clock,
    label: "Pending",
  },
  resolved: {
    cls: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    Icon: CheckCircle2,
    label: "Resolved",
  },
  info: {
    cls: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    Icon: Info,
    label: "Info",
  },
} as const;

function toneConfig(tone: string) {
  return (TONE_CONFIG as unknown as Record<string, { cls: string; Icon: any; label: string }>)[tone] ?? TONE_CONFIG.info;
}

// ─── Route Resolver ───────────────────────────────────────────────────────────

function resolveRoute(n: DBNotification, role: string | undefined): string {
  const relatedId = n.relatedId ?? n.relatedReportId;
  switch (n.type) {
    case "emergency_reported":
    case "emergency_response_required":
    case "emergency_responder_assigned":
    case "emergency_controlled":
    case "emergency_resolved":
      if (role === "security") return "/security/passes";
      if (role === "admin") return "/admin/emergency";
      if (role === "hod") return "/hod/violations";
      if (role === "student") return "/student/violations";
      return "/notifications";
    case "violation_report_created":
    case "critical_security_alert":
    case "violation_escalated":
      if (role === "admin") return "/admin/violations";
      if (role === "hod") return "/hod/violations";
      if (role === "faculty") return "/faculty/reports";
      if (role === "student") return "/student/violations";
      return "/notifications";
    case "student_explanation_submitted":
      if (role === "hod") return "/hod/violations";
      if (role === "student") return "/student/violations";
      if (role === "admin") return "/admin/violations";
      return "/notifications";
    case "violation_review_started":
    case "violation_resolved":
    case "violation_dismissed":
    case "violation_decision_updated":
      if (role === "student") return "/student/violations";
      if (role === "faculty") return "/faculty/reports";
      if (role === "hod") return "/hod/violations";
      if (role === "admin") return "/admin/violations";
      return "/notifications";
    case "gate_pass_requested":
    case "movement_pass_requested":
      if (role === "hod") return "/hod/passes";
      if (role === "student") return "/student/passes";
      if (role === "admin") return "/admin/movement-passes";
      return "/notifications";
    case "gate_pass_approved":
    case "movement_pass_approved":
    case "gate_pass_rejected":
    case "movement_pass_rejected":
    case "movement_pass_cancelled":
    case "movement_pass_revoked":
    case "gate_exit_authorized":
    case "gate_entry_verified":
      if (role === "student") return "/student/passes";
      if (role === "admin") return "/admin/movement-passes";
      if (role === "security") return "/security/passes";
      return "/notifications";
    case "gate_exit_denied":
      if (role === "admin") return "/admin/movement-passes";
      if (role === "security") return "/security/check";
      return "/notifications";
    default:
      if (role === "hod") return "/hod/violations";
      if (role === "student") return "/student/violations";
      if (role === "admin") return "/admin/dashboard";
      return "/notifications";
  }
}

// ─── Time Ago ────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  // ── Load notifications from server ────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyNotificationsApi();
      if (res.success) {
        setNotifications(res.notifications);
      } else {
        toast.error("Failed to load notifications.");
      }
    } catch (err: any) {
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ── Derived ───────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : filter === "read"
      ? notifications.filter((n) => n.read)
      : notifications;

  // ── Mark single read ──────────────────────────────────────────────────

  const handleMarkRead = async (notif: DBNotification) => {
    if (notif.read) return;
    try {
      const res = await markNotificationReadApi({ data: { notifId: notif.id } });
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
        );
      }
    } catch {
      toast.error("Failed to mark notification as read.");
    }
  };

  // ── Mark all read ─────────────────────────────────────────────────────

  const handleMarkAllRead = async () => {
    try {
      const res = await markAllNotificationsReadApi();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        toast.success("All notifications marked as read.");
      }
    } catch {
      toast.error("Failed to mark all as read.");
    }
  };

  // ── Click notification ────────────────────────────────────────────────

  const handleClick = async (n: DBNotification) => {
    await handleMarkRead(n);
    const route = resolveRoute(n, role ?? undefined);
    if (route !== "#") {
      navigate({ to: route as any });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          loading
            ? "Loading your notifications..."
            : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
        }
        breadcrumb={[{ label: "Home", to: "/" }, { label: "System" }, { label: "Notifications" }]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || loading}
              id="mark-all-read-btn"
            >
              <CheckCheck className="size-3.5" />
              Mark all as read
            </Button>
          </>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1 py-0.5 text-[9px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <section className="card-surface overflow-hidden rounded-2xl border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === "unread" ? "No unread notifications" : "You're all caught up"}
            description="New case updates, gate pass decisions, and violation alerts will appear here."
          />
        ) : (
          <ul className="divide-y divide-divider" role="list" aria-label="Notifications">
            {filtered.map((n) => {
              const { cls, Icon, label } = toneConfig(n.tone);
              const route = resolveRoute(n, role ?? undefined);
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition-colors",
                    !n.read && "bg-primary/5",
                    route !== "#" && "cursor-pointer hover:bg-accent/60",
                  )}
                  onClick={() => handleClick(n)}
                  role={route !== "#" ? "button" : undefined}
                  tabIndex={route !== "#" ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleClick(n);
                  }}
                >
                  {/* Tone Icon */}
                  <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", cls)}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs text-foreground", !n.read && "font-semibold")}>{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.detail}</p>
                    <p className="mt-1 text-[10px] text-subtle-foreground font-medium">
                      {label} • {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot + mark read button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && (
                      <>
                        <span className="size-2 rounded-full bg-primary" aria-label="Unread" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          id={`mark-read-${n.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(n);
                          }}
                        >
                          Mark read
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

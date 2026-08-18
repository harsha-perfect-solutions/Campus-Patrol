import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  X,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMyNotificationsApi,
  getUnreadNotificationCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "@/lib/api/notifications.server";
import type { DBNotification } from "@/lib/db/notifications.server";

// ─── Tone Icon Map ──────────────────────────────────────────────────────────

const TONE_CONFIG = {
  violation: { cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", Icon: AlertTriangle },
  pending: { cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", Icon: Clock },
  resolved: { cls: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", Icon: CheckCircle2 },
  info: { cls: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", Icon: Info },
} as const;

function toneConfig(tone: string) {
  return (TONE_CONFIG as unknown as Record<string, { cls: string; Icon: any }>)[tone] ?? TONE_CONFIG.info;
}

// ─── Route Resolver ────────────────────────────────────────────────────────

function resolveNotifRoute(
  n: DBNotification,
  role: string | undefined,
): string {
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
    case "critical_incident":
    case "critical_security_alert":
    case "violation_escalated":
      if (role === "admin") return "/admin/violations";
      if (role === "hod") return "/hod/violations";
      if (role === "student") return "/student/violations";
      if (role === "faculty") return "/faculty/reports";
      return "/notifications";
    case "student_explanation_submitted":
      if (role === "hod") return "/hod/violations";
      if (role === "admin") return "/admin/violations";
      if (role === "student") return "/student/violations";
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

// ─── Time Ago Helper ───────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Notification Bell Component ───────────────────────────────────────────

interface NotificationBellProps {
  role?: string;
  className?: string;
}

export function NotificationBell({ role, className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ── Fetch unread count (polled every 12s for real-time reactivity) ───────

  const refreshUnreadCount = async () => {
    try {
      const res = await getUnreadNotificationCountApi();
      if (res.success) setUnreadCount(res.count);
    } catch {
      // Silent — don't disrupt UX
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 12_000);
    return () => clearInterval(interval);
  }, []);

  // ── Load full notifications when panel opens ──────────────────────────

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMyNotificationsApi()
      .then((res) => {
        if (res.success) setNotifications(res.notifications.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // ── Close on outside click ────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Mark single read & navigate ───────────────────────────────────────

  const handleClick = async (n: DBNotification) => {
    if (!n.read) {
      try {
        await markNotificationReadApi({ data: { notifId: n.id } });
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
    setOpen(false);
    navigate({ to: resolveNotifRoute(n, role) as any });
  };

  // ── Mark all read ─────────────────────────────────────────────────────

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div ref={panelRef} className={cn("relative", className)}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          id="notification-panel"
          className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-border bg-card shadow-xl ring-1 ring-black/5 dark:ring-white/5"
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="grid size-6 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <CheckCheck className="size-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="grid size-6 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Bell className="size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const { cls, Icon } = toneConfig(n.tone);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60",
                          !n.read && "bg-primary/5",
                        )}
                      >
                        <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", cls)}>
                          <Icon className="size-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs text-foreground", !n.read && "font-semibold")}>{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.detail}</p>
                          <p className="mt-1 text-[10px] text-subtle-foreground">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5">
            <button
              onClick={() => {
                setOpen(false);
                navigate({ to: "/notifications" as any });
              }}
              className="flex w-full items-center justify-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              View all notifications
              <ChevronRight className="size-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

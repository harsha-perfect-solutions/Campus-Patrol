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
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    unreadCount,
    notifications,
    loading,
    isConnected,
    markRead,
    markAllRead,
    sendTestNotification,
  } = useRealtimeNotifications();

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
      await markRead(n.id);
    }
    setOpen(false);
    navigate({ to: resolveNotifRoute(n, role) as any });
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div ref={panelRef} className={cn("relative", className)}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground leading-none animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          id="notification-panel"
          className="absolute right-0 top-10 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden animate-in fade-in-50 zoom-in-95"
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card/80 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                {isConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex size-2 rounded-full",
                    isConnected ? "bg-emerald-500" : "bg-amber-400",
                  )}
                  title={isConnected ? "Real-time sync active" : "Syncing..."}
                />
              </span>
              <span className="text-sm font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  title="Mark all as read"
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                >
                  <CheckCheck className="size-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
                <div className="grid size-10 place-items-center rounded-full bg-muted/60 text-muted-foreground/60">
                  <Bell className="size-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">You're all caught up!</p>
                <p className="text-[11px] text-muted-foreground">
                  New violation alerts, emergency actions, and gate pass decisions will appear here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs h-7 gap-1.5"
                  onClick={() => sendTestNotification()}
                >
                  <Sparkles className="size-3 text-primary" />
                  Send test notification
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {notifications.slice(0, 10).map((n) => {
                  const { cls, Icon } = toneConfig(n.tone);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 cursor-pointer",
                          !n.read && "bg-primary/5",
                        )}
                      >
                        <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg shadow-2xs", cls)}>
                          <Icon className="size-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs text-foreground leading-snug", !n.read && "font-semibold")}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
                            {n.detail}
                          </p>
                          <p className="mt-1 text-[10px] text-subtle-foreground font-medium">
                            {timeAgo(n.createdAt)}
                          </p>
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
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 bg-muted/20">
            <button
              onClick={() => sendTestNotification()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Dispatches an immediate live test alert"
            >
              <Sparkles className="size-3 text-primary" />
              Test Alert
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate({ to: "/notifications" as any });
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
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


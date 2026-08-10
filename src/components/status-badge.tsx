import { AlertTriangle, CheckCircle2, Clock, Eye, ShieldAlert } from "lucide-react";
import type { ReportStatus } from "@/lib/cmadms-data";
import { cn } from "@/lib/utils";

const map: Record<
  ReportStatus,
  { label: string; className: string; Icon: typeof Clock }
> = {
  pending: {
    label: "Pending",
    className: "bg-warning-soft text-warning border-warning/30",
    Icon: Clock,
  },
  review: {
    label: "Under Review",
    className: "bg-info-soft text-info border-info/30",
    Icon: Eye,
  },
  resolved: {
    label: "Resolved",
    className: "bg-success-soft text-success border-success/30",
    Icon: CheckCircle2,
  },
  escalated: {
    label: "Escalated",
    className: "bg-destructive-soft text-destructive border-destructive/30",
    Icon: ShieldAlert,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ReportStatus;
  className?: string;
}) {
  const { label, className: tone, Icon } = map[status] ?? map.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    success: "bg-success-soft text-success border-success/30",
    warning: "bg-warning-soft text-warning border-warning/30",
    danger: "bg-destructive-soft text-destructive border-destructive/30",
    info: "bg-info-soft text-info border-info/30",
    neutral: "bg-secondary text-secondary-foreground border-border",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const AlertIcon = AlertTriangle;

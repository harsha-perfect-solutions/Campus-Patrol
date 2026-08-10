import { AlertTriangle, CheckCircle2, Clock, Eye, ShieldAlert, Gavel } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_META, type ViolationStatus } from "@/lib/cmadms-api";
import { cn } from "@/lib/utils";

const tones = {
  success: "bg-success-soft text-success border-success/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  danger: "bg-destructive-soft text-destructive border-destructive/30",
  info: "bg-info-soft text-info border-info/30",
  neutral: "bg-secondary text-secondary-foreground border-border",
} as const;

const icons: Record<ViolationStatus, typeof Clock> = {
  reported: AlertTriangle,
  notified: Eye,
  awaiting_explanation: Clock,
  explanation_submitted: Eye,
  under_review: Gavel,
  exonerated: CheckCircle2,
  warned: CheckCircle2,
  escalated: ShieldAlert,
};

export function StatusBadge({
  status,
  className,
}: {
  status: ViolationStatus;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.reported;
  const Icon = icons[status] ?? Clock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[meta.tone],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
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

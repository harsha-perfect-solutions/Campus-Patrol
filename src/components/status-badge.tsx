import { AlertTriangle, CheckCircle2, Clock, Eye, ShieldAlert, Gavel } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  success: "bg-success-soft text-success border-success/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  danger: "bg-destructive-soft text-destructive border-destructive/30",
  info: "bg-info-soft text-info border-info/30",
  neutral: "bg-secondary text-secondary-foreground border-border",
} as const;

type Meta = { label: string; tone: keyof typeof tones; Icon: typeof Clock };

const map: Record<string, Meta> = {
  pending: { label: "Pending", tone: "warning", Icon: Clock },
  review: { label: "Under Review", tone: "info", Icon: Eye },
  resolved: { label: "Resolved", tone: "success", Icon: CheckCircle2 },
  resolved_by_counselor: { label: "Solved by Counselor", tone: "success", Icon: CheckCircle2 },
  resolved_by_hod: { label: "Resolved by HOD", tone: "success", Icon: CheckCircle2 },
  escalated: { label: "Escalated to HOD", tone: "danger", Icon: ShieldAlert },
  escalated_to_hod: { label: "Escalated to HOD", tone: "danger", Icon: ShieldAlert },
  reported: { label: "Reported", tone: "warning", Icon: AlertTriangle },
  notified: { label: "Student Notified", tone: "info", Icon: Eye },
  awaiting_explanation: { label: "Awaiting Explanation", tone: "warning", Icon: Clock },
  explanation_submitted: { label: "Explanation Submitted", tone: "info", Icon: Eye },
  under_review: { label: "Under Review", tone: "info", Icon: Gavel },
  exonerated: { label: "Exonerated (HOD)", tone: "success", Icon: CheckCircle2 },
  warned: { label: "Warning Issued (HOD)", tone: "success", Icon: CheckCircle2 },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = map[status] ?? map["pending"]!;
  const Icon = meta.Icon;
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

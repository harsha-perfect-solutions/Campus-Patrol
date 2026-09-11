import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PasswordChecklist = {
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
};

export function getPasswordChecklist(password: string): PasswordChecklist {
  return {
    hasMinLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

export function getPasswordStrengthScore(checklist: PasswordChecklist): number {
  let score = 0;
  if (checklist.hasMinLength) score++;
  if (checklist.hasUpper) score++;
  if (checklist.hasLower) score++;
  if (checklist.hasDigit) score++;
  if (checklist.hasSpecial) score++;
  return score;
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const checklist = getPasswordChecklist(password);
  const score = getPasswordStrengthScore(checklist);

  let label = "Very Weak";
  let colorClass = "bg-destructive";
  let textClass = "text-destructive";

  if (score === 5) {
    label = "Strong";
    colorClass = "bg-emerald-500";
    textClass = "text-emerald-600 dark:text-emerald-400";
  } else if (score >= 3) {
    label = "Fair / Moderate";
    colorClass = "bg-amber-500";
    textClass = "text-amber-600 dark:text-amber-400";
  } else if (score >= 1) {
    label = "Weak";
    colorClass = "bg-destructive/80";
    textClass = "text-destructive";
  }

  const items = [
    { label: "At least 8 characters", valid: checklist.hasMinLength },
    { label: "Uppercase letter (A-Z)", valid: checklist.hasUpper },
    { label: "Lowercase letter (a-z)", valid: checklist.hasLower },
    { label: "Number (0-9)", valid: checklist.hasDigit },
    { label: "Special character (@#$%^&*)", valid: checklist.hasSpecial },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 dark:text-slate-400">Password Strength:</span>
        <span className={cn("font-semibold", textClass)}>{label}</span>
      </div>

      {/* Progress Bar */}
      <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              "h-full transition-all duration-300 rounded-full",
              level <= score ? colorClass : "bg-slate-200 dark:bg-slate-800"
            )}
          />
        ))}
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            {item.valid ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            )}
            <span className={cn("text-[11px]", item.valid ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-400 dark:text-slate-500")}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

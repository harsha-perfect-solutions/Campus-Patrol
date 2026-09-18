import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  badge,
  icon,
  className,
}: {
  title: string | ReactNode;
  description?: string | ReactNode;
  breadcrumb?: { label: string; to?: string }[];
  actions?: ReactNode;
  badge?: string | ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  // Helper to format pipe-separated description strings into clean meta chips
  const renderDescription = () => {
    if (!description) return null;
    if (typeof description === "string" && description.includes("|")) {
      const parts = description.split("|").map((p) => p.trim()).filter(Boolean);
      return (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {parts.map((part, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted/60 dark:bg-muted/30 border border-border/60 text-foreground/80 shadow-2xs"
            >
              <span className="size-1.5 rounded-full bg-primary/70 shrink-0" />
              <span>{part}</span>
            </span>
          ))}
        </div>
      );
    }
    return (
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl break-words pt-0.5">
        {description}
      </p>
    );
  };

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card/95 to-accent/10 p-4 sm:p-5 md:p-6 shadow-xs backdrop-blur-md w-full min-w-0 transition-all",
        "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent",
        className,
      )}
    >
      {/* Subtle decorative ambient glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/8 blur-3xl dark:bg-primary/12" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full min-w-0">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Breadcrumb Navigation */}
          {breadcrumb && breadcrumb.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
            >
              {breadcrumb.map((c, i) => {
                const isLast = i === breadcrumb.length - 1;
                const isFirst = i === 0;

                return (
                  <span
                    key={typeof c.label === "string" ? c.label : i}
                    className="flex items-center gap-1.5 max-w-full"
                  >
                    {i > 0 && (
                      <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" aria-hidden />
                    )}
                    {c.to ? (
                      <Link
                        to={c.to}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 hover:bg-primary/10 hover:text-primary text-[11px] font-semibold text-muted-foreground transition-all duration-150 truncate max-w-[150px] sm:max-w-none border border-border/40 hover:border-primary/20 shadow-2xs"
                      >
                        {isFirst && <Home className="size-3 shrink-0 text-muted-foreground/80" />}
                        <span>{c.label}</span>
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          "truncate text-[11px] max-w-[180px] sm:max-w-none px-2 py-0.5 rounded-md transition-colors",
                          isLast
                            ? "bg-primary/10 text-primary font-bold border border-primary/25 shadow-2xs"
                            : "text-muted-foreground font-medium",
                        )}
                      >
                        {c.label}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          {/* Title, Icon & Badge */}
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            {icon && (
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                {icon}
              </div>
            )}
            <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground leading-tight break-words min-w-0">
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 shadow-2xs shrink-0">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                {badge}
              </span>
            )}
          </div>

          {/* Description / Meta Chips */}
          {renderDescription()}
        </div>

        {/* Action Buttons */}
        {actions && (
          <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 pt-1 sm:pt-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}


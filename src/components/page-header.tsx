import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumb?: { label: string; to?: string }[];
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3.5 sm:gap-4 w-full min-w-0">
      <div className="min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-subtle-foreground"
          >
            {breadcrumb.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1 max-w-full">
                {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
                {c.to ? (
                  <Link to={c.to} className="transition-colors hover:text-primary truncate max-w-[140px] sm:max-w-none">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground truncate max-w-[160px] sm:max-w-none">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl leading-snug break-words min-w-0">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 pt-1 sm:pt-0 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}

import React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface ScanStudentIdButtonProps {
  to?: string;
  onClick?: () => void;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function ScanStudentIdButton({
  to = "/faculty/check",
  onClick,
  className,
  size = "default",
}: ScanStudentIdButtonProps) {
  const content = (
    <>
      {/* 1. Left: QR Code Scan Frame Icon */}
      <div className="flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 28 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(size === "sm" ? "size-5" : size === "lg" ? "size-7" : "size-6", "text-white")}
        >
          {/* Outer Scanner Corner Brackets */}
          <path d="M3 8.5V5a2 2 0 0 1 2-2h3.5" />
          <path d="M19.5 3H23a2 2 0 0 1 2 2v3.5" />
          <path d="M25 19.5V23a2 2 0 0 1-2 2h-3.5" />
          <path d="M8.5 25H5a2 2 0 0 1-2-2v-3.5" />

          {/* QR Code Blocks */}
          <rect x="7" y="7" width="4" height="4" rx="0.5" strokeWidth="2" />
          <rect x="17" y="7" width="4" height="4" rx="0.5" strokeWidth="2" />
          <rect x="7" y="17" width="4" height="4" rx="0.5" strokeWidth="2" />

          {/* Inner QR Matrix Dots */}
          <path
            d="M17 17h2v2h-2z M21 17h1v4h-3v-1h2z M13 8h1v3h-1z M8 13h3v1H8z"
            fill="currentColor"
            strokeWidth="0.8"
          />
        </svg>
      </div>

      {/* 2. Vertical Divider Line */}
      <div
        className={cn(
          "w-[1.5px] bg-white/40 rounded-full shrink-0 mx-0.5",
          size === "sm" ? "h-4" : size === "lg" ? "h-6" : "h-5.5"
        )}
      />

      {/* 3. Middle: Student ID Badge Icon */}
      <div className="flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 28 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(size === "sm" ? "w-6 h-4.5" : size === "lg" ? "w-8 h-6" : "w-7 h-5", "text-white")}
        >
          {/* ID Card Outer Border */}
          <rect x="1.5" y="1.5" width="25" height="17" rx="3.5" strokeWidth="2.2" />

          {/* User Avatar Head & Shoulder */}
          <circle cx="8" cy="8.2" r="2.2" strokeWidth="2" />
          <path d="M4.5 15.2c0-1.8 1.6-2.8 3.5-2.8s3.5 1 3.5 2.8" strokeWidth="2" />

          {/* ID Details Text Lines */}
          <line x1="14" y1="7" x2="23" y2="7" strokeWidth="2.2" />
          <line x1="14" y1="12.5" x2="23" y2="12.5" strokeWidth="2.2" />
        </svg>
      </div>

      {/* 4. Text Label */}
      <span
        className={cn(
          "font-semibold tracking-tight text-white select-none whitespace-nowrap",
          size === "sm" ? "text-xs sm:text-sm" : size === "lg" ? "text-base sm:text-lg" : "text-sm sm:text-[15px]"
        )}
      >
        Scan Student ID
      </span>

      {/* 5. Right: Arrow Icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "text-white shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
          size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4.5"
        )}
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </>
  );

  const baseStyles = cn(
    "group inline-flex items-center justify-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-[#003ea3] via-[#0052cc] to-[#0060df] hover:from-[#00368f] hover:via-[#0048b8] hover:to-[#0056cc] text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] border border-white/20",
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseStyles}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className={baseStyles}>
      {content}
    </Link>
  );
}

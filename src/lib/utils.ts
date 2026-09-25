import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates that a string is a valid 10-digit mobile phone number.
 * Accepts pure 10 digits (e.g. "9876543210") or 10 digits with optional +91 / 0 prefix.
 * First digit of the 10-digit Indian number must be between 6-9.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return /^[6-9]\d{9}$/.test(digits.slice(1));
  }
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}

/**
 * Extracts normalized 10-digit phone number.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.slice(-10);
}

/**
 * Formats a 10-digit phone number for display (e.g., "+91 98765 43210" or "9876543210").
 */
export function formatPhoneNumber(phone: string, withPrefix = true): string {
  const norm = normalizePhoneNumber(phone);
  if (norm.length !== 10) return phone;
  if (withPrefix) {
    return `+91 ${norm.slice(0, 5)} ${norm.slice(5)}`;
  }
  return norm;
}

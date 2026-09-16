import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a URL-safe slug from a business name */
export function generateSlug(name: string): string {
  // Normalize accents (e.g., "Café" -> "Cafe")
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const cleaned = normalized
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");

  if (!cleaned) {
    // Guaranteed non-empty URL-safe fallback for non-Latin or emoji-only names
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `business-${randomSuffix}`;
  }

  return cleaned;
}

/** Format a number with K/M suffix */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/** Returns percentage string, handles division by zero */
export function calcPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

/** Get initials from a name for avatar fallback */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Validate Google Review or Google Maps URL */
export function isValidGoogleReviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes("google.") ||
      host.includes("goo.gl") ||
      host.includes("g.page")
    );
  } catch {
    return false;
  }
}

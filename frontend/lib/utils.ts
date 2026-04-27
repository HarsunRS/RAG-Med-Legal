import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen) + "…";
}

export function confidenceColor(score: number): string {
  if (score >= 0.7) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (score >= 0.45) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return "text-rose-400 bg-rose-400/10 border-rose-400/20";
}

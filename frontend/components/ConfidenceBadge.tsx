"use client";
import { cn, confidenceColor } from "@/lib/utils";

interface Props {
  score: number;
}

export default function ConfidenceBadge({ score }: Props) {
  const label =
    score >= 0.7 ? "High" : score >= 0.45 ? "Medium" : "Low";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        confidenceColor(score)
      )}
    >
      {label} {(score * 100).toFixed(0)}%
    </span>
  );
}

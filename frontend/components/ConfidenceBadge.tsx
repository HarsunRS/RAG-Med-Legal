"use client";

interface Props {
  score: number;
}

export default function ConfidenceBadge({ score }: Props) {
  const label = score >= 0.7 ? "High" : score >= 0.45 ? "Med" : "Low";
  const color =
    score >= 0.7
      ? { bg: "#5db87220", text: "#3a8f4e", border: "#5db87240" }
      : score >= 0.45
      ? { bg: "#d4a01720", text: "#a07a10", border: "#d4a01740" }
      : { bg: "#c6454520", text: "#943535", border: "#c6454540" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
        borderRadius: "var(--rounded-pill)",
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {label} {(score * 100).toFixed(0)}%
    </span>
  );
}

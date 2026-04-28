"use client";
import { AlertTriangle } from "lucide-react";

interface Props {
  text: string;
}

export default function DisclaimerBanner({ text }: Props) {
  return (
    <div
      className="flex items-start gap-2"
      style={{
        background: "#e8a55a18",
        border: "1px solid #e8a55a35",
        borderRadius: "var(--rounded-md)",
        padding: "10px 14px",
        fontSize: 12,
        color: "#7a5520",
        lineHeight: 1.5,
      }}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-accent-amber)" }} />
      <span>{text}</span>
    </div>
  );
}

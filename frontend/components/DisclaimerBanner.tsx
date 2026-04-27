"use client";
import { AlertTriangle } from "lucide-react";

interface Props {
  text: string;
}

export default function DisclaimerBanner({ text }: Props) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

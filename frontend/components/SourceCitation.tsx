"use client";
import { FileText } from "lucide-react";
import { SourceChunk } from "@/types";
import ConfidenceBadge from "./ConfidenceBadge";
import { truncate } from "@/lib/utils";

interface Props {
  source: SourceChunk;
  index: number;
}

export default function SourceCitation({ source, index }: Props) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-white/80">
          <FileText className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-blue-400">[SOURCE {index}]</span>
          <span className="truncate">{source.filename}</span>
          <span className="text-white/40">· p.{source.page_number}</span>
        </div>
        <ConfidenceBadge score={source.relevance_score} />
      </div>
      <blockquote className="border-l-2 border-white/20 pl-3 text-xs leading-relaxed text-white/60 italic">
        {truncate(source.passage, 300)}
      </blockquote>
    </div>
  );
}

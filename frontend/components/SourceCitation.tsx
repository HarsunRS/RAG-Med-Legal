"use client";
import { FileText, ExternalLink } from "lucide-react";
import { SourceChunk } from "@/types";
import ConfidenceBadge from "./ConfidenceBadge";
import { truncate } from "@/lib/utils";

interface Props {
  source: SourceChunk;
  index: number;
  onShowSource: (source: SourceChunk) => void;
}

export default function SourceCitation({ source, index, onShowSource }: Props) {
  return (
    <div
      style={{
        background: "var(--color-canvas)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--rounded-lg)",
        padding: "12px 16px",
      }}
    >
      {/* Top row: label + filename + page + badge */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0" style={{ fontSize: 12, fontWeight: 500 }}>
          <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-primary)" }} />
          <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>[SOURCE {index}]</span>
          <span className="truncate" style={{ color: "var(--color-body)" }}>{source.filename}</span>
          <span style={{ color: "var(--color-muted-soft)", whiteSpace: "nowrap" }}>· p.{source.page_number}</span>
        </div>
        <ConfidenceBadge score={source.relevance_score} />
      </div>

      {/* Excerpt */}
      <blockquote
        className="italic mb-3"
        style={{
          borderLeft: "2px solid var(--color-hairline)",
          paddingLeft: 12,
          fontSize: 12,
          color: "var(--color-muted)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {truncate(source.passage, 300)}
      </blockquote>

      {/* Show Source button */}
      <button
        onClick={() => onShowSource(source)}
        className="flex items-center gap-1.5 transition-colors"
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-primary)",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--color-primary-active)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--color-primary)")}
      >
        <ExternalLink className="h-3 w-3" />
        Show Source
      </button>
    </div>
  );
}

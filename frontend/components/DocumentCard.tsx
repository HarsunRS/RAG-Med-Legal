"use client";
import { useState } from "react";
import { Trash2, FileText } from "lucide-react";
import { DocumentRecord } from "@/types";
import { formatDate } from "@/lib/utils";

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  medical: { bg: "#cc785c18", text: "#8a3e22", border: "#cc785c35" },
  legal:   { bg: "#5db8a618", text: "#1f6b5e", border: "#5db8a635" },
  general: { bg: "var(--color-surface-card)", text: "var(--color-muted)", border: "var(--color-hairline)" },
};

interface Props {
  doc: DocumentRecord;
  onDelete: (id: string) => void;
}

export default function DocumentCard({ doc, onDelete }: Props) {
  const [hovered, setHovered] = useState(false);
  const typeStyle = TYPE_STYLES[doc.doc_type] ?? TYPE_STYLES.general;

  return (
    <div
      className="group flex items-start gap-2.5 transition-colors cursor-default"
      style={{
        background: hovered ? "var(--color-surface-dark-elevated)" : "transparent",
        borderRadius: "var(--rounded-md)",
        padding: "8px 10px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-primary)" }} />
      <div className="min-w-0 flex-1">
        <p className="truncate" style={{ fontSize: 13, color: "var(--color-on-dark)", fontWeight: 500, lineHeight: 1.4 }}>
          {doc.filename}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: typeStyle.bg,
              color: typeStyle.text,
              border: `1px solid ${typeStyle.border}`,
              borderRadius: "var(--rounded-pill)",
              padding: "1px 7px",
            }}
          >
            {doc.doc_type}
          </span>
          {doc.doc_date && (
            <span style={{ fontSize: 11, color: "var(--color-on-dark-soft)" }}>{formatDate(doc.doc_date)}</span>
          )}
          <span style={{ fontSize: 11, color: "var(--color-on-dark-soft)" }}>
            {doc.page_count}p · {doc.chunk_count} chunks
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(doc.document_id)}
        className="shrink-0 rounded transition-all opacity-0 group-hover:opacity-100"
        style={{ padding: 4, color: "var(--color-on-dark-soft)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c64545"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-on-dark-soft)"; }}
        title="Delete document"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

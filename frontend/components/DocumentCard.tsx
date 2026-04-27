"use client";
import { Trash2, FileText } from "lucide-react";
import { DocumentRecord } from "@/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  medical: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  legal: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  general: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

interface Props {
  doc: DocumentRecord;
  onDelete: (id: string) => void;
}

export default function DocumentCard({ doc, onDelete }: Props) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-white/8 bg-white/5 p-3 hover:bg-white/8 transition-colors">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/90">{doc.filename}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-block rounded border px-1.5 py-0.5 text-xs",
              TYPE_COLORS[doc.doc_type] ?? TYPE_COLORS.general
            )}
          >
            {doc.doc_type}
          </span>
          {doc.doc_date && (
            <span className="text-xs text-white/40">{formatDate(doc.doc_date)}</span>
          )}
          <span className="text-xs text-white/30">{doc.page_count}p · {doc.chunk_count} chunks</span>
        </div>
      </div>
      <button
        onClick={() => onDelete(doc.document_id)}
        className="shrink-0 rounded p-1 text-white/30 opacity-0 hover:bg-rose-500/20 hover:text-rose-400 group-hover:opacity-100 transition-all"
        title="Delete document"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { DocType, DocumentRecord } from "@/types";
import { deleteDocument, listDocuments } from "@/lib/api";
import DocumentCard from "./DocumentCard";
import FilterBar from "./FilterBar";
import UploadModal from "./UploadModal";

interface Props {
  onFilterChange: (filter: { doc_type?: DocType; document_ids?: string[] }) => void;
}

export default function Sidebar({ onFilterChange }: Props) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [filters, setFilters] = useState({ docType: "" as DocType | "", dateFrom: "", dateTo: "" });
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDocuments({
        doc_type: filters.docType || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });
      setDocs(res.documents as DocumentRecord[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    onFilterChange(filters.docType ? { doc_type: filters.docType } : {});
  }, [filters.docType, onFilterChange]);

  async function handleDelete(id: string) {
    await deleteDocument(id);
    await fetchDocs();
  }

  return (
    <>
      <aside
        className="flex w-72 shrink-0 flex-col"
        style={{ background: "var(--color-surface-dark)", borderRight: "1px solid rgba(250,249,245,0.08)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(250,249,245,0.08)" }}
        >
          <span
            className="font-display"
            style={{ fontSize: 16, color: "var(--color-on-dark)", letterSpacing: "-0.01em" }}
          >
            Documents
          </span>
          <div className="flex gap-1">
            <button
              onClick={fetchDocs}
              title="Refresh"
              className="flex items-center justify-center rounded-full transition-colors"
              style={{
                width: 32, height: 32,
                color: "var(--color-on-dark-soft)",
                background: "transparent",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-dark-elevated)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowUpload(true)}
              title="Upload"
              className="flex items-center justify-center rounded-full transition-colors"
              style={{
                width: 32, height: 32,
                color: "var(--color-on-dark-soft)",
                background: "transparent",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-dark-elevated)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <FilterBar
          docType={filters.docType}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(f) => setFilters(f)}
        />

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {docs.length === 0 && !loading && (
            <p
              className="text-center py-10"
              style={{ fontSize: 13, color: "var(--color-on-dark-soft)", lineHeight: 1.6 }}
            >
              No documents indexed yet.
              <br />Click + to upload a PDF.
            </p>
          )}
          {docs.map((doc) => (
            <DocumentCard key={doc.document_id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>

        {/* Upload CTA */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(250,249,245,0.08)" }}>
          <button
            onClick={() => setShowUpload(true)}
            className="flex w-full items-center justify-center gap-2 transition-colors"
            style={{
              height: 40,
              background: "var(--color-primary)",
              color: "var(--color-on-primary)",
              borderRadius: "var(--rounded-md)",
              fontSize: 14,
              fontWeight: 500,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-primary-active)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--color-primary)")}
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </aside>

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={fetchDocs} />
      )}
    </>
  );
}

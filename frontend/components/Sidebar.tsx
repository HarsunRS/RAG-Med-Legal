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
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#0a0c10]">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <h1 className="text-sm font-semibold text-white/90">Document Library</h1>
          <div className="flex gap-1.5">
            <button onClick={fetchDocs} className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/8 transition-colors" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowUpload(true)} className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/8 transition-colors" title="Upload">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <FilterBar
          docType={filters.docType}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(f) => setFilters(f)}
        />

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {docs.length === 0 && !loading && (
            <p className="text-center text-xs text-white/30 py-8">
              No documents indexed yet.
              <br />Click + to upload a PDF.
            </p>
          )}
          {docs.map((doc) => (
            <DocumentCard key={doc.document_id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <button
            onClick={() => setShowUpload(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/30 py-2 text-sm text-blue-300 hover:bg-blue-600/30 transition-colors"
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

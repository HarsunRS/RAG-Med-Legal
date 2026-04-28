"use client";
import { useEffect, useRef, useState } from "react";
import { X, FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { SourceChunk } from "@/types";
import { getDocumentChunks } from "@/lib/api";

interface Props {
  source: SourceChunk;
  onClose: () => void;
}

export interface PageData {
  pageNumber: number;
  text: string;
}

export function buildPages(chunks: { text: string; page_number: number; chunk_index: number }[]): PageData[] {
  const map = new Map<number, { chunk_index: number; text: string }[]>();
  for (const c of chunks) {
    if (!map.has(c.page_number)) map.set(c.page_number, []);
    map.get(c.page_number)!.push({ chunk_index: c.chunk_index, text: c.text });
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNumber, parts]) => ({
      pageNumber,
      text: parts.sort((a, b) => a.chunk_index - b.chunk_index).map((p) => p.text).join(" "),
    }));
}

export function HighlightedText({ text, excerpt }: { text: string; excerpt: string }) {
  const highlightRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [text, excerpt]);

  if (!excerpt) return <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-body)", whiteSpace: "pre-wrap" }}>{text}</p>;

  const idx = text.indexOf(excerpt);
  if (idx === -1) {
    // Fallback: show full text without highlight
    return <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-body)", whiteSpace: "pre-wrap" }}>{text}</p>;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + excerpt.length);
  const after = text.slice(idx + excerpt.length);

  return (
    <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-body)", whiteSpace: "pre-wrap" }}>
      {before}
      <mark
        ref={highlightRef}
        style={{
          background: "#f5c842",
          color: "var(--color-ink)",
          borderRadius: 3,
          padding: "1px 0",
        }}
      >
        {match}
      </mark>
      {after}
    </p>
  );
}

export default function SourceViewer({ source, onClose }: Props) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(source.page_number);

  useEffect(() => {
    setLoading(true);
    setError("");
    setCurrentPage(source.page_number);
    getDocumentChunks(source.document_id)
      .then((res) => setPages(buildPages(res.chunks)))
      .catch(() => setError("Could not load document text."))
      .finally(() => setLoading(false));
  }, [source.document_id]);

  const pageData = pages.find((p) => p.pageNumber === currentPage);
  const isCurrentSourcePage = currentPage === source.page_number;

  return (
    <>
      {/* Desktop: right-side panel */}
      <div
        className="hidden md:flex flex-col h-full"
        style={{
          width: "42%",
          minWidth: 320,
          borderLeft: "1px solid var(--color-hairline)",
          background: "var(--color-canvas)",
          flexShrink: 0,
        }}
      >
        <PanelContent
          source={source}
          pages={pages}
          loading={loading}
          error={error}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageData={pageData}
          isCurrentSourcePage={isCurrentSourcePage}
          onClose={onClose}
        />
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col"
        style={{
          height: "72vh",
          background: "var(--color-canvas)",
          borderTop: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-xl) var(--rounded-xl) 0 0",
          boxShadow: "0 -4px 32px rgba(20,20,19,0.12)",
        }}
      >
        <PanelContent
          source={source}
          pages={pages}
          loading={loading}
          error={error}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageData={pageData}
          isCurrentSourcePage={isCurrentSourcePage}
          onClose={onClose}
        />
      </div>
    </>
  );
}

function PanelContent({
  source, pages, loading, error,
  currentPage, setCurrentPage, pageData,
  isCurrentSourcePage, onClose,
}: {
  source: SourceChunk;
  pages: PageData[];
  loading: boolean;
  error: string;
  currentPage: number;
  setCurrentPage: (n: number) => void;
  pageData: PageData | undefined;
  isCurrentSourcePage: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--color-hairline)" }}
      >
        <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
        <div className="flex-1 min-w-0">
          <p
            className="truncate font-medium"
            style={{ fontSize: 13, color: "var(--color-ink)" }}
          >
            {source.filename}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-muted)" }}>
            {pages.length > 0 ? `${pages.length} page${pages.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full shrink-0 transition-colors"
          style={{ width: 28, height: 28, color: "var(--color-muted)", background: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-card)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Page navigation */}
      {pages.length > 1 && (
        <div
          className="flex items-center gap-2 px-5 py-2 shrink-0 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--color-hairline-soft)" }}
        >
          <button
            onClick={() => setCurrentPage(Math.max(pages[0].pageNumber, currentPage - 1))}
            disabled={currentPage === pages[0]?.pageNumber}
            className="shrink-0"
            style={{ color: "var(--color-muted)", opacity: currentPage === pages[0]?.pageNumber ? 0.3 : 1 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex gap-1">
            {pages.map((p) => {
              const isSource = p.pageNumber === source.page_number;
              const isActive = p.pageNumber === currentPage;
              return (
                <button
                  key={p.pageNumber}
                  onClick={() => setCurrentPage(p.pageNumber)}
                  className="shrink-0 transition-colors"
                  style={{
                    padding: "2px 8px",
                    borderRadius: "var(--rounded-md)",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? "var(--color-surface-card)" : "transparent",
                    color: isSource ? "var(--color-primary)" : "var(--color-muted)",
                    border: isSource ? "1px solid var(--color-primary)" : "1px solid transparent",
                  }}
                >
                  {p.pageNumber}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(pages[pages.length - 1].pageNumber, currentPage + 1))}
            disabled={currentPage === pages[pages.length - 1]?.pageNumber}
            className="shrink-0"
            style={{ color: "var(--color-muted)", opacity: currentPage === pages[pages.length - 1]?.pageNumber ? 0.3 : 1 }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cited excerpt badge */}
      {isCurrentSourcePage && (
        <div
          className="mx-5 mt-3 shrink-0 flex items-center gap-1.5"
          style={{
            background: "#f5c84220",
            border: "1px solid #f5c84250",
            borderRadius: "var(--rounded-md)",
            padding: "6px 10px",
            fontSize: 12,
            color: "#7a6010",
          }}
        >
          <span style={{ fontWeight: 600 }}>↓ Cited excerpt highlighted below</span>
        </div>
      )}

      {/* Document text */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--color-primary)" }} />
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading document…</span>
          </div>
        )}
        {error && (
          <p style={{ fontSize: 13, color: "var(--color-error)", padding: "16px 0" }}>{error}</p>
        )}
        {!loading && !error && pageData && (
          <HighlightedText
            text={pageData.text}
            excerpt={isCurrentSourcePage ? source.passage : ""}
          />
        )}
        {!loading && !error && !pageData && (
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No text available for this page.</p>
        )}
      </div>
    </>
  );
}

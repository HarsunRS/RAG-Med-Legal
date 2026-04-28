"use client";
import { useState, useCallback } from "react";
import { DocFilter, DocType } from "@/types";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";

export default function Home() {
  const [docFilter, setDocFilter] = useState<DocFilter>({});

  const handleFilterChange = useCallback(
    (filter: { doc_type?: DocType; document_ids?: string[] }) => {
      setDocFilter(filter);
    },
    []
  );

  return (
    <main className="flex h-full overflow-hidden" style={{ background: "var(--color-canvas)" }}>
      <Sidebar onFilterChange={handleFilterChange} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top nav — cream canvas, 64px, hairline bottom */}
        <header
          className="flex shrink-0 items-center justify-between px-8"
          style={{
            height: 64,
            background: "var(--color-canvas)",
            borderBottom: "1px solid var(--color-hairline)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Anthropic-style spike mark */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 1v14M1 8h14M3.05 3.05l9.9 9.9M12.95 3.05l-9.9 9.9" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <h1
                className="font-display leading-none"
                style={{ fontSize: 20, color: "var(--color-ink)", letterSpacing: "-0.02em" }}
              >
                Medical &amp; Legal Q&amp;A
              </h1>
              <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 1 }}>
                Grounded answers · Powered by Ollama llama3.2
              </p>
            </div>
          </div>

          {docFilter.doc_type && (
            <span
              className="font-medium"
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "var(--color-primary)",
                color: "var(--color-on-primary)",
                borderRadius: "var(--rounded-pill)",
                padding: "4px 12px",
              }}
            >
              {docFilter.doc_type}
            </span>
          )}
        </header>

        <ChatPanel docFilter={Object.keys(docFilter).length ? docFilter : undefined} />
      </div>
    </main>
  );
}

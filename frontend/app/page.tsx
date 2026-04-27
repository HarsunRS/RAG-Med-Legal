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
    <main className="flex h-full overflow-hidden">
      <Sidebar onFilterChange={handleFilterChange} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white">Medical &amp; Legal Q&amp;A</h1>
            <p className="text-xs text-white/40">
              Grounded answers from your documents · Powered by Ollama llama3.2
            </p>
          </div>
          {docFilter.doc_type && (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
              Filtering: {docFilter.doc_type}
            </span>
          )}
        </header>
        <ChatPanel docFilter={Object.keys(docFilter).length ? docFilter : undefined} />
      </div>
    </main>
  );
}

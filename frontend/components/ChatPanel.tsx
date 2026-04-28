"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, RotateCcw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { DocFilter, Message, SourceChunk } from "@/types";
import { queryDocuments } from "@/lib/api";
import MessageBubble from "./MessageBubble";
import SourceViewer from "./SourceViewer";

const STORAGE_KEY = "rag_chat_history";

function serializeMessages(msgs: Message[]): string {
  return JSON.stringify(
    msgs.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() }))
  );
}

function deserializeMessages(raw: string): Message[] {
  try {
    return JSON.parse(raw).map((m: Message & { timestamp: string }) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

interface Props {
  docFilter?: DocFilter;
}

export default function ChatPanel({ docFilter }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<SourceChunk | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(deserializeMessages(saved));
    } catch {
      // ignore
    }
  }, []);

  // Persist chat history on every message change
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeMessages(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function clearHistory() {
    setMessages([]);
    setActiveSource(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");

    const userMsg: Message = {
      id: uuidv4(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await queryDocuments(question, docFilter);
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "assistant",
          content: resp.answer,
          response: resp,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: "var(--color-canvas)" }}>
      {/* ── Chat pane ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 max-w-3xl w-full mx-auto">
          {messages.length === 0 && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
              <p
                className="font-display text-center"
                style={{ fontSize: 32, color: "var(--color-ink)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
              >
                Ask your documents
              </p>
              <p style={{ fontSize: 14, color: "var(--color-muted)", textAlign: "center", maxWidth: 360 }}>
                Upload medical records or legal files, then ask precise questions. Every answer cites its source.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onShowSource={setActiveSource} />
          ))}

          {loading && (
            <div className="flex items-center gap-2" style={{ color: "var(--color-muted)", fontSize: 14 }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--color-primary)" }} />
              Retrieving relevant passages…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="px-8 py-5"
          style={{ borderTop: "1px solid var(--color-hairline)", background: "var(--color-canvas)" }}
        >
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <div
              className="flex flex-1 items-end gap-3"
              style={{
                background: "var(--color-canvas)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--rounded-md)",
                padding: "10px 14px",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about your documents… (Enter to send)"
                rows={1}
                className="flex-1 resize-none bg-transparent focus:outline-none"
                style={{ fontSize: 14, color: "var(--color-ink)", lineHeight: 1.55 }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex shrink-0 items-center justify-center transition-colors"
                style={{
                  width: 36, height: 36,
                  background: input.trim() && !loading ? "var(--color-primary)" : "var(--color-primary-disabled)",
                  color: input.trim() && !loading ? "var(--color-on-primary)" : "var(--color-muted)",
                  borderRadius: "var(--rounded-md)",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  border: "none",
                }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Clear chat button */}
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                title="New chat"
                className="flex items-center justify-center transition-colors shrink-0"
                style={{
                  width: 36, height: 36,
                  color: "var(--color-muted)",
                  background: "var(--color-surface-soft)",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "var(--rounded-md)",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-card)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--color-surface-soft)")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Source viewer pane ── */}
      {activeSource && (
        <SourceViewer
          source={activeSource}
          onClose={() => setActiveSource(null)}
        />
      )}
    </div>
  );
}

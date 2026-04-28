"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Send } from "lucide-react";
import { Message } from "@/types";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  loading: boolean;
  activeMsgId: string | null;
  sessionTitle: string;
  onSend: (question: string) => void;
  onNewChat: () => void;
  onSelectSources: (msg: Message) => void;
}

export default function ChatPanel({
  messages,
  loading,
  activeMsgId,
  sessionTitle,
  onSend,
  onNewChat,
  onSelectSources,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    onSend(q);
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        background: "var(--color-canvas)",
      }}
    >
      {/* ── Topbar ── */}
      <div
        style={{
          height: 52,
          borderBottom: "1px solid var(--color-hairline)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          flexShrink: 0,
          background: "white",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--color-ink)",
            }}
          >
            {sessionTitle}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
            Grounded answers · Powered by Ollama llama3.2
          </div>
        </div>

        <button
          onClick={onNewChat}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            background: "var(--color-surface-soft)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-body)",
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--color-surface-card)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--color-surface-soft)")
          }
        >
          <Plus size={12} />
          New chat
        </button>
      </div>

      {/* ── Messages ── */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 10,
              color: "var(--color-muted)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--color-surface-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="var(--color-primary)"
              >
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
              </svg>
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--color-body-strong)",
              }}
            >
              Ask anything about your documents
            </div>
            <div style={{ fontSize: 13 }}>
              Your RAG model will find and cite sources automatically.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{ animation: "fadeIn 0.25s ease" }}
          >
            <MessageBubble
              message={msg}
              isActive={activeMsgId === msg.id}
              onSelectSources={() => onSelectSources(msg)}
            />
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginBottom: 18,
              animation: "fadeIn 0.25s ease",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: "var(--color-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="white"
              >
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
              </svg>
            </div>
            <div
              style={{
                padding: "13px 18px",
                borderRadius: "4px 18px 18px 18px",
                background: "white",
                border: "1px solid var(--color-hairline)",
                display: "flex",
                gap: 5,
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--color-primary)",
                    animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div
        style={{
          padding: "12px 20px 16px",
          borderTop: "1px solid var(--color-hairline)",
          background: "white",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: "var(--color-canvas)",
            border: "1.5px solid var(--color-hairline)",
            borderRadius: 14,
            padding: "10px 10px 10px 16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
            placeholder="Ask about your documents…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              background: "transparent",
              fontSize: 14,
              color: "var(--color-ink)",
              outline: "none",
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: "auto",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: input.trim() && !loading
                ? "var(--color-primary)"
                : "var(--color-surface-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.15s",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            }}
          >
            <Send
              size={14}
              style={{
                color: input.trim() && !loading
                  ? "white"
                  : "var(--color-muted)",
              }}
            />
          </button>
        </div>
        <p
          style={{
            fontSize: 10,
            color: "var(--color-muted)",
            textAlign: "center",
            marginTop: 6,
          }}
        >
          Answers are grounded in your uploaded documents · Always verify with a
          professional
        </p>
      </div>
    </div>
  );
}

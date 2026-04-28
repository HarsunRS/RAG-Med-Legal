"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Message, SourceChunk } from "@/types";
import SourceCitation from "./SourceCitation";
import DisclaimerBanner from "./DisclaimerBanner";

interface Props {
  message: Message;
  onShowSource: (source: SourceChunk) => void;
}

export default function MessageBubble({ message, onShowSource }: Props) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";
  const resp = message.response;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div
          className="mt-1 flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: 28, height: 28,
            background: "var(--color-surface-card)",
            color: "var(--color-muted)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          AI
        </div>
      )}

      <div className={`space-y-2 ${isUser ? "items-end" : "items-start"}`} style={{ maxWidth: "78%" }}>
        {/* Bubble */}
        <div
          style={{
            background: isUser ? "var(--color-primary)" : "var(--color-surface-card)",
            color: isUser ? "var(--color-on-primary)" : "var(--color-body-strong)",
            borderRadius: isUser
              ? `var(--rounded-lg) var(--rounded-sm) var(--rounded-lg) var(--rounded-lg)`
              : `var(--rounded-sm) var(--rounded-lg) var(--rounded-lg) var(--rounded-lg)`,
            padding: "12px 16px",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: "var(--color-ink)" }}>{children}</strong>,
                code: ({ children }) => (
                  <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, background: "var(--color-surface-cream-strong)", padding: "1px 4px", borderRadius: 4 }}>
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Sources toggle */}
        {resp && !isUser && resp.sources.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1 transition-colors"
              style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}
            >
              {showSources ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {resp.sources.length} source{resp.sources.length > 1 ? "s" : ""}
            </button>
            {showSources && (
              <div className="space-y-2">
                {resp.sources.map((s, i) => (
                  <SourceCitation
                    key={s.chunk_id}
                    source={s}
                    index={i + 1}
                    onShowSource={onShowSource}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {resp && !isUser && resp.disclaimer && (
          <DisclaimerBanner text={resp.disclaimer} />
        )}
      </div>
    </div>
  );
}

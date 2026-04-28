"use client";
import React from "react";
import { Message } from "@/types";

interface Props {
  message: Message;
  isActive: boolean;
  onSelectSources: () => void;
}

function renderText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[(?:SOURCE\s+)?[\d¹²³⁴⁵]+\])/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    const m = p.match(/^\[(?:SOURCE\s+)?([¹²³⁴⁵\d]+)\]$/);
    if (m) {
      const num = m[1].replace(
        /[¹²³⁴⁵]/g,
        (c) =>
          ({ "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5" } as Record<string, string>)[c] ?? c
      );
      return (
        <sup
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            background: "var(--color-primary)",
            color: "white",
            borderRadius: 99,
            fontSize: 9,
            fontWeight: 600,
            cursor: "pointer",
            margin: "0 1px",
            verticalAlign: "super",
          }}
        >
          {num}
        </sup>
      );
    }
    return p;
  });
}

export default function MessageBubble({ message, isActive, onSelectSources }: Props) {
  const isUser = message.role === "user";
  const resp = message.response;
  const ts = message.timestamp.toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            maxWidth: "70%",
            padding: "10px 16px",
            borderRadius: "18px 4px 18px 18px",
            background: "var(--color-primary)",
            color: "white",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const paragraphs = message.content.split("\n\n");

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        marginBottom: 18,
        alignItems: "flex-start",
      }}
    >
      {/* AI avatar */}
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
          marginTop: 2,
        }}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="white">
          <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Message bubble */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "4px 18px 18px 18px",
            background: "white",
            border: "1px solid var(--color-hairline)",
            fontSize: 14,
            lineHeight: 1.75,
            color: "var(--color-ink)",
          }}
        >
          {paragraphs.map((para, i) => (
            <p
              key={i}
              style={{ marginBottom: i < paragraphs.length - 1 ? 10 : 0 }}
            >
              {renderText(para)}
            </p>
          ))}
        </div>

        {/* Sources pill + timestamp */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {resp && resp.sources.length > 0 && (
            <button
              onClick={onSelectSources}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 99,
                background: isActive
                  ? "var(--color-primary)"
                  : "var(--color-surface-soft)",
                color: isActive ? "white" : "var(--color-body)",
                fontSize: 11,
                fontWeight: 500,
                transition: "all 0.15s",
                border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-hairline)"}`,
              }}
            >
              {/* quotation icon */}
              <svg
                width={11}
                height={11}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
              </svg>
              {resp.sources.length} source{resp.sources.length > 1 ? "s" : ""}
              {/* chevron */}
              <svg
                width={10}
                height={10}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {isActive ? (
                  <polyline points="6 9 12 15 18 9" />
                ) : (
                  <polyline points="9 18 15 12 9 6" />
                )}
              </svg>
            </button>
          )}
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>{ts}</span>
        </div>
      </div>
    </div>
  );
}

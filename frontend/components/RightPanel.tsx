"use client";
import { useState } from "react";
import { X, FileText, AlertTriangle } from "lucide-react";
import { SourceChunk } from "@/types";

interface Props {
  sources: SourceChunk[];
  activeIdx: number | null;
  onSetActiveIdx: (i: number | null) => void;
  onClose: () => void;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "#4ade80" : pct >= 50 ? "#f59e0b" : "var(--color-primary)";
  const label = pct >= 70 ? "High" : pct >= 50 ? "Med" : "Low";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 48,
          height: 4,
          background: "var(--color-hairline)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color,
          letterSpacing: "0.05em",
        }}
      >
        {label} {pct}%
      </span>
    </div>
  );
}

export default function RightPanel({
  sources,
  activeIdx,
  onSetActiveIdx,
  onClose,
}: Props) {
  return (
    <div
      className="flex flex-col h-full shrink-0"
      style={{
        width: 320,
        borderLeft: "1px solid var(--color-hairline)",
        background: "var(--color-canvas)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--color-hairline)",
        }}
      >
        <div className="flex items-center gap-2">
          {/* quotation mark icon */}
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "-0.01em",
              color: "var(--color-ink)",
            }}
          >
            Sources
          </span>
          <span
            style={{
              fontSize: 11,
              background: "var(--color-surface-card)",
              padding: "1px 7px",
              borderRadius: 99,
              fontWeight: 500,
              color: "var(--color-body)",
            }}
          >
            {sources.length}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ color: "var(--color-muted)", transition: "color 0.15s" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--color-ink)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--color-muted)")
          }
        >
          <X size={16} />
        </button>
      </div>

      {/* Source cards */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}
      >
        {sources.map((src, i) => {
          const isOpen = activeIdx === i;
          return (
            <div
              key={src.chunk_id}
              onClick={() => onSetActiveIdx(isOpen ? null : i)}
              style={{
                borderRadius: 12,
                border: `1.5px solid ${isOpen ? "var(--color-primary)" : "var(--color-hairline)"}`,
                background: isOpen ? "oklch(0.96 0.02 30 / 0.5)" : "white",
                cursor: "pointer",
                overflow: "hidden",
                transition: "all 0.18s",
              }}
            >
              {/* Card header */}
              <div style={{ padding: "10px 12px 8px" }}>
                <div
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: "var(--color-primary)",
                        color: "white",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <FileText
                      size={12}
                      style={{ color: "var(--color-primary)", flexShrink: 0 }}
                    />
                    <span
                      className="truncate"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                      }}
                    >
                      {src.filename}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--color-muted)",
                      flexShrink: 0,
                    }}
                  >
                    p.{src.page_number}
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <ConfidenceBar value={src.relevance_score} />
                </div>
              </div>

              {/* Excerpt */}
              <div
                style={{
                  padding: "8px 12px 10px",
                  borderTop: "1px solid var(--color-hairline-soft)",
                  background: "var(--color-canvas)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    lineHeight: 1.7,
                    color: "var(--color-muted)",
                    fontStyle: "italic",
                    display: "-webkit-box",
                    WebkitLineClamp: isOpen ? 100 : 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  &ldquo;{src.passage}&rdquo;
                </p>
                {!isOpen && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--color-primary)",
                      fontWeight: 500,
                      marginTop: 4,
                      display: "block",
                    }}
                  >
                    Click to expand →
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div
        className="shrink-0"
        style={{ padding: "10px 12px", borderTop: "1px solid var(--color-hairline)" }}
      >
        <div
          className="flex gap-2"
          style={{
            padding: "9px 11px",
            borderRadius: 9,
            background: "#e8a55a18",
            border: "1px solid #e8a55a35",
          }}
        >
          <AlertTriangle
            size={13}
            style={{ color: "#e8a55a", flexShrink: 0, marginTop: 1 }}
          />
          <p style={{ fontSize: 10, color: "#7a5520", lineHeight: 1.55 }}>
            For informational purposes only. Always consult a qualified
            professional.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { ChatSession, DocFilter, DocType, DocumentRecord } from "@/types";
import { deleteDocument, listDocuments } from "@/lib/api";
import UploadModal from "./UploadModal";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  medical: { bg: "oklch(0.92 0.05 200 / 0.6)", text: "oklch(0.35 0.10 200)" },
  legal:   { bg: "oklch(0.92 0.06 30 / 0.6)",  text: "oklch(0.40 0.12 30)"  },
  general: { bg: "oklch(0.93 0.03 280 / 0.6)", text: "oklch(0.40 0.08 280)" },
};

function CategoryBadge({ cat }: { cat: string }) {
  const c = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.general;
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.04em",
        background: c.bg,
        color: c.text,
        textTransform: "uppercase" as const,
      }}
    >
      {cat}
    </span>
  );
}

function groupSessionsByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const groups: Record<string, ChatSession[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const s of sessions) {
    const d = new Date(s.updatedAt).toDateString();
    if (d === today) groups.Today.push(s);
    else if (d === yesterday) groups.Yesterday.push(s);
    else groups.Earlier.push(s);
  }
  return groups;
}

interface Props {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onFilterChange: (filter: DocFilter) => void;
  onUpload: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onFilterChange,
  onUpload,
}: Props) {
  const [tab, setTab] = useState<"chats" | "docs">("chats");
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setDocLoading(true);
    try {
      const res = await listDocuments();
      setDocs(res.documents as DocumentRecord[]);
    } catch {
      // silent
    } finally {
      setDocLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "docs") fetchDocs();
  }, [tab, fetchDocs]);

  async function handleDeleteDoc(id: string) {
    await deleteDocument(id);
    await fetchDocs();
  }

  const grouped = groupSessionsByDate(sessions);
  const accent = "var(--color-primary)";
  const bg = "var(--color-canvas)";
  const border = "var(--color-hairline)";
  const text = "var(--color-ink)";
  const sub = "var(--color-muted)";
  const hover = "var(--color-surface-soft)";
  const activeBg = "var(--color-surface-card)";

  return (
    <aside
      style={{
        width: 260,
        display: "flex",
        flexDirection: "column",
        background: bg,
        borderRight: `1px solid ${border}`,
        flexShrink: 0,
        height: "100%",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "16px 14px 12px",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {/* Spark logo mark */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="white">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
              </svg>
            </div>
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: text,
                letterSpacing: "-0.01em",
              }}
            >
              DocMind
            </span>
          </div>
          <button
            onClick={onNewSession}
            title="New conversation"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: sub,
              transition: "all 0.15s",
              background: "transparent",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = hover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Chats / Library tab switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--color-surface-soft)",
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}
        >
          {(["chats", "docs"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: tab === t ? text : sub,
                background:
                  tab === t ? "white" : "transparent",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              {t === "chats" ? (
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ) : (
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              )}
              {t === "chats" ? "Chats" : "Library"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {tab === "chats" ? (
          /* ── Chat history ── */
          sessions.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                padding: "40px 16px",
                fontSize: 12,
                color: sub,
                lineHeight: 1.6,
              }}
            >
              No conversations yet.
              <br />
              Click + to start one.
            </p>
          ) : (
            Object.entries(grouped)
              .filter(([, v]) => v.length > 0)
              .map(([group, chats]) => (
                <div key={group}>
                  <div
                    style={{
                      padding: "8px 14px 4px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: sub,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {group}
                  </div>
                  {chats.map((chat) => {
                    const isActive = chat.id === activeSessionId;
                    const isHovered = hoveredSessionId === chat.id;
                    return (
                      <div
                        key={chat.id}
                        style={{ position: "relative" }}
                        onMouseEnter={() => setHoveredSessionId(chat.id)}
                        onMouseLeave={() => setHoveredSessionId(null)}
                      >
                        <button
                          onClick={() => onSelectSession(chat.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "9px 14px",
                            paddingRight: isHovered ? 36 : 14,
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                            background: isActive ? activeBg : "transparent",
                            borderLeft: `2px solid ${isActive ? accent : "transparent"}`,
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive)
                              e.currentTarget.style.background = hover;
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive)
                              e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: text,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {chat.title}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: sub,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {chat.messages.find((m) => m.role === "user")
                              ?.content ?? "Empty conversation"}
                          </div>
                          <div style={{ fontSize: 10, color: sub, marginTop: 1 }}>
                            {chat.messages.length} message
                            {chat.messages.length !== 1 ? "s" : ""}
                          </div>
                        </button>

                        {isHovered && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(chat.id);
                            }}
                            title="Delete"
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 22,
                              height: 22,
                              borderRadius: 5,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: sub,
                              background: "transparent",
                              transition: "all 0.12s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "var(--color-surface-cream-strong)";
                              e.currentTarget.style.color =
                                "var(--color-error)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = sub;
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
          )
        ) : (
          /* ── Document library ── */
          <div style={{ padding: "0 8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "4px 6px 6px",
              }}
            >
              <button
                onClick={fetchDocs}
                title="Refresh"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: sub,
                  background: "transparent",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = hover)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <RefreshCw
                  size={12}
                  className={docLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {docs.length === 0 && !docLoading && (
              <p
                style={{
                  textAlign: "center",
                  padding: "30px 12px",
                  fontSize: 12,
                  color: sub,
                  lineHeight: 1.6,
                }}
              >
                No documents indexed yet.
                <br />
                Upload a file to get started.
              </p>
            )}

            {docs.map((doc) => {
              const isHovered = hoveredDocId === doc.document_id;
              return (
                <div
                  key={doc.document_id}
                  style={{
                    padding: "10px",
                    borderRadius: 10,
                    margin: "2px 0",
                    cursor: "pointer",
                    transition: "all 0.12s",
                    background: isHovered ? hover : "transparent",
                    position: "relative",
                  }}
                  onMouseEnter={() => setHoveredDocId(doc.document_id)}
                  onMouseLeave={() => setHoveredDocId(null)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div
                      style={{
                        width: 30,
                        height: 36,
                        borderRadius: 6,
                        background: "var(--color-surface-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width={14}
                        height={14}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={accent}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: text,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {doc.filename}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <CategoryBadge cat={doc.doc_type} />
                        <span style={{ fontSize: 10, color: sub }}>
                          {doc.chunk_count} chunks
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: sub, marginTop: 3 }}>
                        {doc.indexed_at
                          ? new Date(doc.indexed_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )
                          : "—"}
                      </div>
                    </div>

                    {isHovered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc.document_id);
                        }}
                        title="Delete"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: sub,
                          background: "transparent",
                          flexShrink: 0,
                          transition: "all 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "var(--color-surface-cream-strong)";
                          e.currentTarget.style.color = "var(--color-error)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = sub;
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upload button ── */}
      <div
        style={{ padding: 12, borderTop: `1px solid ${border}` }}
      >
        <button
          onClick={onUpload}
          style={{
            width: "100%",
            padding: "9px 14px",
            borderRadius: 10,
            background: accent,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            transition: "opacity 0.15s",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
          Upload Document
        </button>
      </div>
    </aside>
  );
}

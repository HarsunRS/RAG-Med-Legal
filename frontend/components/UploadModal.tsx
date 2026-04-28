"use client";
import { useRef, useState } from "react";
import { X, Upload, FileText, Check, AlertCircle } from "lucide-react";
import { uploadDocuments } from "@/lib/api";

interface Props {
  onClose: () => void;
  onUploaded: () => void;
}


export default function UploadModal({ onClose, onUploaded }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileErrors, setFileErrors] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) return;
    setFiles((prev) => [...prev, ...incoming]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, j) => j !== idx));
  };

  const handleUpload = async () => {
    if (!files.length || uploading || done) return;
    setUploading(true);
    setErrors([]);
    setFileErrors(new Set());
    try {
      const result = await uploadDocuments(files);
      const errSet = new Set((result.errors ?? []).map((e: { filename: string }) => e.filename));
      setFileErrors(errSet);
      const errs = (result.errors ?? []).map(
        (e: { filename: string; error: string }) => `${e.filename}: ${e.error}`
      );
      setErrors(errs);
      setDone(true);
      setTimeout(() => {
        onUploaded();
        onClose();
      }, 1500);
    } catch (err) {
      setFileErrors(new Set(files.map((f) => f.name)));
      setErrors([err instanceof Error ? err.message : "Upload failed"]);
      setUploading(false);
    }
  };

  const isUploading = uploading && !done;

  return (
    <>
      {/* Shimmer keyframe — injected once, no globals.css needed */}
      <style>{`
        @keyframes bar-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)",
        }}
        onClick={(e) => e.target === e.currentTarget && !isUploading && onClose()}
      >
        <div
          style={{
            background: "var(--color-canvas)",
            borderRadius: 20,
            padding: 28,
            width: 560,
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h2 className="font-display-dm" style={{ fontSize: 22, color: "var(--color-ink)" }}>
                Upload Document
              </h2>
              <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                Index a document for RAG retrieval
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-muted)",
                transition: "all 0.15s",
                background: "transparent",
                opacity: isUploading ? 0.4 : 1,
                cursor: isUploading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => !isUploading && (e.currentTarget.style.background = "var(--color-surface-soft)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X size={16} />
            </button>
          </div>

          {/* Drop zone — hidden while uploading */}
          {!isUploading && !done && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--color-primary)" : "var(--color-hairline)"}`,
                borderRadius: 14,
                padding: "28px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: dragging ? "oklch(0.96 0.03 30 / 0.4)" : "var(--color-surface-soft)",
                transition: "all 0.18s",
              }}
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.tiff,.tif,.bmp,.xlsx,.xls,.txt,.csv,.md"
                style={{ display: "none" }}
                onChange={handleSelect}
              />

              {files.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 42,
                          borderRadius: 8,
                          background: "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={16} color="white" />
                      </div>
                      <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
                          {f.size ? (f.size / 1024 / 1024).toFixed(2) + " MB" : "Ready"}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-muted)",
                          background: "transparent",
                          transition: "all 0.12s",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, color: "var(--color-primary)", marginTop: 4 }}>
                    + Click to add more files
                  </p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "white",
                      border: "1px solid var(--color-hairline)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 10px",
                    }}
                  >
                    <Upload size={20} style={{ color: "var(--color-primary)" }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-body-strong)" }}>
                    Drop files here
                  </p>
                  <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
                    PDF, DOCX, images, XLSX, TXT — or click to browse
                  </p>
                </>
              )}
            </div>
          )}

          {/* Per-file rows with indeterminate/done bars */}
          {(isUploading || done) && files.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
              {files.map((f, i) => {
                const hasError = fileErrors.has(f.name);
                const isDone = done && !hasError;

                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Icon */}
                    <div
                      style={{
                        width: 36,
                        height: 42,
                        borderRadius: 8,
                        background: hasError
                          ? "#fee2e2"
                          : isDone
                          ? "oklch(0.92 0.06 140)"
                          : "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "background 0.4s",
                      }}
                    >
                      {hasError ? (
                        <AlertCircle size={15} color="#e53e3e" />
                      ) : isDone ? (
                        <Check size={15} color="oklch(0.38 0.12 140)" />
                      ) : (
                        <FileText size={15} color="white" />
                      )}
                    </div>

                    {/* Name + bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--color-ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: 6,
                        }}
                      >
                        {f.name}
                      </div>

                      {/* Progress track */}
                      <div
                        style={{
                          height: 5,
                          borderRadius: 99,
                          background: "var(--color-surface-card)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: "100%",
                            borderRadius: 99,
                            ...(hasError
                              ? { background: "#e53e3e" }
                              : isDone
                              ? { background: "oklch(0.52 0.14 140)", transition: "background 0.3s" }
                              : {
                                  background:
                                    "linear-gradient(90deg, var(--color-primary) 25%, oklch(0.78 0.12 55) 50%, var(--color-primary) 75%)",
                                  backgroundSize: "300% 100%",
                                  animation: "bar-shimmer 1.6s linear infinite",
                                }),
                          }}
                        />
                      </div>
                    </div>

                    {/* Status label */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: hasError
                          ? "#e53e3e"
                          : isDone
                          ? "oklch(0.38 0.12 140)"
                          : "var(--color-muted)",
                        flexShrink: 0,
                        minWidth: 52,
                        textAlign: "right",
                        transition: "color 0.3s",
                      }}
                    >
                      {hasError ? "Failed" : isDone ? "Indexed" : "Indexing…"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {errors.map((err, i) => (
                <p key={i} style={{ fontSize: 12, color: "#e53e3e" }}>
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Upload button */}
          {!isUploading && (
            <button
              onClick={handleUpload}
              disabled={!files.length || done}
              style={{
                padding: 12,
                borderRadius: 12,
                background: done ? "oklch(0.50 0.14 140)" : "var(--color-primary)",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: !files.length ? 0.5 : 1,
                transition: "all 0.2s",
                letterSpacing: "0.01em",
                cursor: !files.length || done ? "not-allowed" : "pointer",
              }}
            >
              {done ? (
                <>
                  <Check size={16} />
                  Indexed successfully!
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Upload &amp; Index
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

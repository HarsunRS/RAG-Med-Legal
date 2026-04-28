"use client";
import { useRef, useState } from "react";
import { X, Upload, FileText, Check } from "lucide-react";
import { uploadDocuments } from "@/lib/api";

interface Props {
  onClose: () => void;
  onUploaded: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid var(--color-hairline)",
  fontSize: 13,
  background: "white",
  color: "var(--color-ink)",
  outline: "none",
  transition: "border 0.15s",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

export default function UploadModal({ onClose, onUploaded }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("legal");
  const [docDate, setDocDate] = useState("");
  const [source, setSource] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) setFiles((prev) => [...prev, ...selected]);
  };

  const handleUpload = async () => {
    if (!files.length || uploading || done) return;
    setUploading(true);
    setErrors([]);
    try {
      const result = await uploadDocuments(files, {
        doc_type: category,
        doc_date: docDate || undefined,
        source: source || undefined,
      });
      const errs = (result.errors ?? []).map(
        (e: { filename: string; error: string }) => `${e.filename}: ${e.error}`
      );
      setErrors(errs);
      setDone(true);
      setTimeout(() => {
        onUploaded();
        onClose();
      }, 1400);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Upload failed"]);
      setUploading(false);
    }
  };

  return (
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--color-canvas)",
          borderRadius: 20,
          padding: 28,
          width: 460,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2
              className="font-display-dm"
              style={{ fontSize: 22, color: "var(--color-ink)" }}
            >
              Upload Document
            </h2>
            <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
              Index a document for RAG retrieval
            </p>
          </div>
          <button
            onClick={onClose}
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
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--color-surface-soft)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop zone */}
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
            background: dragging
              ? "oklch(0.96 0.03 30 / 0.4)"
              : "var(--color-surface-soft)",
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
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 42,
                      borderRadius: 8,
                      background: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={16} color="white" />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                      }}
                    >
                      {f.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
                      {f.size ? (f.size / 1024 / 1024).toFixed(2) + " MB" : "Ready"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles((prev) => prev.filter((_, j) => j !== i));
                    }}
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
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--color-surface-card)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
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
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-body-strong)",
                }}
              >
                Drop files here
              </p>
              <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
                PDF, DOCX, images, XLSX, TXT — or click to browse
              </p>
            </>
          )}
        </div>

        {/* Category + Date row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={labelStyle}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                ...inputStyle,
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                paddingRight: 32,
              }}
            >
              <option value="legal">Legal</option>
              <option value="medical">Medical</option>
              <option value="general">General</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={labelStyle}>Document Date</label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Source field */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={labelStyle}>
            Source{" "}
            <span
              style={{
                fontWeight: 400,
                textTransform: "none",
                color: "var(--color-muted)",
                letterSpacing: 0,
              }}
            >
              — optional
            </span>
          </label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Indian Bank, Apollo Hospital"
            style={inputStyle}
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {errors.map((err, i) => (
              <p key={i} style={{ fontSize: 12, color: "var(--color-error)" }}>
                {err}
              </p>
            ))}
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!files.length || uploading || done}
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
            opacity: !files.length && !uploading ? 0.5 : 1,
            transition: "all 0.2s",
            letterSpacing: "0.01em",
            cursor: !files.length || uploading || done ? "not-allowed" : "pointer",
          }}
        >
          {done ? (
            <>
              <Check size={16} />
              Indexed successfully!
            </>
          ) : uploading ? (
            <>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Indexing…
            </>
          ) : (
            <>
              <Upload size={15} />
              Upload &amp; Index
            </>
          )}
        </button>
      </div>
    </div>
  );
}

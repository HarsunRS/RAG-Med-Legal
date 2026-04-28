"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { uploadDocuments } from "@/lib/api";

interface Props {
  onClose: () => void;
  onUploaded: () => void;
}

type FileStatus = "pending" | "done" | "error";

interface FileEntry {
  file: File;
  status: FileStatus;
  error?: string;
}

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/tiff": [".tiff", ".tif"],
  "image/bmp": [".bmp"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "text/markdown": [".md"],
};

export default function UploadModal({ onClose, onUploaded }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setEntries((prev) => {
      const existingNames = new Set(prev.map((e) => e.file.name));
      const newOnes = accepted
        .filter((f) => !existingNames.has(f.name))
        .map((f) => ({ file: f, status: "pending" as FileStatus }));
      return [...prev, ...newOnes];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: true,
  });

  function removeFile(name: string) {
    setEntries((prev) => prev.filter((e) => e.file.name !== name));
  }

  async function handleUpload() {
    if (!entries.length || uploading) return;
    setUploading(true);

    try {
      const result = await uploadDocuments(entries.map((e) => e.file));

      const errorMap = new Map(result.errors.map((e) => [e.filename, e.error]));
      const successNames = new Set(result.indexed.map((d) => d.filename));

      setEntries((prev) =>
        prev.map((e) => ({
          ...e,
          status: successNames.has(e.file.name)
            ? "done"
            : errorMap.has(e.file.name)
            ? "error"
            : "error",
          error: errorMap.get(e.file.name),
        }))
      );

      if (result.indexed.length > 0) {
        setDone(true);
        onUploaded();
        setTimeout(onClose, 1200);
      }
    } catch (err) {
      setEntries((prev) =>
        prev.map((e) => ({
          ...e,
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        }))
      );
    } finally {
      setUploading(false);
    }
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(20,20,19,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md flex flex-col"
        style={{
          background: "var(--color-canvas)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-xl)",
          padding: 32,
          boxShadow: "0 8px 40px rgba(20,20,19,0.14)",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between shrink-0">
          <h2
            className="font-display"
            style={{ fontSize: 24, color: "var(--color-ink)", letterSpacing: "-0.03em" }}
          >
            Upload Documents
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full transition-colors"
            style={{ width: 32, height: 32, color: "var(--color-muted)", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-card)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className="flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
          style={{
            border: `2px dashed ${isDragActive ? "var(--color-primary)" : "var(--color-hairline)"}`,
            background: isDragActive ? "#cc785c08" : "var(--color-surface-soft)",
            borderRadius: "var(--rounded-lg)",
            padding: "24px",
            marginBottom: 16,
          }}
        >
          <input {...getInputProps()} />
          <Upload className="h-6 w-6" style={{ color: "var(--color-muted)" }} />
          <p style={{ fontSize: 13, color: "var(--color-muted)", textAlign: "center", lineHeight: 1.5 }}>
            {isDragActive ? "Drop files here…" : "Drop files here or click to browse"}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-muted-soft)", textAlign: "center" }}>
            PDF · Word · Excel · PNG · JPG · WEBP · TXT
          </p>
        </div>

        {/* File list */}
        {entries.length > 0 && (
          <div
            className="overflow-y-auto space-y-1.5 mb-5"
            style={{ maxHeight: 220 }}
          >
            {entries.map((entry) => (
              <div
                key={entry.file.name}
                className="flex items-center gap-2.5"
                style={{
                  background: "var(--color-surface-soft)",
                  borderRadius: "var(--rounded-md)",
                  padding: "8px 12px",
                }}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-primary)" }} />
                <span
                  className="flex-1 truncate"
                  style={{ fontSize: 13, color: "var(--color-body-strong)" }}
                >
                  {entry.file.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-muted-soft)", whiteSpace: "nowrap" }}>
                  {(entry.file.size / 1024).toFixed(0)} KB
                </span>

                {entry.status === "pending" && !uploading && (
                  <button
                    onClick={() => removeFile(entry.file.name)}
                    style={{ color: "var(--color-muted-soft)", flexShrink: 0 }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {entry.status === "pending" && uploading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: "var(--color-primary)" }} />
                )}
                {entry.status === "done" && (
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-success)" }} />
                )}
                {entry.status === "error" && (
                  <span
                    className="flex items-center gap-1 shrink-0"
                    title={entry.error}
                    style={{ color: "var(--color-error)", fontSize: 11 }}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error summary */}
        {entries.some((e) => e.status === "error") && (
          <div
            className="mb-4 space-y-1 shrink-0"
            style={{ fontSize: 12, color: "var(--color-error)" }}
          >
            {entries
              .filter((e) => e.status === "error" && e.error)
              .map((e) => (
                <p key={e.file.name}>{e.file.name}: {e.error}</p>
              ))}
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!pendingCount || uploading || done}
          className="flex w-full items-center justify-center gap-2 transition-colors shrink-0"
          style={{
            height: 40,
            background: pendingCount && !uploading && !done ? "var(--color-primary)" : "var(--color-primary-disabled)",
            color: pendingCount && !uploading && !done ? "var(--color-on-primary)" : "var(--color-muted)",
            borderRadius: "var(--rounded-md)",
            fontSize: 14,
            fontWeight: 500,
            cursor: pendingCount && !uploading && !done ? "pointer" : "not-allowed",
            border: "none",
          }}
          onMouseEnter={e => { if (pendingCount && !uploading && !done) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-primary-active)"; }}
          onMouseLeave={e => { if (pendingCount && !uploading && !done) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-primary)"; }}
        >
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {done && <CheckCircle className="h-4 w-4" style={{ color: "var(--color-success)" }} />}
          {uploading
            ? "Indexing…"
            : done
            ? "Done!"
            : pendingCount
            ? `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`
            : "Select files to upload"}
        </button>
      </div>
    </div>
  );
}

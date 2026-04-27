"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Loader2, CheckCircle } from "lucide-react";
import { DocType } from "@/types";
import { uploadDocument } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onUploaded: () => void;
}

export default function UploadModal({ onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>("medical");
  const [docDate, setDocDate] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setError("");
    try {
      await uploadDocument(file, docType, docDate || undefined, source || undefined);
      setStatus("done");
      setTimeout(() => {
        onUploaded();
        onClose();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Upload Document</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-white/40 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
            isDragActive ? "border-blue-500 bg-blue-500/10" : "border-white/15 hover:border-white/30"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-white/40" />
          {file ? (
            <p className="text-sm font-medium text-white/80">{file.name}</p>
          ) : (
            <p className="text-sm text-white/40">Drop a PDF here or click to browse</p>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-3 mb-5">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="medical">Medical</option>
            <option value="legal">Legal</option>
            <option value="general">General</option>
          </select>
          <input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Document date (optional)"
          />
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (e.g. Hospital, Law Firm) — optional"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && <p className="mb-3 text-xs text-rose-400">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={!file || status === "uploading" || status === "done"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "done" && <CheckCircle className="h-4 w-4 text-emerald-400" />}
          {status === "uploading" ? "Indexing…" : status === "done" ? "Indexed!" : "Upload & Index"}
        </button>
      </div>
    </div>
  );
}

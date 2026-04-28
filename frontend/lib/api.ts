import { DocFilter, DocType, DocumentChunk, DocumentRecord, QueryResponse, UploadResult } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadDocuments(
  files: File[],
  options?: { doc_type?: string; doc_date?: string; source?: string }
): Promise<UploadResult> {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  if (options?.doc_type) form.append("doc_type", options.doc_type);
  if (options?.doc_date) form.append("doc_date", options.doc_date);
  if (options?.source)   form.append("source",   options.source);
  return request<UploadResult>("/api/v1/documents/upload", {
    method: "POST",
    body: form,
  });
}

export async function listDocuments(params?: {
  doc_type?: DocType;
  date_from?: string;
  date_to?: string;
}): Promise<{ documents: DocumentRecord[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.doc_type) qs.set("doc_type", params.doc_type);
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  const query = qs.toString() ? `?${qs}` : "";
  return request(`/api/v1/documents${query}`);
}

export async function deleteDocument(documentId: string): Promise<void> {
  await request(`/api/v1/documents/${documentId}`, { method: "DELETE" });
}

export async function queryDocuments(
  question: string,
  docFilter?: DocFilter,
  topK = 5
): Promise<QueryResponse> {
  return request<QueryResponse>("/api/v1/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, doc_filter: docFilter, top_k: topK }),
  });
}

export async function getDocumentChunks(
  documentId: string
): Promise<{ document_id: string; chunks: DocumentChunk[] }> {
  return request(`/api/v1/documents/${documentId}/chunks`);
}

export async function getHealth(): Promise<unknown> {
  return request("/api/v1/health");
}

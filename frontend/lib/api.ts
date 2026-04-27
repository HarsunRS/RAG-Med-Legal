import { DocFilter, DocType, DocumentRecord, QueryResponse } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function uploadDocument(
  file: File,
  docType: DocType,
  docDate?: string,
  source?: string
): Promise<DocumentRecord> {
  const form = new FormData();
  form.append("file", file);
  form.append("doc_type", docType);
  if (docDate) form.append("doc_date", docDate);
  if (source) form.append("source", source);
  return request<DocumentRecord>("/api/v1/documents/upload", {
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

export async function getHealth(): Promise<unknown> {
  return request("/api/v1/health");
}

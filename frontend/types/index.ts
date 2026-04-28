export type DocType = "medical" | "legal" | "general";

export interface DocumentRecord {
  document_id: string;
  filename: string;
  doc_type: DocType;
  doc_date: string | null;
  source: string | null;
  page_count: number;
  chunk_count: number;
  indexed_at: string;
  status: string;
}

export interface SourceChunk {
  chunk_id: string;
  document_id: string;
  filename: string;
  doc_type: DocType;
  page_number: number;
  passage: string;
  relevance_score: number;
  char_start: number;
  char_end: number;
}

export interface QueryResponse {
  answer: string;
  confidence: number;
  sources: SourceChunk[];
  disclaimer: string;
  grounded: boolean;
  insufficient_context: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: QueryResponse;
  timestamp: Date;
}

export interface DocumentChunk {
  chunk_id: string;
  text: string;
  page_number: number;
  chunk_index: number;
  char_start: number;
  char_end: number;
}

export interface UploadResult {
  indexed: DocumentRecord[];
  errors: { filename: string; error: string }[];
}

export interface DocFilter {
  doc_type?: DocType;
  document_ids?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

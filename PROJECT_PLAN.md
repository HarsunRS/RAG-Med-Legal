# DocMind — Project Architecture & Working Plan

---

## 1. What It Does

DocMind is a local RAG (Retrieval-Augmented Generation) system for medical and legal documents. You upload PDFs, Word docs, images, spreadsheets, or plain text. Every document is indexed into a vector database. You then ask questions in plain English and get cited, grounded answers — every claim links back to the exact page and passage it came from. The LLM is never allowed to speculate beyond what the documents contain.

---

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| LLM | Ollama (llama3.2) | Runs locally, no data leaves the machine |
| Embeddings | all-MiniLM-L6-v2 (sentence-transformers) | Fast, 384-dim vectors, good semantic recall |
| Vector store | ChromaDB (persistent) | Built-in metadata filters for doc_type/doc_id; no SQLite sidecar needed |
| Backend | FastAPI + Python | Async, type-safe, auto-generates /docs |
| PDF extraction | pypdf → pdfminer.six → Tesseract OCR | Three-stage fallback for scanned/corrupt PDFs |
| Office formats | python-docx, openpyxl | DOCX + Excel support |
| Frontend | Next.js 16 + React 19 + TypeScript | Server/client separation, App Router |
| Styling | Tailwind CSS v4 + CSS custom properties | Design tokens for the warm cream palette |
| Icons | lucide-react | Consistent SVG icon set |

---

## 3. Directory Tree

```
rag-medical-legal/
├── backend/
│   ├── main.py                          # FastAPI app + lifespan startup
│   ├── requirements.txt                 # All Python dependencies
│   ├── .env                             # Runtime config (see Section 6)
│   ├── Modelfile                        # Custom Ollama model definition
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── documents.py             # Upload, list, delete, get-chunks endpoints
│   │   │   ├── query.py                 # POST /query endpoint
│   │   │   └── health.py               # GET /health endpoint
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic settings (reads .env)
│   │   │   └── disclaimers.py          # Medical / legal / general disclaimer text
│   │   ├── models/
│   │   │   ├── document.py             # DocumentMetadata, DocumentRecord, ChunkRecord
│   │   │   └── query.py                # QueryRequest, QueryResponse, SourceChunk, DocFilter
│   │   └── services/
│   │       ├── document_processor.py   # Multi-format extraction + sliding-window chunking
│   │       ├── embedder.py             # SentenceTransformer singleton wrapper
│   │       ├── vector_store.py         # ChromaDB add / query / delete / list
│   │       ├── rag_pipeline.py         # Core RAG: embed → retrieve → prompt → generate
│   │       ├── ollama_client.py        # Ollama /api/chat HTTP client
│   │       └── hf_llm_client.py        # HuggingFace local model client (post fine-tune)
│   ├── scripts/
│   │   └── generate_training_data.py   # Mine ChromaDB → ChatML JSONL for fine-tuning
│   └── data/
│       ├── chroma_db/                  # Persistent vector store (git-ignored)
│       └── uploads/                    # Temp upload staging (git-ignored)
│
└── frontend/
    ├── app/
    │   ├── layout.tsx                  # Root layout: fonts, metadata
    │   ├── page.tsx                    # Main chat interface (all state lives here)
    │   └── globals.css                 # Design tokens + keyframe animations
    ├── components/
    │   ├── Sidebar.tsx                 # Chat history + document library (two tabs)
    │   ├── ChatPanel.tsx               # Message list + input bar
    │   ├── MessageBubble.tsx           # Renders one chat message + source chips
    │   ├── RightPanel.tsx              # Slide-in cited sources viewer
    │   ├── UploadModal.tsx             # Drag-drop file upload modal
    │   ├── WelcomeTour.tsx             # First-visit onboarding modal (4 steps)
    │   ├── ConfidenceBadge.tsx         # Green/amber/red confidence indicator
    │   ├── SourceViewer.tsx            # Full document text with highlighted excerpt
    │   ├── FilterBar.tsx               # Doc-type filter (available, not in main flow)
    │   ├── DocumentCard.tsx            # Sidebar document row
    │   └── DisclaimerBanner.tsx        # Sticky medical/legal disclaimer strip
    ├── lib/
    │   ├── api.ts                      # Typed fetch wrappers for all endpoints
    │   └── utils.ts                    # cn(), formatDate(), confidenceColor()
    ├── types/
    │   └── index.ts                    # All TypeScript interfaces
    ├── .env.local                      # NEXT_PUBLIC_API_URL=http://localhost:8000
    └── package.json
```

---

## 4. How a Document Upload Works (End-to-End)

```
User drops file in UploadModal
        │
        ▼
uploadDocuments(files)          [lib/api.ts:14]
POST /api/v1/documents/upload   [documents.py:26]
(multipart form data)
        │
        ▼
For each file:
  1. Validate extension + size (≤ 50 MB)
  2. Save to ./data/uploads/
  3. process_file(path, filename)          [document_processor.py:189]
        │
        ├─ PDF  → _extract_pdf()           [lines 32–49]
        │         pypdf page-by-page
        │         → pdfminer fallback if empty
        │         → Tesseract OCR fallback if still empty
        │
        ├─ Image → _extract_image()        [lines 81–89]
        │          Tesseract directly
        │
        ├─ DOCX → _extract_docx()          [lines 92–108]
        │         python-docx paragraphs grouped into virtual pages
        │
        ├─ XLSX → _extract_excel()         [lines 110–126]
        │         openpyxl, sheet-by-sheet flattening
        │
        └─ TXT/CSV/MD → _extract_text()    [lines 128–134]
                         raw file read
        │
        ▼
  Returns list[(page_number, text)]
        │
        ▼
  chunk_pages(pages)                       [document_processor.py:157]
  Sliding window: 512 words, 50-word overlap
  Each chunk carries: page_number, chunk_index, char_start, char_end
        │
        ▼
  embedder.embed(chunk_texts)              [embedder.py:17]
  all-MiniLM-L6-v2 → 384-dim float vectors
        │
        ▼
  vectorstore.add_chunks(chunks, vecs)     [vector_store.py:34]
  Batch upsert to ChromaDB (100 at a time)
  Metadata stored per chunk:
    document_id, filename, doc_type, page_number,
    chunk_index, char_start, char_end, indexed_at
        │
        ▼
Return UploadResult { indexed: [...], errors: [...] }
        │
        ▼
Frontend shows per-file shimmer bar → green "Indexed" on success
Modal auto-closes after 1.5 s
```

---

## 5. How a Query Works (End-to-End)

```
User types question → presses Enter or Send
        │
        ▼
handleSend(question)                       [page.tsx:149]
Adds user message to session state
        │
        ▼
queryDocuments(question, docFilter?, 5)    [lib/api.ts:46]
POST /api/v1/query
{ question, doc_filter?, top_k: 5 }
        │
        ▼
RAGPipeline.answer()                       [rag_pipeline.py:112]
        │
        ├─ 1. embedder.embed_one(question)
        │       → 384-dim query vector
        │
        ├─ 2. vectorstore.query(vec, 5, where_filter)   [vector_store.py:76]
        │       ChromaDB cosine similarity search
        │       Optional where: { doc_type: "medical" } or { document_id: [...] }
        │       Returns top-5 chunks with text + metadata + distance
        │
        ├─ 3. Confidence gate
        │       distance [0,2] → relevance = 1 - (distance / 2)
        │       If max(relevance) < 0.35:
        │         return insufficient_context=True, no LLM call
        │
        ├─ 4. _build_system_prompt(doc_types)           [rag_pipeline.py:39]
        │       Core rules (always):
        │         • Answer ONLY from passages
        │         • Cite with [SOURCE N]
        │         • Bold key findings
        │         • No speculation
        │       + Medical branch (if medical chunks retrieved):
        │         • Quote dosages/dates exactly
        │         • Flag contraindications
        │       + Legal branch (if legal chunks retrieved):
        │         • Quote defined terms, clause numbers
        │         • Flag ambiguous language
        │
        ├─ 5. _build_messages(question, chunks)         [rag_pipeline.py:78]
        │       User message contains:
        │         [SOURCE 1] — filename.pdf, page 3 [relevance: 87%]
        │         <chunk text>
        │
        │         [SOURCE 2] — other.pdf, page 7 [relevance: 74%]
        │         <chunk text>
        │         ...
        │         QUESTION: <question>
        │         Think step by step. Cite every claim with [SOURCE N]...
        │
        ├─ 6. ollama_client.chat(system, user)          [ollama_client.py:28]
        │       POST http://127.0.0.1:11434/api/chat
        │       Model: llama3.2 (or docmind-rag if Modelfile applied)
        │       Options: temp=0.05, top_k=30, top_p=0.85,
        │                repeat_penalty=1.15, num_predict=1024
        │       Retries: 3× with exponential backoff
        │       Timeout: 180 s
        │
        └─ 7. Post-process
                confidence = avg(top-3 relevance scores)
                disclaimer = MEDICAL > LEGAL > GENERAL (based on doc_types retrieved)
                Build SourceChunk[] with passage text + metadata
        │
        ▼
Return QueryResponse {
  answer, confidence, sources[], disclaimer,
  grounded: true, insufficient_context: false
}
        │
        ▼
handleSend() adds assistant Message to session
Page auto-opens RightPanel with sources
Message persisted to localStorage
        │
        ▼
MessageBubble renders answer:
  • **bold** text
  • [SOURCE N] → accent superscript badge (clickable)
  • "N sources" pill below bubble

RightPanel renders SourceChunk[]:
  • Numbered cards with filename + page
  • Confidence bar (green / amber / red)
  • Expandable passage excerpt
  • Disclaimer footer
```

---

## 6. Configuration

### Backend (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server address |
| `OLLAMA_MODEL` | `llama3.2` | Model name (change to `docmind-rag` after Modelfile) |
| `CHROMA_PERSIST_PATH` | `./data/chroma_db` | Where vectors are stored on disk |
| `CHROMA_COLLECTION_NAME` | `rag_docs` | ChromaDB collection name |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | SentenceTransformer model |
| `CHUNK_SIZE` | `512` | Max words per chunk |
| `CHUNK_OVERLAP` | `50` | Overlap words between adjacent chunks |
| `TOP_K_CHUNKS` | `5` | Chunks retrieved per query |
| `MAX_PDF_SIZE_MB` | `50` | Upload size limit |
| `LLM_BACKEND` | `ollama` | `ollama` or `huggingface` |
| `HF_MODEL_PATH` | `` | Path to fine-tuned model (if huggingface) |

### Frontend (`frontend/.env.local`)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

---

## 7. API Endpoints

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/v1/documents/upload` | Upload + index one or more files |
| `GET` | `/api/v1/documents` | List all indexed documents (filter by doc_type, date) |
| `DELETE` | `/api/v1/documents/{id}` | Remove a document and all its chunks from ChromaDB |
| `GET` | `/api/v1/documents/{id}/chunks` | Return all stored chunks for a document (transparency) |
| `POST` | `/api/v1/query` | RAG query → answer + sources + confidence + disclaimer |
| `GET` | `/api/v1/health` | Ollama + ChromaDB status, model name, doc/chunk counts |

Full interactive docs available at `http://localhost:8000/docs` when the server is running.

---

## 8. Frontend State & Persistence

All state lives in `app/page.tsx`. It is passed down as props — no context or global store.

| State | Type | Persisted? | Purpose |
|---|---|---|---|
| `sessions` | `ChatSession[]` | localStorage (`rag_sessions`) | All conversations |
| `activeSessionId` | `string` | localStorage (`rag_active_session_id`) | Which chat is open |
| `loading` | `boolean` | No | Query in-flight indicator |
| `citSources` | `SourceChunk[] \| null` | No | Sources shown in RightPanel |
| `activeMsgId` | `string \| null` | No | Which message's sources are highlighted |
| `showUpload` | `boolean` | No | UploadModal visibility |
| `showTour` | `boolean` | localStorage (`rag_tour_seen`) | WelcomeTour — shown once |

Sessions are serialised with ISO timestamps on write and deserialised back to `Date` objects on read, avoiding hydration mismatches (localStorage is only accessed inside `useEffect`).

---

## 9. Prompt Engineering

Located in `backend/app/services/rag_pipeline.py`.

**`_build_system_prompt(doc_types)`** — builds a domain-aware system message:
- Always: cite with `[SOURCE N]`, answer only from passages, bold key findings, refuse to speculate
- If medical chunks: quote dosages/lab values exactly, flag contraindications, never recommend treatment
- If legal chunks: quote clause numbers and defined terms verbatim, flag ambiguities, never give legal advice

**`_build_messages(question, chunks)`** — builds the user message:
- Each chunk formatted as: `[SOURCE N] — filename.pdf, page X [relevance: 87%]`
- Chain-of-thought footer: *"Think step by step. Cite every claim. If passages are insufficient, state what is missing."*

These two feed the `/api/chat` endpoint (system + user role separation), which produces better instruction-following than a single concatenated string.

**Sampling parameters** (`ollama_client.py`):

| Parameter | Value | Effect |
|---|---|---|
| `temperature` | 0.05 | Near-deterministic, minimises hallucination |
| `top_k` | 30 | Narrow token candidate pool |
| `top_p` | 0.85 | Nucleus sampling cutoff |
| `repeat_penalty` | 1.15 | Prevents boilerplate repetition |
| `num_predict` | 1024 | Allows detailed multi-part answers |
| `num_ctx` | 4096 | Context window (fits ~5 chunks + full prompt) |

---

## 10. Fine-Tuning

### Option A — Modelfile (5 minutes, no GPU)

Bakes the DocMind system prompt + sampling params permanently into a named Ollama model.

```bash
cd backend
ollama create docmind-rag -f Modelfile
# Then in .env:
OLLAMA_MODEL=docmind-rag
```

The Modelfile is at `backend/Modelfile`.

### Option B — LoRA Fine-Tune (hours, needs GPU)

1. Generate training data from your own indexed documents:

```bash
cd backend && source venv/bin/activate
python scripts/generate_training_data.py --pairs 3
# Produces: training_data.jsonl (ChatML format)
```

The script mines every chunk in ChromaDB, asks the current model to generate Q&A pairs for each passage, and saves them as ChatML JSONL with resume support.

2. Fine-tune with Unsloth (fastest free option):

```bash
pip install unsloth
# Use unsloth/llama-3.2-3b-bnb-4bit as base
# Train on training_data.jsonl
# Merge adapter → export to GGUF
```

3. Import into Ollama:

```bash
# Update the FROM line in backend/Modelfile to point to your .gguf
ollama create docmind-ft -f Modelfile
# Then in .env:
OLLAMA_MODEL=docmind-ft
LLM_BACKEND=ollama
```

---

## 11. How to Run Locally

```bash
# Terminal 1 — Ollama (must be running before backend starts)
ollama serve

# Terminal 2 — Backend
cd rag-medical-legal/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs

# Terminal 3 — Frontend
cd rag-medical-legal/frontend
npm install
npm run dev
# UI: http://localhost:3000
```

On first load, the WelcomeTour modal walks through the four core features. It is shown once and never again (keyed to `rag_tour_seen` in localStorage).

---

## 12. Component Responsibility Map

| Component | File | Owned by | What it does |
|---|---|---|---|
| Main page | `app/page.tsx` | State root | Holds all session + source state, calls API, orchestrates layout |
| Sidebar | `Sidebar.tsx` | `page.tsx` | Chats tab (session list) + Docs tab (document library) |
| ChatPanel | `ChatPanel.tsx` | `page.tsx` | Topbar, message list, typing indicator, input bar |
| MessageBubble | `MessageBubble.tsx` | `ChatPanel.tsx` | One message: text with bold/citations, source pill, timestamp |
| RightPanel | `RightPanel.tsx` | `page.tsx` | Slide-in source cards with confidence bars + expandable excerpts |
| UploadModal | `UploadModal.tsx` | `page.tsx` | Drag-drop upload, shimmer progress bars, success state |
| WelcomeTour | `WelcomeTour.tsx` | `page.tsx` | 4-step onboarding, shown once, suppressed via localStorage |
| SourceViewer | `SourceViewer.tsx` | (available) | Full document text with highlighted excerpt + page nav |
| ConfidenceBadge | `ConfidenceBadge.tsx` | `RightPanel.tsx` | Score → green/amber/red badge |
| API client | `lib/api.ts` | All components | Typed fetch wrappers for all 6 endpoints |

---

## 13. Design System

All colours, radii, and spacing use CSS custom properties defined in `globals.css`.

| Token | Value | Used for |
|---|---|---|
| `--color-primary` | `#d6771f` | Buttons, badges, active states, accent |
| `--color-canvas` | `#faf9f5` | Page background (warm cream) |
| `--color-ink` | `#141413` | Primary text |
| `--color-muted` | `#6c6a64` | Secondary text, placeholders |
| `--color-surface-soft` | `#f5f0e8` | Input backgrounds, drop zones |
| `--color-surface-card` | `#efe9de` | Cards, hover states |
| `--color-surface-dark` | `#181715` | Sidebar background |
| `--color-hairline` | `#e6dfd8` | Borders, dividers |

**Fonts**: DM Serif Display (modal titles), Cormorant Garamond (display), Inter (body)

**Animations**: `fadeIn` (messages), `pulse` (typing dots), `spin` (spinners), `bar-shimmer` (upload progress), `tour-in` (welcome modal)

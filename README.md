# DocMind — RAG for Medical & Legal Documents

A local Retrieval-Augmented Generation (RAG) system that lets you upload medical and legal documents and ask precise, grounded questions. Every answer cites the exact page and passage it came from. The LLM runs entirely on your machine — no data leaves your device.

---

## Features

- Upload PDFs, Word docs, images, spreadsheets, and plain text
- Ask questions in plain English — no search syntax needed
- Every answer cites `[SOURCE N]` linked to the exact page and passage
- Confidence scores per source (green / amber / red)
- Domain-aware prompting — separate rules for medical vs legal documents
- Refuses to answer when context is insufficient (threshold: 0.35 relevance)
- Multi-session chat history, persisted in localStorage
- Fine-tuning scaffolding: Modelfile + training data generator

---

## Stack

| Layer | Technology |
|---|---|
| LLM | Ollama (llama3.2, local) |
| Embeddings | all-MiniLM-L6-v2 (sentence-transformers) |
| Vector store | ChromaDB (persistent, cosine similarity) |
| Backend | FastAPI + Python 3.11+ |
| PDF extraction | pypdf → pdfminer.six → Tesseract OCR (3-stage fallback) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |

---

## Prerequisites

Install these before cloning:

| Tool | Install |
|---|---|
| Python 3.11+ | https://python.org |
| Node.js 20+ | https://nodejs.org |
| Ollama | https://ollama.com |
| Tesseract OCR | `brew install tesseract` (macOS) / `apt install tesseract-ocr` (Linux) |
| Git | https://git-scm.com |

---

## Setup & Run

### 1. Clone the repo

```bash
git clone https://github.com/HarsunRS/RAG-Med-Legal.git
cd RAG-Med-Legal
```

---

### 2. Pull the LLM

```bash
ollama pull llama3.2
```

---

### 3. Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy the example env and configure
cp .env.example .env              # edit if needed (defaults work out of the box)
```

Create the data directories if they don't exist:

```bash
mkdir -p data/chroma_db data/uploads
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

---

### 4. Frontend

Open a new terminal tab:

```bash
cd frontend

# Install dependencies
npm install

# Copy the example env
cp .env.local.example .env.local   # default points to http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

The UI will be live at `http://localhost:3000`.

---

### 5. Start Ollama (if not already running)

```bash
ollama serve
```

Ollama must be running before the backend starts. If it's already running as a background service (default on macOS after install), you can skip this.

---

### 6. Verify everything is working

Open `http://localhost:3000` — the WelcomeTour modal will appear on first load.

To confirm the backend is healthy:

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:
```json
{
  "llm": { "reachable": true, "model": "llama3.2" },
  "chromadb": { "reachable": true, "document_count": 0, "chunk_count": 0 },
  "embedding_model": "all-MiniLM-L6-v2"
}
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server address |
| `OLLAMA_MODEL` | `llama3.2` | Model name |
| `CHROMA_PERSIST_PATH` | `./data/chroma_db` | Vector store location |
| `CHROMA_COLLECTION_NAME` | `rag_docs` | ChromaDB collection |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | SentenceTransformer model |
| `CHUNK_SIZE` | `512` | Max words per chunk |
| `CHUNK_OVERLAP` | `50` | Overlap between chunks |
| `TOP_K_CHUNKS` | `5` | Chunks retrieved per query |
| `MAX_PDF_SIZE_MB` | `50` | Max upload size |
| `LLM_BACKEND` | `ollama` | `ollama` or `huggingface` |

### Frontend (`frontend/.env.local`)

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

---

## Optional: Custom Ollama Model (Modelfile)

Bake the DocMind system prompt and tuned sampling parameters permanently into a named Ollama model:

```bash
cd backend
ollama create docmind-rag -f Modelfile
```

Then update your `.env`:

```
OLLAMA_MODEL=docmind-rag
```

Restart the backend for the change to take effect.

---

## Optional: Generate Fine-Tuning Data

Once you have documents indexed, generate Q&A training pairs from your own corpus:

```bash
cd backend
source venv/bin/activate
python scripts/generate_training_data.py --pairs 3
```

This produces `training_data.jsonl` in ChatML format, ready for Unsloth or LLaMA-Factory.

---

## Project Structure

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for a detailed breakdown of every file, the full data flow for uploads and queries, prompt engineering details, and the complete component responsibility map.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/documents/upload` | Upload and index documents |
| `GET` | `/api/v1/documents` | List indexed documents |
| `DELETE` | `/api/v1/documents/{id}` | Remove a document |
| `GET` | `/api/v1/documents/{id}/chunks` | View stored chunks |
| `POST` | `/api/v1/query` | Ask a question |
| `GET` | `/api/v1/health` | System health check |

Full docs at `http://localhost:8000/docs`.

---

## Troubleshooting

**`ollama: connection refused`**
Ollama is not running. Start it with `ollama serve`.

**`model "llama3.2" not found`**
Run `ollama pull llama3.2`.

**`tesseract: command not found`**
Install Tesseract: `brew install tesseract` (macOS) or `sudo apt install tesseract-ocr` (Linux). Required for image-based PDFs.

**Backend starts but returns 500 on upload**
Check that `data/chroma_db/` and `data/uploads/` directories exist inside `backend/`.

**Frontend shows blank page / hydration error**
Clear localStorage in DevTools → Application → Local Storage → Clear All, then refresh.

**Port already in use**
Change the backend port: `uvicorn main:app --port 8001`, and update `NEXT_PUBLIC_API_URL=http://localhost:8001` in `frontend/.env.local`.

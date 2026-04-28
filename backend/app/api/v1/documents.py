import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import get_settings
from app.models.document import ChunkRecord, DocumentRecord
from app.services.document_processor import process_file
from app.services.embedder import Embedder
from app.services.vector_store import VectorStore

router = APIRouter(tags=["documents"])

ALLOWED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".bmp",
    ".docx", ".xlsx", ".xls", ".txt", ".csv", ".md",
}


def _ext(filename: str) -> str:
    return os.path.splitext(filename or "")[1].lower()


@router.post("/documents/upload", status_code=201)
async def upload_documents(files: List[UploadFile] = File(...)):
    s = get_settings()
    os.makedirs(s.UPLOAD_DIR, exist_ok=True)

    results = []
    errors = []

    for file in files:
        filename = file.filename or "upload"
        ext = _ext(filename)

        if ext not in ALLOWED_EXTENSIONS:
            errors.append({"filename": filename, "error": f"Unsupported file type: {ext}"})
            continue

        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > s.MAX_PDF_SIZE_MB:
            errors.append({"filename": filename, "error": f"Exceeds {s.MAX_PDF_SIZE_MB} MB limit"})
            continue

        document_id = str(uuid.uuid4())
        tmp_path = os.path.join(s.UPLOAD_DIR, f"{document_id}{ext}")

        try:
            with open(tmp_path, "wb") as f:
                f.write(contents)

            page_count, raw_chunks = process_file(tmp_path, filename)

            if not raw_chunks:
                errors.append({"filename": filename, "error": "No text could be extracted"})
                continue

            chunk_records = [
                ChunkRecord(
                    chunk_id=rc.chunk_id,
                    document_id=document_id,
                    filename=filename,
                    doc_type="general",
                    text=rc.text,
                    page_number=rc.page_number,
                    chunk_index=rc.chunk_index,
                    char_start=rc.char_start,
                    char_end=rc.char_end,
                )
                for rc in raw_chunks
            ]

            embedder = Embedder()
            embeddings = embedder.embed([c.text for c in chunk_records])

            store = VectorStore()
            store.add_chunks(chunk_records, embeddings)

            results.append(DocumentRecord(
                document_id=document_id,
                filename=filename,
                doc_type="general",
                doc_date=None,
                source=None,
                page_count=page_count,
                chunk_count=len(chunk_records),
                indexed_at=datetime.now(timezone.utc),
                status="indexed",
            ))

        except Exception as exc:
            errors.append({"filename": filename, "error": str(exc)})
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    if not results and errors:
        raise HTTPException(status_code=422, detail=errors)

    return {"indexed": [r.model_dump() for r in results], "errors": errors}


@router.get("/documents")
def list_documents(doc_type: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None):
    store = VectorStore()
    docs = store.list_documents()

    if doc_type:
        docs = [d for d in docs if d.get("doc_type") == doc_type]
    if date_from:
        docs = [d for d in docs if (d.get("doc_date") or "") >= date_from]
    if date_to:
        docs = [d for d in docs if (d.get("doc_date") or "") <= date_to]

    return {"documents": docs, "total": len(docs)}


@router.delete("/documents/{document_id}")
def delete_document(document_id: str):
    store = VectorStore()
    store.delete_document(document_id)
    return {"deleted": True, "document_id": document_id}


@router.get("/documents/{document_id}/chunks")
def get_document_chunks(document_id: str):
    store = VectorStore()
    chunks = store.get_chunks_for_document(document_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "document_id": document_id,
        "chunks": [
            {
                "chunk_id": c["chunk_id"],
                "text": c["text"],
                "page_number": c["metadata"]["page_number"],
                "chunk_index": c["metadata"]["chunk_index"],
                "char_start": c["metadata"]["char_start"],
                "char_end": c["metadata"]["char_end"],
            }
            for c in chunks
        ],
    }

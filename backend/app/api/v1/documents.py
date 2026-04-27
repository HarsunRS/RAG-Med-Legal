import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import get_settings
from app.models.document import ChunkRecord, DocumentRecord, DocType
from app.services.embedder import Embedder
from app.services.pdf_processor import PDFProcessor
from app.services.vector_store import VectorStore

router = APIRouter(tags=["documents"])


@router.post("/documents/upload", response_model=DocumentRecord, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: Annotated[DocType, Form()] = "general",
    doc_date: Annotated[str | None, Form()] = None,
    source: Annotated[str | None, Form()] = None,
):
    s = get_settings()

    if file.content_type not in ("application/pdf", "application/octet-stream") and not (file.filename or "").endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > s.MAX_PDF_SIZE_MB:
        raise HTTPException(status_code=413, detail=f"File exceeds {s.MAX_PDF_SIZE_MB} MB limit.")

    document_id = str(uuid.uuid4())
    upload_dir = s.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    tmp_path = os.path.join(upload_dir, f"{document_id}.pdf")

    try:
        with open(tmp_path, "wb") as f:
            f.write(contents)

        processor = PDFProcessor()
        page_count, raw_chunks = processor.process(tmp_path)

        if not raw_chunks:
            raise HTTPException(status_code=422, detail="No text could be extracted from this PDF.")

        chunk_records = [
            ChunkRecord(
                chunk_id=rc.chunk_id,
                document_id=document_id,
                filename=file.filename or "upload.pdf",
                doc_type=doc_type,
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

        if doc_date or source:
            store.update_metadata(document_id, doc_date or "", source or "")

        return DocumentRecord(
            document_id=document_id,
            filename=file.filename or "upload.pdf",
            doc_type=doc_type,
            doc_date=doc_date,
            source=source,
            page_count=page_count,
            chunk_count=len(chunk_records),
            indexed_at=datetime.now(timezone.utc),
            status="indexed",
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.get("/documents")
def list_documents(doc_type: str | None = None, date_from: str | None = None, date_to: str | None = None):
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

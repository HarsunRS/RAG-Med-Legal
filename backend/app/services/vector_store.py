from __future__ import annotations

from datetime import datetime, timezone

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings
from app.models.document import ChunkRecord, DocumentRecord

_client: chromadb.PersistentClient | None = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        s = get_settings()
        _client = chromadb.PersistentClient(
            path=s.CHROMA_PERSIST_PATH,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name=s.CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


class VectorStore:
    def __init__(self) -> None:
        self._col = _get_collection()

    def add_chunks(
        self,
        chunks: list[ChunkRecord],
        embeddings: list[list[float]],
    ) -> None:
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i : i + batch_size]
            batch_embeddings = embeddings[i : i + batch_size]
            self._col.upsert(
                ids=[c.chunk_id for c in batch_chunks],
                embeddings=batch_embeddings,
                documents=[c.text for c in batch_chunks],
                metadatas=[
                    {
                        "document_id": c.document_id,
                        "filename": c.filename,
                        "doc_type": c.doc_type,
                        "page_number": c.page_number,
                        "chunk_index": c.chunk_index,
                        "char_start": c.char_start,
                        "char_end": c.char_end,
                        "indexed_at": datetime.now(timezone.utc).isoformat(),
                        "doc_date": "",
                        "source": "",
                    }
                    for c in batch_chunks
                ],
            )

    def update_metadata(self, document_id: str, doc_date: str, source: str) -> None:
        results = self._col.get(where={"document_id": {"$eq": document_id}})
        if not results["ids"]:
            return
        self._col.update(
            ids=results["ids"],
            metadatas=[
                {**m, "doc_date": doc_date, "source": source}
                for m in results["metadatas"]
            ],
        )

    def query(
        self,
        query_embedding: list[float],
        n_results: int,
        where: dict | None = None,
    ) -> list[dict]:
        kwargs: dict = {"query_embeddings": [query_embedding], "n_results": n_results, "include": ["documents", "metadatas", "distances"]}
        if where:
            kwargs["where"] = where
        results = self._col.query(**kwargs)
        items = []
        for i, chunk_id in enumerate(results["ids"][0]):
            items.append(
                {
                    "chunk_id": chunk_id,
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i],
                }
            )
        return items

    def delete_document(self, document_id: str) -> None:
        self._col.delete(where={"document_id": {"$eq": document_id}})

    def get_chunks_for_document(self, document_id: str) -> list[dict]:
        results = self._col.get(
            where={"document_id": {"$eq": document_id}},
            include=["documents", "metadatas"],
        )
        items = []
        for i, chunk_id in enumerate(results["ids"]):
            items.append(
                {
                    "chunk_id": chunk_id,
                    "text": results["documents"][i],
                    "metadata": results["metadatas"][i],
                }
            )
        return items

    def list_documents(self) -> list[dict]:
        results = self._col.get(include=["metadatas"])
        seen: dict[str, dict] = {}
        chunk_counts: dict[str, int] = {}
        for meta in results["metadatas"]:
            doc_id = meta["document_id"]
            chunk_counts[doc_id] = chunk_counts.get(doc_id, 0) + 1
            if doc_id not in seen:
                seen[doc_id] = meta
        docs = []
        for doc_id, meta in seen.items():
            docs.append({**meta, "chunk_count": chunk_counts[doc_id]})
        return docs

    def total_chunks(self) -> int:
        return self._col.count()

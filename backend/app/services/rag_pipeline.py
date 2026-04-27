from __future__ import annotations

from app.core.config import get_settings
from app.core.disclaimers import DISCLAIMER_MAP
from app.models.query import DocFilter, QueryResponse, SourceChunk
from app.services.embedder import Embedder
from app.services.vector_store import VectorStore


def _get_llm_client():
    s = get_settings()
    if s.LLM_BACKEND == "huggingface":
        from app.services.hf_llm_client import HuggingFaceLLMClient
        return HuggingFaceLLMClient()
    from app.services.ollama_client import OllamaClient
    return OllamaClient()

INSUFFICIENT_CONTEXT_THRESHOLD = 0.35
INSUFFICIENT_ANSWER = (
    "I don't have enough information in the provided documents to answer this question. "
    "Please upload relevant documents or rephrase your query."
)


def _build_where(doc_filter: DocFilter | None) -> dict | None:
    if not doc_filter:
        return None
    conditions = []
    if doc_filter.doc_type:
        conditions.append({"doc_type": {"$eq": doc_filter.doc_type}})
    if doc_filter.document_ids:
        conditions.append({"document_id": {"$in": doc_filter.document_ids}})
    if not conditions:
        return None
    return conditions[0] if len(conditions) == 1 else {"$and": conditions}


def _build_prompt(question: str, chunks: list[dict]) -> str:
    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        meta = chunk["metadata"]
        context_parts.append(
            f"[SOURCE {i}] ({meta['filename']}, page {meta['page_number']})\n{chunk['text']}"
        )
    context = "\n\n".join(context_parts)
    return (
        "You are a specialized assistant for medical and legal document analysis.\n"
        "Answer ONLY based on the provided document passages below.\n"
        "If the passages do not contain enough information, say so explicitly.\n"
        "Never speculate or add information not present in the passages.\n"
        "Always cite relevant passages using their [SOURCE N] label.\n\n"
        f"DOCUMENT PASSAGES:\n{context}\n\n"
        f"QUESTION: {question}\n\n"
        "ANSWER:"
    )


class RAGPipeline:
    def __init__(self) -> None:
        self._embedder = Embedder()
        self._store = VectorStore()
        self._llm = _get_llm_client()

    async def answer(
        self,
        question: str,
        doc_filter: DocFilter | None = None,
        top_k: int = 5,
    ) -> QueryResponse:
        query_vec = self._embedder.embed_one(question)
        where = _build_where(doc_filter)
        raw_results = self._store.query(query_vec, n_results=top_k, where=where)

        if not raw_results:
            return QueryResponse(
                answer=INSUFFICIENT_ANSWER,
                confidence=0.0,
                sources=[],
                disclaimer=DISCLAIMER_MAP.get(doc_filter.doc_type if doc_filter else "general", DISCLAIMER_MAP["general"]),
                grounded=True,
                insufficient_context=True,
            )

        # Convert cosine distance [0, 2] → relevance score [0, 1]
        for r in raw_results:
            r["relevance_score"] = round(1.0 - (r["distance"] / 2.0), 4)

        max_score = max(r["relevance_score"] for r in raw_results)

        if max_score < INSUFFICIENT_CONTEXT_THRESHOLD:
            doc_type = doc_filter.doc_type if doc_filter and doc_filter.doc_type else "general"
            return QueryResponse(
                answer=INSUFFICIENT_ANSWER,
                confidence=max_score,
                sources=[],
                disclaimer=DISCLAIMER_MAP.get(doc_type, DISCLAIMER_MAP["general"]),
                grounded=True,
                insufficient_context=True,
            )

        prompt = _build_prompt(question, raw_results)
        answer_text = await self._llm.generate(prompt)

        top3_scores = sorted([r["relevance_score"] for r in raw_results], reverse=True)[:3]
        confidence = round(sum(top3_scores) / len(top3_scores), 4)

        # Determine disclaimer from doc_types of retrieved chunks
        doc_types = {r["metadata"].get("doc_type", "general") for r in raw_results}
        if "medical" in doc_types:
            disclaimer = DISCLAIMER_MAP["medical"]
        elif "legal" in doc_types:
            disclaimer = DISCLAIMER_MAP["legal"]
        else:
            disclaimer = DISCLAIMER_MAP["general"]

        sources = [
            SourceChunk(
                chunk_id=r["chunk_id"],
                document_id=r["metadata"]["document_id"],
                filename=r["metadata"]["filename"],
                doc_type=r["metadata"].get("doc_type", "general"),
                page_number=r["metadata"]["page_number"],
                passage=r["text"],
                relevance_score=r["relevance_score"],
                char_start=r["metadata"]["char_start"],
                char_end=r["metadata"]["char_end"],
            )
            for r in raw_results
        ]

        return QueryResponse(
            answer=answer_text.strip(),
            confidence=confidence,
            sources=sources,
            disclaimer=disclaimer,
            grounded=True,
            insufficient_context=False,
        )

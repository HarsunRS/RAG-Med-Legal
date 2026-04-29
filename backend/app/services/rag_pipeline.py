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


def _build_system_prompt(doc_types: set[str]) -> str:
    """Domain-aware system prompt — specialises for medical, legal, or general content."""
    has_medical = "medical" in doc_types
    has_legal = "legal" in doc_types

    base = (
        "You are DocMind, a precise AI assistant that analyses medical and legal documents.\n\n"
        "CORE RULES:\n"
        "• Answer ONLY using information from the numbered passages provided — never from prior knowledge.\n"
        "• Cite every factual claim inline using [SOURCE N] immediately after the relevant sentence.\n"
        "• If the passages do not contain enough information, state exactly what is missing and stop — "
        "do not guess, extrapolate, or use general knowledge to fill gaps.\n"
        "• Use **bold** for key findings, dates, names, values, and defined terms.\n"
        "• Use bullet points or numbered lists when enumerating multiple items.\n"
        "• Keep answers concise and professional — no filler phrases or redundant caveats.\n"
        "• If multiple sources address the question, synthesise them coherently and cite each.\n"
    )

    if has_medical:
        base += (
            "\nMEDICAL DOCUMENT RULES:\n"
            "• Quote dosages, lab values, diagnosis dates, and procedure names exactly as written.\n"
            "• Explicitly flag contraindications, adverse effects, or critical warnings found in the passages.\n"
            "• Distinguish between confirmed diagnoses and differential/provisional diagnoses.\n"
            "• Never recommend treatments or interpret results beyond what the documents state.\n"
        )

    if has_legal:
        base += (
            "\nLEGAL DOCUMENT RULES:\n"
            "• Identify all parties, effective dates, and jurisdiction exactly as stated.\n"
            "• Quote defined terms, clause numbers, and obligations verbatim where relevant.\n"
            "• Flag ambiguous language, conflicting clauses, or undefined terms if present.\n"
            "• Never provide legal advice — only summarise and cite what the documents state.\n"
        )

    return base


def _build_messages(question: str, chunks: list[dict]) -> tuple[str, str]:
    """Return (system_prompt, user_message) for the chat API."""
    doc_types = {c["metadata"].get("doc_type", "general") for c in chunks}
    system = _build_system_prompt(doc_types)

    context_parts: list[str] = []
    for i, chunk in enumerate(chunks, start=1):
        meta = chunk["metadata"]
        relevance = chunk.get("relevance_score", "")
        score_tag = f" [relevance: {relevance:.0%}]" if relevance else ""
        header = f"[SOURCE {i}] — {meta['filename']}, page {meta['page_number']}{score_tag}"
        context_parts.append(f"{header}\n{chunk['text'].strip()}")

    context = "\n\n".join(context_parts)

    user_msg = (
        f"DOCUMENT PASSAGES:\n\n{context}\n\n"
        "---\n"
        f"QUESTION: {question}\n\n"
        "Think step by step. Cite every factual claim with [SOURCE N]. "
        "If the answer spans multiple passages, synthesise them and cite each one. "
        "If the passages are insufficient, state exactly what is missing.\n\n"
        "ANSWER:"
    )

    return system, user_msg


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
        model: str | None = None,
    ) -> QueryResponse:
        query_vec = self._embedder.embed_one(question)
        where = _build_where(doc_filter)
        raw_results = self._store.query(query_vec, n_results=top_k, where=where)

        if not raw_results:
            return QueryResponse(
                answer=INSUFFICIENT_ANSWER,
                confidence=0.0,
                sources=[],
                disclaimer=DISCLAIMER_MAP.get(
                    doc_filter.doc_type if doc_filter else "general",
                    DISCLAIMER_MAP["general"],
                ),
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

        system_prompt, user_message = _build_messages(question, raw_results)
        answer_text = await self._llm.chat(system_prompt, user_message, model=model)

        top3_scores = sorted([r["relevance_score"] for r in raw_results], reverse=True)[:3]
        confidence = round(sum(top3_scores) / len(top3_scores), 4)

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

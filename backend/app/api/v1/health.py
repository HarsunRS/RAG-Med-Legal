from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings
from app.services.vector_store import VectorStore

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    s = get_settings()
    store = VectorStore()
    total_chunks = store.total_chunks()
    docs = store.list_documents()

    llm_status: dict
    if s.LLM_BACKEND == "huggingface":
        from app.services.hf_llm_client import HuggingFaceLLMClient
        llm_status = await HuggingFaceLLMClient().health_check()
    else:
        from app.services.ollama_client import OllamaClient
        llm_status = await OllamaClient().health_check()

    return {
        "status": "healthy",
        "llm_backend": s.LLM_BACKEND,
        "llm": llm_status,
        "chromadb": {
            "reachable": True,
            "document_count": len(docs),
            "chunk_count": total_chunks,
        },
        "embedding_model": s.EMBEDDING_MODEL,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

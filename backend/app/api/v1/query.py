import json
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.query import QueryRequest, QueryResponse
from app.services.rag_pipeline import RAGPipeline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["query"])
_pipeline: Optional[RAGPipeline] = None


def _get_pipeline() -> RAGPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline()
    return _pipeline


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    try:
        pipeline = _get_pipeline()
        return await pipeline.answer(
            question=request.question,
            doc_filter=request.doc_filter,
            top_k=request.top_k,
            model=request.model,
        )
    except Exception as exc:
        logger.exception("Query failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/query/stream")
async def query_documents_stream(request: QueryRequest):
    pipeline = _get_pipeline()

    async def event_generator():
        try:
            async for event in pipeline.answer_stream(
                question=request.question,
                doc_filter=request.doc_filter,
                top_k=request.top_k,
                model=request.model,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.exception("Stream query failed: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

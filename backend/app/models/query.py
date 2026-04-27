from pydantic import BaseModel, Field


class DocFilter(BaseModel):
    doc_type: str | None = None
    document_ids: list[str] | None = None


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    doc_filter: DocFilter | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class SourceChunk(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    doc_type: str
    page_number: int
    passage: str
    relevance_score: float
    char_start: int
    char_end: int


class QueryResponse(BaseModel):
    answer: str
    confidence: float
    sources: list[SourceChunk]
    disclaimer: str
    grounded: bool = True
    insufficient_context: bool = False

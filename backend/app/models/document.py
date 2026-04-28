from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


DocType = Literal["medical", "legal", "general"]


class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    doc_type: DocType
    doc_date: Optional[str] = None
    source: Optional[str] = None
    page_count: int
    chunk_count: int
    indexed_at: datetime


class DocumentRecord(DocumentMetadata):
    status: str = "indexed"


class ChunkRecord(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    doc_type: DocType
    text: str
    page_number: int
    chunk_index: int
    char_start: int
    char_end: int

import uuid
from dataclasses import dataclass

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.config import get_settings


@dataclass
class RawChunk:
    chunk_id: str
    text: str
    page_number: int
    chunk_index: int
    char_start: int
    char_end: int


class PDFProcessor:
    def __init__(self) -> None:
        s = get_settings()
        self.chunk_size = s.CHUNK_SIZE
        self.chunk_overlap = s.CHUNK_OVERLAP

    def extract_pages(self, path: str) -> list[tuple[int, str]]:
        """Return list of (page_number_1indexed, text) pairs."""
        pages: list[tuple[int, str]] = []
        try:
            reader = PdfReader(path)
            for i, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                if not text.strip():
                    text = self._fallback_extract(path, i)
                pages.append((i, text))
        except PdfReadError as exc:
            raise ValueError(f"Cannot read PDF: {exc}") from exc
        return pages

    def _fallback_extract(self, path: str, page_number: int) -> str:
        """Use pdfminer as fallback for pages with no text layer."""
        try:
            from pdfminer.high_level import extract_pages as pm_extract
            from pdfminer.layout import LTTextContainer

            for idx, layout in enumerate(pm_extract(path), start=1):
                if idx != page_number:
                    continue
                texts = []
                for element in layout:
                    if isinstance(element, LTTextContainer):
                        texts.append(element.get_text())
                return " ".join(texts)
        except Exception:
            pass
        return ""

    def chunk_page(self, page_number: int, text: str) -> list[RawChunk]:
        """Sliding-window chunking by approximate word count."""
        words = text.split()
        if not words:
            return []

        chunks: list[RawChunk] = []
        step = self.chunk_size - self.chunk_overlap
        chunk_index = 0

        for start_word in range(0, len(words), step):
            end_word = min(start_word + self.chunk_size, len(words))
            chunk_words = words[start_word:end_word]
            chunk_text = " ".join(chunk_words)

            # Approximate char offsets within the full page text
            char_start = len(" ".join(words[:start_word])) + (1 if start_word > 0 else 0)
            char_end = char_start + len(chunk_text)

            chunks.append(
                RawChunk(
                    chunk_id=str(uuid.uuid4()),
                    text=chunk_text,
                    page_number=page_number,
                    chunk_index=chunk_index,
                    char_start=char_start,
                    char_end=char_end,
                )
            )
            chunk_index += 1
            if end_word >= len(words):
                break

        return chunks

    def process(self, path: str) -> tuple[int, list[RawChunk]]:
        """Full pipeline: extract all pages, chunk each. Returns (page_count, chunks)."""
        pages = self.extract_pages(path)
        all_chunks: list[RawChunk] = []
        for page_number, text in pages:
            all_chunks.extend(self.chunk_page(page_number, text))
        return len(pages), all_chunks

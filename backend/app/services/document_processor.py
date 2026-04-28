"""
Unified document processor — routes each file to the right extractor
based on its extension, then applies the same sliding-window chunker.

Supported formats:
  PDF   — pypdf → pdfminer fallback → Tesseract OCR fallback
  Images — PNG, JPG, JPEG, WEBP, TIFF, BMP → Tesseract OCR
  Word  — .docx → python-docx
  Excel — .xlsx, .xls → openpyxl
  Text  — .txt, .csv → direct read
"""
import os
import uuid
from dataclasses import dataclass
from pathlib import Path

from app.core.config import get_settings


@dataclass
class RawChunk:
    chunk_id: str
    text: str
    page_number: int
    chunk_index: int
    char_start: int
    char_end: int


# ── Extractors ───────────────────────────────────────────────────────────────

def _extract_pdf(path: str) -> list[tuple[int, str]]:
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    try:
        reader = PdfReader(path)
    except PdfReadError as exc:
        raise ValueError(f"Cannot read PDF: {exc}") from exc

    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if not text:
            text = _pdf_pdfminer_page(path, i)
        if not text:
            text = _ocr_pdf_page(path, i)
        pages.append((i, text))
    return pages


def _pdf_pdfminer_page(path: str, page_number: int) -> str:
    try:
        from pdfminer.high_level import extract_pages as pm_extract
        from pdfminer.layout import LTTextContainer

        for idx, layout in enumerate(pm_extract(path), start=1):
            if idx != page_number:
                continue
            return " ".join(
                el.get_text() for el in layout if isinstance(el, LTTextContainer)
            ).strip()
    except Exception:
        pass
    return ""


def _ocr_pdf_page(path: str, page_number: int) -> str:
    try:
        import pytesseract
        from pdf2image import convert_from_path

        images = convert_from_path(path, first_page=page_number, last_page=page_number, dpi=300)
        if images:
            return pytesseract.image_to_string(images[0]).strip()
    except Exception:
        pass
    return ""


def _extract_image(path: str) -> list[tuple[int, str]]:
    try:
        import pytesseract
        from PIL import Image

        text = pytesseract.image_to_string(Image.open(path)).strip()
        return [(1, text)]
    except Exception as exc:
        raise ValueError(f"Could not OCR image: {exc}") from exc


def _extract_docx(path: str) -> list[tuple[int, str]]:
    try:
        from docx import Document

        doc = Document(path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]

        # Group paragraphs into ~page-sized blocks (approx 40 paragraphs = 1 page)
        block_size = 40
        pages = []
        for i in range(0, max(len(paragraphs), 1), block_size):
            block = "\n".join(paragraphs[i : i + block_size])
            pages.append((i // block_size + 1, block))
        return pages if pages else [(1, "")]
    except Exception as exc:
        raise ValueError(f"Could not read Word document: {exc}") from exc


def _extract_excel(path: str) -> list[tuple[int, str]]:
    try:
        import openpyxl

        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        pages = []
        for sheet_idx, sheet in enumerate(wb.worksheets, start=1):
            rows = []
            for row in sheet.iter_rows(values_only=True):
                cells = [str(c) for c in row if c is not None and str(c).strip()]
                if cells:
                    rows.append(" | ".join(cells))
            pages.append((sheet_idx, "\n".join(rows)))
        return pages if pages else [(1, "")]
    except Exception as exc:
        raise ValueError(f"Could not read Excel file: {exc}") from exc


def _extract_text(path: str) -> list[tuple[int, str]]:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return [(1, f.read())]
    except Exception as exc:
        raise ValueError(f"Could not read text file: {exc}") from exc


# ── Router ───────────────────────────────────────────────────────────────────

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".bmp"}

def extract_pages(path: str, filename: str) -> list[tuple[int, str]]:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _extract_pdf(path)
    if ext in IMAGE_EXTS:
        return _extract_image(path)
    if ext == ".docx":
        return _extract_docx(path)
    if ext in {".xlsx", ".xls"}:
        return _extract_excel(path)
    if ext in {".txt", ".csv", ".md"}:
        return _extract_text(path)
    raise ValueError(f"Unsupported file type: {ext}")


# ── Chunker ──────────────────────────────────────────────────────────────────

def chunk_pages(pages: list[tuple[int, str]]) -> list[RawChunk]:
    s = get_settings()
    chunk_size = s.CHUNK_SIZE
    chunk_overlap = s.CHUNK_OVERLAP
    step = chunk_size - chunk_overlap

    all_chunks: list[RawChunk] = []
    for page_number, text in pages:
        words = text.split()
        if not words:
            continue
        chunk_index = 0
        for start_word in range(0, len(words), step):
            end_word = min(start_word + chunk_size, len(words))
            chunk_words = words[start_word:end_word]
            chunk_text = " ".join(chunk_words)
            char_start = len(" ".join(words[:start_word])) + (1 if start_word > 0 else 0)
            char_end = char_start + len(chunk_text)
            all_chunks.append(RawChunk(
                chunk_id=str(uuid.uuid4()),
                text=chunk_text,
                page_number=page_number,
                chunk_index=chunk_index,
                char_start=char_start,
                char_end=char_end,
            ))
            chunk_index += 1
            if end_word >= len(words):
                break
    return all_chunks


def process_file(path: str, filename: str) -> tuple[int, list[RawChunk]]:
    """Full pipeline: extract → chunk. Returns (page_count, chunks)."""
    pages = extract_pages(path, filename)
    chunks = chunk_pages(pages)
    return len(pages), chunks

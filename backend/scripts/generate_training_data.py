"""Generate fine-tuning training data from indexed ChromaDB chunks.

For each chunk in your vector store, this script asks the current Ollama model
to produce Q&A pairs grounded in that passage.  The output is a ChatML JSONL
file ready for Unsloth, LLaMA-Factory, or Axolotl.

Usage
-----
    cd backend
    source venv/bin/activate
    python scripts/generate_training_data.py

Options
-------
    --output   Path for the output JSONL file   (default: training_data.jsonl)
    --limit    Max chunks to process (0 = all)  (default: 0)
    --pairs    Q&A pairs to generate per chunk  (default: 3)
    --resume   Skip chunks already in output    (default: True)

After generating, fine-tune with Unsloth:
    pip install unsloth
    # see: https://github.com/unslothai/unsloth

Then import the merged GGUF into Ollama:
    ollama create docmind-ft -f Modelfile   # point FROM at your merged gguf
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import httpx

# Allow importing from the backend package when run from the scripts/ directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import chromadb
from app.core.config import get_settings

# ── Prompt that asks the LLM to produce Q&A pairs from a passage ───────────────
_QA_SYSTEM = (
    "You are a dataset curator preparing fine-tuning data for a medical/legal RAG assistant. "
    "Given a document passage, you generate realistic question-answer pairs that a professional "
    "might ask about that passage.  Each answer must be grounded ONLY in the passage text — "
    "no outside knowledge.  Cite the passage inline where relevant."
)

_QA_USER_TEMPLATE = (
    "Passage (from {filename}, page {page}):\n"
    "---\n"
    "{text}\n"
    "---\n\n"
    "Generate exactly {n} question-answer pairs about this passage.\n"
    "Format each pair as:\n"
    "Q: <question>\n"
    "A: <answer>\n\n"
    "Separate pairs with a blank line.  Do not number them.  "
    "Do not include any text outside the Q:/A: pairs."
)

# The system prompt baked into every training example — same as the Modelfile SYSTEM block.
_DOCMIND_SYSTEM = """\
You are DocMind, a precise AI assistant that analyses medical and legal documents.

CORE RULES:
• Answer ONLY using information from the numbered passages provided — never from prior knowledge.
• Cite every factual claim inline using [SOURCE N] immediately after the relevant sentence.
• If passages are insufficient, state exactly what is missing — do not guess.
• Use **bold** for key findings, dates, names, values, and defined terms.
• Keep answers concise and professional.
"""


def _ask_ollama(base_url: str, model: str, system: str, user: str, timeout: int = 60) -> str:
    resp = httpx.post(
        f"{base_url}/api/chat",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            "stream": False,
            "options": {"temperature": 0.4, "num_predict": 512},
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def _parse_qa_pairs(raw: str) -> list[tuple[str, str]]:
    """Parse 'Q: ...\nA: ...' blocks from model output."""
    pairs: list[tuple[str, str]] = []
    blocks = re.split(r"\n{2,}", raw.strip())
    for block in blocks:
        q_match = re.search(r"Q:\s*(.+)", block, re.IGNORECASE)
        a_match = re.search(r"A:\s*([\s\S]+)", block, re.IGNORECASE)
        if q_match and a_match:
            q = q_match.group(1).strip()
            a = a_match.group(1).strip()
            if q and a:
                pairs.append((q, a))
    return pairs


def _make_chatml_example(system: str, question: str, answer: str, context: str) -> dict:
    """ChatML format expected by Unsloth / LLaMA-Factory / Axolotl."""
    user_msg = f"DOCUMENT PASSAGE:\n{context}\n\n---\nQUESTION: {question}\n\nANSWER:"
    return {
        "messages": [
            {"role": "system",    "content": system},
            {"role": "user",      "content": user_msg},
            {"role": "assistant", "content": answer},
        ]
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate fine-tuning data from ChromaDB")
    parser.add_argument("--output",  default="training_data.jsonl", help="Output JSONL file")
    parser.add_argument("--limit",   type=int, default=0,  help="Max chunks (0=all)")
    parser.add_argument("--pairs",   type=int, default=3,  help="Q&A pairs per chunk")
    parser.add_argument("--no-resume", dest="resume", action="store_false",
                        help="Overwrite output instead of resuming")
    parser.set_defaults(resume=True)
    args = parser.parse_args()

    settings = get_settings()
    output_path = Path(args.output)

    # Load already-written chunk IDs so we can resume without re-processing
    seen_chunk_ids: set[str] = set()
    if args.resume and output_path.exists():
        with open(output_path) as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    if "_chunk_id" in rec:
                        seen_chunk_ids.add(rec["_chunk_id"])
                except json.JSONDecodeError:
                    pass
        print(f"Resuming — {len(seen_chunk_ids)} chunks already processed.")

    # Connect to ChromaDB
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_PATH)
    try:
        collection = chroma_client.get_collection(settings.CHROMA_COLLECTION_NAME)
    except Exception:
        print(f"Collection '{settings.CHROMA_COLLECTION_NAME}' not found — upload some documents first.")
        sys.exit(1)

    total_in_db = collection.count()
    print(f"Found {total_in_db} chunks in ChromaDB.")

    # Fetch all chunks (ChromaDB has no server-side pagination in the Python client)
    results = collection.get(include=["documents", "metadatas"])
    ids       = results["ids"]
    documents = results["documents"]
    metadatas = results["metadatas"]

    limit = args.limit if args.limit > 0 else len(ids)
    total = 0
    skipped = 0
    errors = 0

    with open(output_path, "a" if args.resume else "w") as out_f:
        for chunk_id, text, meta in zip(ids, documents, metadatas):
            if total >= limit:
                break
            if chunk_id in seen_chunk_ids:
                skipped += 1
                continue

            filename = meta.get("filename", "unknown")
            page     = meta.get("page_number", "?")

            user_prompt = _QA_USER_TEMPLATE.format(
                filename=filename,
                page=page,
                text=text,
                n=args.pairs,
            )

            try:
                raw = _ask_ollama(settings.OLLAMA_URL, settings.OLLAMA_MODEL, _QA_SYSTEM, user_prompt)
                pairs = _parse_qa_pairs(raw)
            except Exception as e:
                print(f"  ✗ chunk {chunk_id[:8]}… — {e}")
                errors += 1
                time.sleep(1)
                continue

            for q, a in pairs:
                record = _make_chatml_example(_DOCMIND_SYSTEM, q, a, text)
                record["_chunk_id"] = chunk_id  # lets resume work
                record["_meta"] = {"filename": filename, "page": page, "doc_type": meta.get("doc_type")}
                out_f.write(json.dumps(record) + "\n")

            out_f.flush()
            total += 1
            written = len(pairs)
            print(f"  ✓ {filename} p.{page} — {written} pairs  ({total}/{limit})")

    print(f"\nDone. {total} chunks processed, {skipped} skipped, {errors} errors.")
    print(f"Output: {output_path.resolve()}")
    print()
    print("Next steps — fine-tune with Unsloth:")
    print("  pip install unsloth")
    print("  # Use the unsloth/llama-3.2-3b-bnb-4bit base model + your JSONL")
    print("  # After merging, export to GGUF and run:")
    print("  ollama create docmind-ft -f Modelfile  # update FROM in Modelfile to your gguf path")


if __name__ == "__main__":
    main()

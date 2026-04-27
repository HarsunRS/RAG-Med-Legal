"""
Prepare training data for fine-tuning from indexed ChromaDB documents.

Usage:
    python training/prepare_data.py --output data/train.jsonl --format instruct

Each record in the output is a prompt/completion pair in the Alpaca instruct format:
    {"instruction": "...", "input": "...", "output": "..."}

You can also pass your own JSONL file with the same schema and skip this script.
"""
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def from_chromadb(output_path: str) -> None:
    """Generate synthetic QA pairs from indexed chunks using simple heuristics."""
    from app.services.vector_store import VectorStore

    store = VectorStore()
    docs = store.list_documents()
    if not docs:
        print("No documents indexed in ChromaDB. Upload PDFs first.")
        sys.exit(1)

    records = []
    for doc in docs:
        chunks = store.get_chunks_for_document(doc["document_id"])
        for chunk in chunks:
            text = chunk["text"].strip()
            if len(text.split()) < 30:
                continue
            records.append(
                {
                    "instruction": (
                        "You are a medical and legal document assistant. "
                        "Answer the question using only the provided context."
                    ),
                    "input": (
                        f"Context (from {doc['filename']}, page {chunk['metadata']['page_number']}):\n"
                        f"{text}\n\nQuestion: What information does this passage convey?"
                    ),
                    "output": text,
                }
            )

    with open(output_path, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    print(f"Wrote {len(records)} training records to {output_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/train.jsonl")
    args = parser.parse_args()
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    from_chromadb(args.output)


if __name__ == "__main__":
    main()

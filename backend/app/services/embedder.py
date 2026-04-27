from __future__ import annotations

from app.core.config import get_settings

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(get_settings().EMBEDDING_MODEL)
    return _model


class Embedder:
    def embed(self, texts: list[str]) -> list[list[float]]:
        model = _get_model()
        vectors = model.encode(texts, batch_size=32, show_progress_bar=False)
        return [v.tolist() for v in vectors]

    def embed_one(self, text: str) -> list[float]:
        return self.embed([text])[0]

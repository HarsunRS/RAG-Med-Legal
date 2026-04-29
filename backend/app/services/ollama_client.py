from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings

# Sampling parameters tuned for factual RAG over medical/legal text.
# Low temperature + reduced top_k keeps answers grounded; repeat_penalty
# prevents the model from looping on boilerplate phrases.
_GENERATION_OPTIONS = {
    "temperature": 0.05,   # near-deterministic for factual tasks
    "top_k": 30,           # narrow the candidate token pool
    "top_p": 0.85,         # nucleus sampling cutoff
    "repeat_penalty": 1.15,# penalise repeated phrases / boilerplate
    "num_predict": 1024,   # allow detailed answers
    "num_ctx": 4096,       # context window (covers ~5 chunks + prompt)
}


class OllamaClient:
    def __init__(self) -> None:
        s = get_settings()
        self._base_url = s.OLLAMA_URL
        self._model = s.OLLAMA_MODEL

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def chat(self, system: str, user: str, model: str | None = None) -> str:
        """Send a structured chat request (system + user turn).

        Uses /api/chat so the model sees a proper system role, which produces
        better instruction-following than injecting the system prompt inline.
        """
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{self._base_url}/api/chat",
                json={
                    "model": model or self._model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                    "stream": False,
                    "options": _GENERATION_OPTIONS,
                },
            )
            response.raise_for_status()
            return response.json()["message"]["content"]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def generate(self, prompt: str) -> str:
        """Legacy single-string generation — kept for HuggingFace client compat."""
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{self._base_url}/api/generate",
                json={
                    "model": self._model,
                    "prompt": prompt,
                    "stream": False,
                    "options": _GENERATION_OPTIONS,
                },
            )
            response.raise_for_status()
            return response.json()["response"]

    async def health_check(self) -> dict:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self._base_url}/api/version")
                r.raise_for_status()
                return {
                    "reachable": True,
                    "model": self._model,
                    "version": r.json().get("version", "unknown"),
                }
        except Exception:
            return {"reachable": False, "model": self._model, "version": None}

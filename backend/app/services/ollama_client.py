from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings


class OllamaClient:
    def __init__(self) -> None:
        s = get_settings()
        self._base_url = s.OLLAMA_URL
        self._model = s.OLLAMA_MODEL

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self._base_url}/api/generate",
                json={
                    "model": self._model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.1},
                },
            )
            response.raise_for_status()
            return response.json()["response"]

    async def health_check(self) -> dict:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self._base_url}/api/version")
                r.raise_for_status()
                return {"reachable": True, "model": self._model, "version": r.json().get("version", "unknown")}
        except Exception:
            return {"reachable": False, "model": self._model, "version": None}

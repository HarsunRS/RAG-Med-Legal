"""
Local HuggingFace inference client for the fine-tuned model.
Used when LLM_BACKEND=huggingface in .env.
"""
from __future__ import annotations

import torch

from app.core.config import get_settings

_model = None
_tokenizer = None


def _load_model():
    global _model, _tokenizer
    if _model is not None:
        return _model, _tokenizer

    from transformers import AutoModelForCausalLM, AutoTokenizer

    s = get_settings()
    path = s.HF_MODEL_PATH
    if not path:
        raise RuntimeError("HF_MODEL_PATH not set in .env — required when LLM_BACKEND=huggingface")

    device = _detect_device()
    print(f"[HFLLMClient] Loading model from {path} on {device.upper()}…")

    dtype = torch.float16 if device == "cuda" else torch.float32
    _tokenizer = AutoTokenizer.from_pretrained(path, trust_remote_code=True)
    if _tokenizer.pad_token is None:
        _tokenizer.pad_token = _tokenizer.eos_token

    _model = AutoModelForCausalLM.from_pretrained(
        path,
        torch_dtype=dtype,
        trust_remote_code=True,
        device_map=None,
    )
    if device in ("mps", "cpu"):
        _model = _model.to(device)
    _model.eval()
    print(f"[HFLLMClient] Model loaded.")
    return _model, _tokenizer


def _detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class HuggingFaceLLMClient:
    async def generate(self, prompt: str) -> str:
        model, tokenizer = _load_model()
        device = next(model.parameters()).device

        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=2048,
        ).to(device)

        with torch.no_grad():
            output_ids = model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.1,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )

        # Decode only the newly generated tokens
        generated = output_ids[0][inputs["input_ids"].shape[1]:]
        return tokenizer.decode(generated, skip_special_tokens=True).strip()

    async def health_check(self) -> dict:
        s = get_settings()
        return {
            "reachable": bool(s.HF_MODEL_PATH),
            "model": s.HF_MODEL_PATH or "not set",
            "version": "local",
        }

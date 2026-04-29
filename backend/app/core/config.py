from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    OLLAMA_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3.2"
    CHROMA_PERSIST_PATH: str = "./data/chroma_db"
    CHROMA_COLLECTION_NAME: str = "rag_docs"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    TOP_K_CHUNKS: int = 3
    MAX_PDF_SIZE_MB: int = 50
    UPLOAD_DIR: str = "./data/uploads"
    DEBUG: bool = True

    # LLM backend: "ollama" uses Ollama, "huggingface" loads a local trained model
    LLM_BACKEND: Literal["ollama", "huggingface"] = "ollama"
    # Path to fine-tuned model directory (required when LLM_BACKEND=huggingface)
    HF_MODEL_PATH: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()

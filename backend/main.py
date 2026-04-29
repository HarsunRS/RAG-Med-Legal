import os
import sys
from contextlib import asynccontextmanager

# Windows: Python 3.8+ defaults to ProactorEventLoop which breaks httpx async.
# Force SelectorEventLoop so async HTTP clients work correctly.
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_router
from app.core.config import get_settings
from app.core.disclaimers import DISCLAIMER_MAP


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up embedding model and ChromaDB on startup
    from app.services.embedder import _get_model
    from app.services.vector_store import _get_collection
    _get_model()
    _get_collection()
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title="RAG Medical/Legal Q&A",
        description="Domain-specific question answering over medical and legal documents.",
        version="1.0.0",
        docs_url="/docs" if s.DEBUG else None,
        redoc_url="/redoc" if s.DEBUG else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/")
    def root():
        return {"name": "RAG Medical/Legal Q&A", "version": "1.0.0", "status": "healthy"}

    @app.get("/disclaimer")
    def disclaimer():
        return DISCLAIMER_MAP

    return app


app = create_app()

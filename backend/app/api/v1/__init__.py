from fastapi import APIRouter
from app.api.v1 import documents, query, health

router = APIRouter(prefix="/api/v1")
router.include_router(documents.router)
router.include_router(query.router)
router.include_router(health.router)

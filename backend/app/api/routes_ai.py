from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.extractors import AIQuantService
from app.ai.schemas import AIExtractTextInput, AISourceDigestInput
from app.db.session import get_db
from app.schemas.common import ok_response

router = APIRouter(prefix="/ai", tags=["ai-quant"])


@router.get("/status")
async def ai_status():
    status = AIQuantService().status()
    return ok_response(
        status.model_dump(by_alias=True),
        "Estimated",
        "AI Quant status. ChatGPT subscriptions are not used; backend automation requires OPENAI_API_KEY or rule fallback.",
    )


@router.post("/extract-event-factors")
async def extract_event_factors(request: AIExtractTextInput):
    payload = await AIQuantService().analyze_text(request)
    return ok_response(
        payload.model_dump(by_alias=True),
        "Estimated",
        "AI event factor extraction completed. Research-only; no buy/sell advice.",
    )


@router.post("/analyze-source-digest")
async def analyze_source_digest(request: AISourceDigestInput, db: Session = Depends(get_db)):
    payload = await AIQuantService().analyze_source_digest(request, db)
    return ok_response(
        payload.model_dump(by_alias=True),
        "Estimated",
        "AI source digest analysis completed. Factors are display-only unless explicitly enabled and validated.",
    )

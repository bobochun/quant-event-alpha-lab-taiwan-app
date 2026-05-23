from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.common import ok_response
from app.services.event_service import EventService

router = APIRouter(tags=["events"])


@router.get("/events/upcoming")
async def upcoming_events(
    days: int = Query(30, ge=1, le=120),
    symbols: str | None = Query(None, description="Comma-separated symbols, e.g. 2330,2382"),
    provider: str = Query("auto", pattern="^(auto|finmind|official|mops)$"),
):
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()] if symbols else []
    payload = await EventService().upcoming(days=days, symbols=symbol_list, provider=provider)
    return ok_response(
        payload.model_dump(by_alias=True),
        "Official" if payload.events else "Missing",
        payload.source_note,
    )


@router.get("/events/providers")
async def event_providers():
    payload = await EventService().upcoming(days=30, provider="auto")
    return ok_response(
        [provider.model_dump(by_alias=True) for provider in payload.providers],
        "Official" if any(provider.records_fetched for provider in payload.providers) else "Missing",
        payload.source_note,
    )

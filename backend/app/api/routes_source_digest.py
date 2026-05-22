from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import ok_response
from app.schemas.source_digest import SourceDigestQueryResult, SourceDigestRequest
from app.services.source_digest_service import SourceDigestService

router = APIRouter(tags=["source-digest"])


@router.post("/source-digest/collect")
async def collect_source_digest(request: SourceDigestRequest, db: Session = Depends(get_db)):
    payload = await SourceDigestService().collect(request, db)
    return ok_response(
        payload.model_dump(by_alias=True),
        "Cached",
        "Source digest completed. Metadata only; no full copyrighted content stored.",
    )


@router.get("/source-digest/items")
async def source_digest_items(
    symbols: str | None = Query(None),
    themes: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()] if symbols else None
    theme_list = [item.strip() for item in themes.split(",") if item.strip()] if themes else None
    items = await SourceDigestService().query(symbol_list, theme_list, limit, db)
    payload = SourceDigestQueryResult(items=items, warnings=[], generatedAt=datetime.utcnow().isoformat())
    return ok_response(
        payload.model_dump(by_alias=True),
        "Cached",
        "Source digest metadata query completed.",
    )

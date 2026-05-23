from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import ok_response
from app.schemas.research import EventStudyRequest, PortfolioOptimizeInput, TradingCostInput
from app.services.research_service import ResearchService

router = APIRouter(tags=["research"])


@router.post("/research/event-study")
async def event_study(request: EventStudyRequest, db: Session = Depends(get_db)):
    result = await ResearchService().event_study(request, db)
    return ok_response(result.model_dump(by_alias=True), "Cached", result.source_note)


@router.get("/research/cross-section")
async def cross_section(
    symbols: str | None = Query(None, description="Comma-separated symbols. Empty uses default demo universe."),
    persist: bool = Query(False),
    db: Session = Depends(get_db),
):
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()] if symbols else None
    payload = await ResearchService().cross_section(symbol_list, persist=persist, db=db)
    return ok_response(payload.model_dump(by_alias=True), "Cached", "Cross-section quant ranking completed. Scores are for research only.")


@router.get("/research/theme-strength")
async def theme_strength(symbols: str | None = Query(None)):
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()] if symbols else None
    rows = await ResearchService().theme_strength(symbol_list)
    return ok_response([row.model_dump(by_alias=True) for row in rows], "Cached", "Theme strength matrix based on backend quantScore averages.")


@router.get("/research/data-quality")
async def data_quality(db: Session = Depends(get_db)):
    rows = await ResearchService().data_quality(db)
    return ok_response([row.model_dump(by_alias=True) for row in rows], "Cached", "Data quality monitor MVP completed.")


@router.post("/research/portfolio-optimize")
async def portfolio_optimize(request: PortfolioOptimizeInput):
    result = await ResearchService().optimize_portfolio(request)
    return ok_response(result.model_dump(by_alias=True), "Cached", result.source_note)


@router.get("/research/walk-forward")
async def walk_forward(symbols: str | None = Query(None), db: Session = Depends(get_db)):
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()] if symbols else None
    result = await ResearchService().walk_forward(symbol_list, db=db)
    data_source = "Cached" if "factor_scores" in result.source_note else "Estimated"
    return ok_response(result.model_dump(by_alias=True), data_source, result.source_note)


@router.post("/research/trading-cost")
async def trading_cost(request: TradingCostInput):
    result = ResearchService().trading_cost(request)
    return ok_response(result.model_dump(by_alias=True), "Estimated", result.note)

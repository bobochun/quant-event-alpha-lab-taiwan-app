from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import ok_response
from app.schemas.market import Interval, ProviderKey, RangeKey
from app.services.quant_analysis_service import QuantAnalysisService

router = APIRouter(tags=["quant"])


@router.get("/quant/analyze/{symbol}")
async def analyze_symbol(
    symbol: str,
    interval: Interval = Query("1d"),
    range: RangeKey = Query("1y"),
    provider: ProviderKey = Query("auto"),
    db: Session = Depends(get_db),
):
    result = await QuantAnalysisService().analyze_symbol(symbol=symbol, interval=interval, range_key=range, provider=provider, db=db)
    return ok_response(
        result.model_dump(by_alias=True),
        result.data_source,
        result.explanation,
    )


@router.get("/quant/analyze")
async def analyze_batch(
    symbols: str = Query("2330,2382,2317"),
    interval: Interval = Query("1d"),
    range: RangeKey = Query("1y"),
    provider: ProviderKey = Query("auto"),
    db: Session = Depends(get_db),
):
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()]
    payload = await QuantAnalysisService().analyze_batch(symbols=symbol_list, interval=interval, range_key=range, provider=provider, db=db)
    return ok_response(
        payload.model_dump(by_alias=True),
        "Cached" if payload.results else "Missing",
        "後端量化分析完成。分數僅供個人研究與風控，不構成投資建議。",
    )

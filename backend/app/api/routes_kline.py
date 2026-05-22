from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import ok_response
from app.schemas.market import Interval, ProviderKey, RangeKey
from app.services.kline_service import KLineService

router = APIRouter(prefix="/kline", tags=["kline"])


@router.get("/{symbol}")
async def kline(
    symbol: str,
    interval: Interval = "1d",
    range: RangeKey = Query("1y"),
    provider: ProviderKey = "auto",
    startDate: date | None = None,
    endDate: date | None = None,
    db: Session = Depends(get_db),
):
    payload = await KLineService().kline(symbol, interval, range, provider, startDate, endDate, db)
    return ok_response(
        payload.model_dump(by_alias=True),
        payload.data_source,
        "K 線已回傳；免費或 fallback 資料不標示為正式即時行情。",
    )

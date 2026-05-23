from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import ok_response
from app.services.institutional_flow_service import InstitutionalFlowService
from app.services.market_summary_service import MarketSummaryService
from app.services.source_health_service import SourceHealthService

router = APIRouter(prefix="/market-data", tags=["sources"])


@router.get("/providers")
async def providers():
    rows = await SourceHealthService().providers()
    return ok_response(
        [row.model_dump(by_alias=True) for row in rows],
        "Demo",
        "provider 狀態包含授權、即時性、週期支援與 fallback 說明。",
    )


@router.get("/source-health")
async def source_health():
    rows = await SourceHealthService().providers()
    return ok_response(
        [row.model_dump(by_alias=True) for row in rows],
        "Demo",
        "資料源健康檢查完成；失敗 provider 不會造成前端白屏。",
    )


@router.get("/institutional-flow/{symbol}")
async def institutional_flow(symbol: str):
    row = await InstitutionalFlowService().latest_flow(symbol)
    return ok_response(
        row.model_dump(by_alias=True),
        row.data_source,
        row.source_note,
    )


@router.get("/summary/{symbol}")
async def market_summary(symbol: str, db: Session = Depends(get_db)):
    payload = await MarketSummaryService().summary(symbol, db)
    source = payload.quote.data_source if payload.quote else "Estimated"
    return ok_response(
        payload.model_dump(by_alias=True),
        source,
        payload.source_note,
    )

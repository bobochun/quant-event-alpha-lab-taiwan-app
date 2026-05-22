from fastapi import APIRouter

from app.schemas.common import ok_response
from app.schemas.market import JobRunRequest, RefreshKLineRequest, RefreshQuotesRequest
from app.services.market_data_service import MarketDataService

router = APIRouter(tags=["market-data"])


@router.post("/market-data/refresh-quotes")
async def refresh_quotes(request: RefreshQuotesRequest):
    quotes = await MarketDataService().refresh_quotes(request)
    return ok_response(
        [quote.model_dump(by_alias=True) for quote in quotes],
        quotes[0].data_source if quotes else "Missing",
        "已刷新最新報價；10 秒內相同 provider / symbol 會優先使用快取。",
    )


@router.post("/market-data/refresh-kline")
async def refresh_kline(request: RefreshKLineRequest):
    payload = await MarketDataService().refresh_kline(request)
    return ok_response(payload.model_dump(by_alias=True), payload.data_source, "已刷新 K 線資料。")


@router.post("/jobs/run")
async def run_job(request: JobRunRequest):
    symbols = request.symbols or ["2330", "2382", "2317"]
    service = MarketDataService()
    if request.job_name in {"refresh_latest_quotes", "refresh_watchlist_quotes"}:
        quotes = await service.refresh_quotes(RefreshQuotesRequest(symbols=symbols, provider="auto"))
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(quotes)}, "Demo", "Job 已同步執行；本 MVP 未啟用長時間背景任務。")
    payload = await service.refresh_kline(RefreshKLineRequest(symbol=symbols[0], interval="1d", range="1y", provider="auto"))
    return ok_response({"jobName": request.job_name, "recordsProcessed": len(payload.bars)}, payload.data_source, "Job 已同步執行；本 MVP 未啟用長時間背景任務。")

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import ok_response
from app.schemas.market import JobRunRequest, RefreshKLineRequest, RefreshQuotesRequest
from app.schemas.source_digest import SourceDigestRequest
from app.services.market_data_service import MarketDataService
from app.services.research_service import ResearchService
from app.services.source_digest_service import SourceDigestService

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
async def run_job(request: JobRunRequest, db: Session = Depends(get_db)):
    symbols = request.symbols or ["2330", "2382", "2317"]
    service = MarketDataService()
    research = ResearchService()
    if request.job_name in {"refresh_latest_quotes", "refresh_watchlist_quotes"}:
        quotes = await service.refresh_quotes(RefreshQuotesRequest(symbols=symbols, provider="auto"))
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(quotes)}, "Demo", "Job 已同步執行；排程化可接 APScheduler。")
    if request.job_name == "refresh_daily_kline":
        payload = await service.refresh_kline(RefreshKLineRequest(symbol=symbols[0], interval="1d", range="1y", provider="auto"))
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(payload.bars)}, payload.data_source, "Job 已同步執行；排程化可接 APScheduler。")
    if request.job_name in {"refresh_factor_scores", "quant_scan_daily"}:
        payload = await research.cross_section(symbols, persist=True, db=db)
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(payload.ranks), "universeSize": payload.universe_size}, "Cached", "每日因子分數已計算並嘗試持久化到 factor_scores。")
    if request.job_name == "data_quality_check":
        rows = await research.data_quality(db)
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(rows)}, "Cached", "資料品質檢查完成並嘗試寫入 data_quality_reports。")
    if request.job_name == "theme_strength_scan":
        rows = await research.theme_strength(symbols)
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(rows), "themes": [row.model_dump(by_alias=True) for row in rows]}, "Cached", "題材相對強弱掃描完成。")
    if request.job_name in {"source_digest_collect", "official_source_digest"}:
        payload = await SourceDigestService().collect(SourceDigestRequest(symbols=symbols, sourceSet="official", maxPages=8, persist=True), db)
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(payload.items), "sources": [row.model_dump(by_alias=True) for row in payload.sources]}, "Cached", "官方來源摘要已彙整；只保存 metadata，不保存全文。")
    return ok_response({"jobName": request.job_name, "recordsProcessed": 0}, "Missing", "未知 job_name；支援 refresh_latest_quotes、refresh_daily_kline、refresh_factor_scores、data_quality_check、theme_strength_scan、source_digest_collect。")

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.ai.extractors import AIQuantService
from app.ai.schemas import AISourceDigestInput
from app.db.session import get_db
from app.schemas.common import ok_response
from app.schemas.market import JobRunRequest, RefreshKLineRequest, RefreshQuotesRequest
from app.schemas.source_digest import SourceDigestRequest
from app.services.institutional_flow_service import InstitutionalFlowService
from app.services.market_data_service import MarketDataService
from app.services.market_warning_service import MarketWarningService
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
async def refresh_kline(request: RefreshKLineRequest, db: Session = Depends(get_db)):
    payload = await MarketDataService().refresh_kline(request, db)
    return ok_response(payload.model_dump(by_alias=True), payload.data_source, "已刷新 K 線資料，並嘗試寫入 price_bars。")


@router.get("/market-data/warnings")
async def market_warnings(symbols: str = Query("")):
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()]
    payload = await MarketWarningService().warnings(symbol_list or None)
    return ok_response(payload.model_dump(by_alias=True), "Official" if payload.items else "Missing", payload.source_note)


@router.get("/market-data/warnings/{symbol}")
async def market_warnings_for_symbol(symbol: str):
    payload = await MarketWarningService().warnings_for_symbol(symbol)
    return ok_response(payload.model_dump(by_alias=True), "Official" if payload.items else "Missing", payload.source_note)


@router.post("/jobs/run")
async def run_job(request: JobRunRequest, db: Session = Depends(get_db)):
    symbols = request.symbols or ["2330", "2382", "2317"]
    service = MarketDataService()
    research = ResearchService()
    if request.job_name in {"refresh_latest_quotes", "refresh_watchlist_quotes"}:
        quotes = await service.refresh_quotes(RefreshQuotesRequest(symbols=symbols, provider="auto"))
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(quotes)}, "Demo", "Job 已同步執行；排程化可接 APScheduler。")
    if request.job_name == "refresh_daily_kline":
        results = []
        total_bars = 0
        data_sources: list[str] = []
        for symbol in symbols:
            payload = await service.refresh_kline(RefreshKLineRequest(symbol=symbol, interval="1d", range="1y", provider="auto"), db)
            total_bars += len(payload.bars)
            data_sources.append(payload.data_source)
            results.append({
                "symbol": payload.symbol,
                "name": payload.name,
                "bars": len(payload.bars),
                "provider": payload.provider,
                "dataSource": payload.data_source,
                "isRealtime": payload.is_realtime,
                "delayMinutes": payload.delay_minutes,
                "fetchedAt": payload.fetched_at,
            })
        data_source = "Cached" if any(source != "Demo" for source in data_sources) else "Demo"
        return ok_response({"jobName": request.job_name, "recordsProcessed": total_bars, "symbolsProcessed": len(results), "results": results}, data_source, "已逐檔刷新整批日 K 並嘗試寫入 price_bars；若 provider 不可用，該檔會明確標示 fallback 來源。")
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
    if request.job_name == "refresh_institutional_flow":
        flow_service = InstitutionalFlowService()
        rows = [await flow_service.latest_flow(symbol) for symbol in symbols]
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(rows), "flows": [row.model_dump(by_alias=True) for row in rows]}, rows[0].data_source if rows else "Missing", "法人籌碼資料已刷新；若為 Demo fallback，請勿視為真實外資/投信資料。")
    if request.job_name in {"ai_source_digest_analysis", "ai_daily_factor_refresh"}:
        payload = await AIQuantService().analyze_source_digest(AISourceDigestInput(symbols=symbols, themes=[], maxItems=8), db)
        return ok_response({"jobName": request.job_name, "recordsProcessed": len(payload.factors), "factors": [row.model_dump(by_alias=True) for row in payload.factors], "warnings": payload.warnings}, "Estimated", "AI source digest analysis completed. Uses OpenAI API only when configured; otherwise rule fallback is used.")
    return ok_response({"jobName": request.job_name, "recordsProcessed": 0}, "Missing", "未知 job_name；支援 refresh_latest_quotes、refresh_daily_kline、refresh_factor_scores、data_quality_check、theme_strength_scan、source_digest_collect、refresh_institutional_flow、ai_source_digest_analysis。")

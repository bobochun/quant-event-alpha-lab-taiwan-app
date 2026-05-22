from __future__ import annotations

import asyncio
import logging

from app.ai.extractors import AIQuantService
from app.ai.schemas import AISourceDigestInput
from app.core.config import get_settings
from app.schemas.market import RefreshKLineRequest
from app.schemas.source_digest import SourceDigestRequest
from app.services.institutional_flow_service import InstitutionalFlowService
from app.services.kline_service import KLineService
from app.services.quant_analysis_service import QuantAnalysisService
from app.services.quote_service import QuoteService
from app.services.source_digest_service import SourceDigestService

logger = logging.getLogger(__name__)


async def _safe_run(name: str, coro) -> None:
    try:
        await coro
        logger.info("scheduled task completed: %s", name)
    except Exception as exc:
        logger.warning("scheduled task failed: %s: %s", name, exc)


async def _refresh_watchlist() -> None:
    settings = get_settings()
    await QuoteService().batch_latest(settings.scheduler_symbol_list)


def refresh_watchlist_quotes() -> None:
    asyncio.run(_safe_run("refresh_watchlist_quotes", _refresh_watchlist()))


async def _refresh_daily_kline() -> None:
    settings = get_settings()
    service = KLineService()
    for symbol in settings.scheduler_symbol_list[:8]:
        await service.kline(symbol=symbol, interval="1d", range_key="1y", provider="auto")


def refresh_daily_kline() -> None:
    asyncio.run(_safe_run("refresh_daily_kline", _refresh_daily_kline()))


async def _refresh_institutional_flow() -> None:
    settings = get_settings()
    service = InstitutionalFlowService()
    for symbol in settings.scheduler_symbol_list[:12]:
        await service.latest_flow(symbol)


def refresh_institutional_flow() -> None:
    asyncio.run(_safe_run("refresh_institutional_flow", _refresh_institutional_flow()))


async def _quant_scan_daily() -> None:
    settings = get_settings()
    await QuantAnalysisService().analyze_batch(settings.scheduler_symbol_list, interval="1d", range_key="1y", provider="auto")


def quant_scan_daily() -> None:
    asyncio.run(_safe_run("quant_scan_daily", _quant_scan_daily()))


async def _source_digest_collect() -> None:
    settings = get_settings()
    await SourceDigestService().collect(SourceDigestRequest(symbols=settings.scheduler_symbol_list[:8], sourceSet="official", maxPages=8, persist=False))


def source_digest_collect() -> None:
    asyncio.run(_safe_run("source_digest_collect", _source_digest_collect()))


async def _ai_source_digest_analysis() -> None:
    settings = get_settings()
    await AIQuantService().analyze_source_digest(AISourceDigestInput(symbols=settings.scheduler_symbol_list[:8], maxItems=6))


def ai_source_digest_analysis() -> None:
    asyncio.run(_safe_run("ai_source_digest_analysis", _ai_source_digest_analysis()))

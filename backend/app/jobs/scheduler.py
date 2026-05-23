from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import get_settings
from app.jobs.tasks import (
    ai_source_digest_analysis,
    quant_scan_daily,
    refresh_daily_kline,
    refresh_institutional_flow,
    refresh_watchlist_quotes,
    source_digest_collect,
)


def create_scheduler() -> BackgroundScheduler:
    settings = get_settings()
    scheduler = BackgroundScheduler(timezone="Asia/Taipei")
    scheduler.add_job(
        refresh_watchlist_quotes,
        "interval",
        minutes=max(1, settings.scheduler_quote_minutes),
        id="refresh_watchlist_quotes",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        refresh_daily_kline,
        "interval",
        minutes=max(15, settings.scheduler_kline_minutes),
        id="refresh_daily_kline",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        refresh_institutional_flow,
        "interval",
        minutes=max(15, settings.scheduler_kline_minutes),
        id="refresh_institutional_flow",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        quant_scan_daily,
        "interval",
        minutes=max(30, settings.scheduler_quant_minutes),
        id="quant_scan_daily",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        source_digest_collect,
        "interval",
        minutes=max(60, settings.scheduler_digest_minutes),
        id="source_digest_collect",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        ai_source_digest_analysis,
        "interval",
        minutes=max(120, settings.scheduler_ai_minutes),
        id="ai_source_digest_analysis",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    return scheduler

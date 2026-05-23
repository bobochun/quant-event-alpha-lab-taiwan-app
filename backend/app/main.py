from datetime import datetime, timezone
import platform
import sys
import time

from fastapi import FastAPI

from app.api.routes_ai import router as ai_router
from app.api.routes_events import router as events_router
from app.api.routes_kline import router as kline_router
from app.api.routes_market_data import router as market_data_router
from app.api.routes_quant import router as quant_router
from app.api.routes_quotes import router as quotes_router
from app.api.routes_research import router as research_router
from app.api.routes_source_digest import router as source_digest_router
from app.api.routes_sources import router as sources_router
from app.core.config import get_settings
from app.core.cors import configure_cors
from app.db.init_db import init_db
from app.jobs.scheduler import create_scheduler
from app.schemas.common import ok_response


settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version)
configure_cors(app, settings)
init_db()

STARTED_AT = time.time()
IS_PYTEST = "pytest" in sys.modules
SCHEDULER = create_scheduler() if settings.enable_backend_scheduler and not IS_PYTEST else None

app.include_router(quotes_router)
app.include_router(kline_router)
app.include_router(quant_router)
app.include_router(research_router)
app.include_router(ai_router)
app.include_router(source_digest_router)
app.include_router(market_data_router)
app.include_router(sources_router)
app.include_router(events_router)


@app.on_event("startup")
async def startup_scheduler() -> None:
    if SCHEDULER and not SCHEDULER.running:
        SCHEDULER.start()


@app.on_event("shutdown")
async def shutdown_scheduler() -> None:
    if SCHEDULER and SCHEDULER.running:
        SCHEDULER.shutdown(wait=False)


@app.get("/")
async def root():
    return ok_response(
        {
            "message": "Quant Event Alpha Backend is running",
            "docs": "/docs",
            "health": "/health",
        },
        "Demo",
        "後端服務已啟動。根路由僅供健康檢查與導向 API 文件使用。",
    )


@app.get("/health")
async def health():
    return ok_response(
        {
            "status": "ok",
            "service": "quant-event-alpha-backend",
            "version": settings.app_version,
            "environment": settings.app_env,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "Demo",
        "後端服務正常。",
    )


@app.get("/version")
async def version():
    return ok_response(
        {
            "version": settings.app_version,
            "appName": settings.app_name,
        },
        "Demo",
        "版本資訊。",
    )


@app.get("/diagnostics")
async def diagnostics():
    uptime_seconds = round(time.time() - STARTED_AT, 2)
    scheduled_jobs = []
    if SCHEDULER:
        scheduled_jobs = [
            {
                "id": job.id,
                "nextRunTime": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger),
            }
            for job in SCHEDULER.get_jobs()
        ]

    return ok_response(
        {
            "service": "quant-event-alpha-backend",
            "version": settings.app_version,
            "environment": settings.app_env,
            "pythonVersion": platform.python_version(),
            "platform": platform.platform(),
            "uptimeSeconds": uptime_seconds,
            "features": {
                "finmind": settings.enable_finmind,
                "officialData": settings.enable_official_data,
                "yfinanceFallback": settings.enable_yfinance,
                "demoFallback": settings.enable_demo_fallback,
                "publicSourceDigest": settings.enable_public_web_crawler,
                "aiQuant": settings.enable_ai_quant,
                "aiHasApiKey": bool(settings.openai_api_key.strip()),
                "aiScoreInAlpha": settings.enable_ai_score_in_alpha,
                "backendScheduler": bool(SCHEDULER),
                "schedulerDisabledForPytest": IS_PYTEST,
            },
            "scheduler": {
                "enabled": bool(SCHEDULER),
                "configured": settings.enable_backend_scheduler,
                "disabledForPytest": IS_PYTEST,
                "symbols": settings.scheduler_symbol_list,
                "jobs": scheduled_jobs,
            },
            "cache": {
                "quoteCacheSeconds": settings.quote_cache_seconds,
                "klineCacheSeconds": settings.kline_cache_seconds,
                "marketDataCacheSeconds": settings.market_data_cache_seconds,
            },
            "cors": {
                "allowedOrigins": settings.cors_origin_list,
                "allowedOriginRegex": settings.cors_origin_regex,
            },
            "providers": {
                "licensedRealtime": "placeholder",
                "finmind": "enabled" if settings.enable_finmind else "disabled",
                "twse": "enabled" if settings.enable_official_data else "fallback/manual",
                "tpex": "enabled" if settings.enable_official_data else "fallback/manual",
                "yfinance": "enabled" if settings.enable_yfinance else "disabled",
                "demo": "enabled" if settings.enable_demo_fallback else "disabled",
                "events": "/events/upcoming",
                "quant": "/quant/analyze/2330",
                "research": "/research/cross-section",
                "eventStudy": "/research/event-study",
                "portfolioOptimizer": "/research/portfolio-optimize",
                "sourceDigest": "/source-digest/collect",
                "aiStatus": "/ai/status",
                "aiSourceDigest": "/ai/analyze-source-digest",
            },
        },
        "Demo",
        "診斷資訊不包含任何 secret，可用於部署與連線檢查。",
    )
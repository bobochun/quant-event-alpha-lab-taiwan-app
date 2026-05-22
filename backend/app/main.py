from datetime import datetime, timezone
import platform
import time

from fastapi import FastAPI

from app.api.routes_events import router as events_router
from app.api.routes_kline import router as kline_router
from app.api.routes_market_data import router as market_data_router
from app.api.routes_quant import router as quant_router
from app.api.routes_quotes import router as quotes_router
from app.api.routes_research import router as research_router
from app.api.routes_sources import router as sources_router
from app.core.config import get_settings
from app.core.cors import configure_cors
from app.db.init_db import init_db
from app.schemas.common import ok_response


settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version)
configure_cors(app, settings)
init_db()

STARTED_AT = time.time()

app.include_router(quotes_router)
app.include_router(kline_router)
app.include_router(quant_router)
app.include_router(research_router)
app.include_router(market_data_router)
app.include_router(sources_router)
app.include_router(events_router)


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
            },
        },
        "Demo",
        "診斷資訊不包含任何 secret，可用於部署與連線檢查。",
    )
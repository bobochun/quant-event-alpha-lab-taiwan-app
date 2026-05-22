from fastapi import FastAPI

from app.api.routes_kline import router as kline_router
from app.api.routes_market_data import router as market_data_router
from app.api.routes_quotes import router as quotes_router
from app.api.routes_sources import router as sources_router
from app.core.config import get_settings
from app.core.cors import configure_cors
from app.db.init_db import init_db
from app.schemas.common import ok_response


settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version)
configure_cors(app, settings)
init_db()

app.include_router(quotes_router)
app.include_router(kline_router)
app.include_router(market_data_router)
app.include_router(sources_router)


@app.get("/health")
async def health():
    return ok_response({"status": "ok"}, "Demo", "後端服務正常。")


@app.get("/version")
async def version():
    return ok_response({"version": settings.app_version, "appName": settings.app_name}, "Demo", "版本資訊。")

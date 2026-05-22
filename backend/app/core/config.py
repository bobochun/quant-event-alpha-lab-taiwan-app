from functools import lru_cache
import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Quant Event Alpha Lab Taiwan Market Backend"
    app_version: str = "0.1.0"
    app_env: str = "development"
    api_prefix: str = ""

    database_url: str = "sqlite:///./backend/data/market_data.sqlite3"

    cors_origins: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )
    cors_origin_regex: str = r"https://.*\.(vercel\.app|app\.github\.dev)$"

    enable_finmind: bool = False
    finmind_api_token: str = ""
    enable_official_data: bool = False
    enable_yfinance: bool = True
    enable_demo_fallback: bool = True

    twse_openapi_base_url: str = "https://openapi.twse.com.tw/v1"
    tpex_openapi_base_url: str = "https://www.tpex.org.tw/openapi"
    official_data_timeout_ms: int = 8000

    market_data_cache_seconds: int = 10
    quote_cache_seconds: int = 10
    kline_cache_seconds: int = 300

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        finmind_api_token=os.getenv("FINMIND_API_TOKEN", ""),
        enable_finmind=os.getenv("ENABLE_FINMIND", "false").lower() == "true",
        enable_official_data=os.getenv("ENABLE_OFFICIAL_DATA", "false").lower() == "true",
        enable_yfinance=os.getenv("ENABLE_YFINANCE", "true").lower() == "true",
        enable_demo_fallback=os.getenv("ENABLE_DEMO_FALLBACK", "true").lower() == "true",
        database_url=os.getenv("DATABASE_URL", "sqlite:///./backend/data/market_data.sqlite3"),
        cors_origins=os.getenv(
            "BACKEND_CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ),
        cors_origin_regex=os.getenv(
            "BACKEND_CORS_ORIGIN_REGEX",
            r"https://.*\.(vercel\.app|app\.github\.dev)$",
        ),
        official_data_timeout_ms=int(os.getenv("OFFICIAL_DATA_TIMEOUT_MS", "8000")),
        market_data_cache_seconds=int(os.getenv("MARKET_DATA_CACHE_SECONDS", "10")),
        quote_cache_seconds=int(os.getenv("QUOTE_CACHE_SECONDS", "10")),
        kline_cache_seconds=int(os.getenv("KLINE_CACHE_SECONDS", "300")),
    )
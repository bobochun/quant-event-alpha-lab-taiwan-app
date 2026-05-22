from functools import lru_cache
import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Quant Event Alpha Lab Taiwan Market Backend"
    app_version: str = "0.1.0"
    app_env: str = "development"
    api_prefix: str = ""

    database_url: str = "sqlite:///./data/market_data.sqlite3"

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

    enable_public_web_crawler: bool = False
    crawler_user_agent: str = "QuantEventAlphaLabTaiwan/0.1 research metadata bot; contact=local-user"
    crawler_allowed_domains: str = "mops.twse.com.tw,openapi.twse.com.tw,www.twse.com.tw,www.tpex.org.tw,finmindtrade.com"
    crawler_timeout_ms: int = 8000
    crawler_max_pages_per_run: int = 12
    crawler_respect_robots: bool = True
    crawler_min_request_interval_ms: int = 1200

    enable_ai_quant: bool = False
    enable_ai_score_in_alpha: bool = False
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    openai_base_url: str = "https://api.openai.com/v1"
    ai_request_timeout_ms: int = 20000
    ai_max_items_per_run: int = 20
    ai_schema_version: str = "ai-quant-v1"

    enable_backend_scheduler: bool = True
    scheduler_symbols: str = "2330,2382,2317,2308,3017,3037,3231,2603,2615,2454"
    scheduler_quote_minutes: int = 5
    scheduler_kline_minutes: int = 60
    scheduler_quant_minutes: int = 120
    scheduler_digest_minutes: int = 240
    scheduler_ai_minutes: int = 360

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def crawler_allowed_domain_list(self) -> list[str]:
        return [item.strip().lower() for item in self.crawler_allowed_domains.split(",") if item.strip()]

    @property
    def ai_enabled_with_key(self) -> bool:
        return self.enable_ai_quant and bool(self.openai_api_key.strip())

    @property
    def scheduler_symbol_list(self) -> list[str]:
        return [item.strip() for item in self.scheduler_symbols.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        finmind_api_token=os.getenv("FINMIND_API_TOKEN", ""),
        enable_finmind=os.getenv("ENABLE_FINMIND", "false").lower() == "true",
        enable_official_data=os.getenv("ENABLE_OFFICIAL_DATA", "false").lower() == "true",
        enable_yfinance=os.getenv("ENABLE_YFINANCE", "true").lower() == "true",
        enable_demo_fallback=os.getenv("ENABLE_DEMO_FALLBACK", "true").lower() == "true",
        database_url=os.getenv("DATABASE_URL", "sqlite:///./data/market_data.sqlite3"),
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
        enable_public_web_crawler=os.getenv("ENABLE_PUBLIC_WEB_CRAWLER", "false").lower() == "true",
        crawler_user_agent=os.getenv("CRAWLER_USER_AGENT", "QuantEventAlphaLabTaiwan/0.1 research metadata bot; contact=local-user"),
        crawler_allowed_domains=os.getenv("CRAWLER_ALLOWED_DOMAINS", "mops.twse.com.tw,openapi.twse.com.tw,www.twse.com.tw,www.tpex.org.tw,finmindtrade.com"),
        crawler_timeout_ms=int(os.getenv("CRAWLER_TIMEOUT_MS", "8000")),
        crawler_max_pages_per_run=int(os.getenv("CRAWLER_MAX_PAGES_PER_RUN", "12")),
        crawler_respect_robots=os.getenv("CRAWLER_RESPECT_ROBOTS", "true").lower() == "true",
        crawler_min_request_interval_ms=int(os.getenv("CRAWLER_MIN_REQUEST_INTERVAL_MS", "1200")),
        enable_ai_quant=os.getenv("ENABLE_AI_QUANT", "false").lower() == "true",
        enable_ai_score_in_alpha=os.getenv("ENABLE_AI_SCORE_IN_ALPHA", "false").lower() == "true",
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        openai_base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        ai_request_timeout_ms=int(os.getenv("AI_REQUEST_TIMEOUT_MS", "20000")),
        ai_max_items_per_run=int(os.getenv("AI_MAX_ITEMS_PER_RUN", "20")),
        ai_schema_version=os.getenv("AI_SCHEMA_VERSION", "ai-quant-v1"),
        enable_backend_scheduler=os.getenv("ENABLE_BACKEND_SCHEDULER", "true").lower() == "true",
        scheduler_symbols=os.getenv("SCHEDULER_SYMBOLS", "2330,2382,2317,2308,3017,3037,3231,2603,2615,2454"),
        scheduler_quote_minutes=int(os.getenv("SCHEDULER_QUOTE_MINUTES", "5")),
        scheduler_kline_minutes=int(os.getenv("SCHEDULER_KLINE_MINUTES", "60")),
        scheduler_quant_minutes=int(os.getenv("SCHEDULER_QUANT_MINUTES", "120")),
        scheduler_digest_minutes=int(os.getenv("SCHEDULER_DIGEST_MINUTES", "240")),
        scheduler_ai_minutes=int(os.getenv("SCHEDULER_AI_MINUTES", "360")),
    )
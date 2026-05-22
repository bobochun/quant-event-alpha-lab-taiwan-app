from datetime import date, datetime, timezone
import time

import httpx

from app.core.config import Settings
from app.data_sources.base import MarketDataProvider, ProviderUnavailable, UnsupportedInterval
from app.data_sources.demo_market import security_name
from app.schemas.market import Interval, PriceBar, QuoteData, SourceHealth


class FinMindProvider(MarketDataProvider):
    provider_name = "finmind"
    data_source = "FinMind"
    is_realtime = False
    delay_minutes = None
    license_note = "FinMind 部分即時資料需要 sponsor 權限；未設定 token 時會停用。"
    source_note = "FinMind 資料權限依帳號與 endpoint 而定。"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = "https://api.finmindtrade.com/api/v4/data"

    @property
    def enabled(self) -> bool:
        return self.settings.enable_finmind and bool(self.settings.finmind_api_token)

    async def get_latest_quote(self, symbol: str) -> QuoteData | None:
        if not self.enabled:
            raise ProviderUnavailable("未設定 FINMIND_API_TOKEN，FinMind provider 已停用。")
        # Snapshot endpoint availability varies by account. Use TaiwanStockPrice for latest daily fallback.
        today = date.today().isoformat()
        rows = await self._fetch("TaiwanStockPrice", symbol, today, today)
        if not rows:
            raise ProviderUnavailable("FinMind 未回傳最新報價資料，可能需要 sponsor 權限或盤後才有資料。")
        row = rows[-1]
        close = float(row.get("close", 0))
        open_price = float(row.get("open", close))
        high = float(row.get("max", close))
        low = float(row.get("min", close))
        volume = int(float(row.get("Trading_Volume", 0)))
        fetched = datetime.now(timezone.utc).isoformat()
        return QuoteData(
            symbol=symbol,
            name=security_name(symbol),
            price=close,
            previousClose=None,
            change=None,
            changePercent=None,
            open=open_price,
            high=high,
            low=low,
            volume=volume,
            value=float(row.get("Trading_money", 0) or 0),
            quoteTime=f"{row.get('date', today)}T00:00:00+08:00",
            provider=self.provider_name,
            dataSource="FinMind",
            isRealtime=False,
            delayMinutes=None,
            licenseNote=self.license_note,
            sourceNote="FinMind TaiwanStockPrice 日資料，不標示為即時。",
            fetchedAt=fetched,
        )

    async def get_kline(self, symbol: str, interval: Interval, start: date, end: date) -> list[PriceBar]:
        if not self.enabled:
            raise ProviderUnavailable("未設定 FINMIND_API_TOKEN，FinMind provider 已停用。")
        if not self.supports_interval(interval):
            raise UnsupportedInterval(f"FinMind 目前未啟用 {interval} 週期。")
        rows = await self._fetch("TaiwanStockPrice", symbol, start.isoformat(), end.isoformat())
        return [
            PriceBar(
                time=str(row.get("date")),
                open=float(row.get("open", 0)),
                high=float(row.get("max", 0)),
                low=float(row.get("min", 0)),
                close=float(row.get("close", 0)),
                volume=int(float(row.get("Trading_Volume", 0))),
                value=float(row.get("Trading_money", 0) or 0),
            )
            for row in rows
        ]

    def supports_interval(self, interval: Interval) -> bool:
        return interval in {"1d"}

    async def health_check(self) -> SourceHealth:
        return SourceHealth(
            provider=self.provider_name,
            datasetType="quotes_latest,kline",
            status="ok" if self.enabled else "disabled",
            errorMessage=None if self.enabled else "未設定 FINMIND_API_TOKEN；需要 token 或 sponsor 權限才啟用。",
            supportsLatestQuote=True,
            supportsIntraday=False,
            supportsDaily=True,
            isRealtime=False,
            tokenConfigured=bool(self.settings.finmind_api_token),
        )

    async def _fetch(self, dataset: str, symbol: str, start: str, end: str) -> list[dict]:
        started = time.perf_counter()
        params = {
            "dataset": dataset,
            "data_id": symbol,
            "start_date": start,
            "end_date": end,
            "token": self.settings.finmind_api_token,
        }
        timeout = self.settings.official_data_timeout_ms / 1000
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(self.base_url, params=params)
        if response.status_code in {401, 402, 403}:
            raise ProviderUnavailable("FinMind 權限不足，可能需要 sponsor 權限。")
        response.raise_for_status()
        body = response.json()
        if not body.get("status") == 200:
            raise ProviderUnavailable(str(body.get("msg") or "FinMind API 回傳非成功狀態。"))
        return body.get("data") or []

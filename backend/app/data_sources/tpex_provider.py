from datetime import date

import httpx

from app.core.config import Settings
from app.data_sources.base import MarketDataProvider, ProviderUnavailable, UnsupportedInterval
from app.schemas.market import Interval, PriceBar, QuoteData, SourceHealth


class TpexProvider(MarketDataProvider):
    provider_name = "tpex-official"
    data_source = "Official"
    is_realtime = False
    delay_minutes = None
    license_note = "TPEx 官方公開資料，可能為盤後或延遲資料。"
    source_note = "官方公開資料不等同 tick-level 即時行情。"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def get_latest_quote(self, symbol: str) -> QuoteData | None:
        raise ProviderUnavailable("TPEx 官方 provider 第一版僅作來源狀態與未來 adapter，不假裝即時報價。")

    async def get_kline(self, symbol: str, interval: Interval, start: date, end: date) -> list[PriceBar]:
        if not self.supports_interval(interval):
            raise UnsupportedInterval("TPEx 官方公開資料目前不支援此週期。")
        raise ProviderUnavailable("TPEx 日 K endpoint 會依官方 OpenAPI 調整；目前使用 fallback。")

    def supports_interval(self, interval: Interval) -> bool:
        return interval in {"1d"}

    async def health_check(self) -> SourceHealth:
        if not self.settings.enable_official_data:
            return SourceHealth(
                provider=self.provider_name,
                datasetType="official_market_data",
                status="disabled",
                errorMessage="ENABLE_OFFICIAL_DATA 未開啟；前端仍可使用 fallback。",
                supportsLatestQuote=False,
                supportsIntraday=False,
                supportsDaily=True,
                isRealtime=False,
                tokenConfigured=False,
            )
        try:
            timeout = self.settings.official_data_timeout_ms / 1000
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(self.settings.tpex_openapi_base_url)
            return SourceHealth(
                provider=self.provider_name,
                datasetType="official_market_data",
                status="ok" if response.status_code < 500 else "degraded",
                recordsFetched=1 if response.status_code < 500 else 0,
                errorMessage=None if response.status_code < 500 else f"TPEx HTTP {response.status_code}",
                supportsLatestQuote=False,
                supportsIntraday=False,
                supportsDaily=True,
                isRealtime=False,
                tokenConfigured=False,
            )
        except Exception as exc:
            return SourceHealth(
                provider=self.provider_name,
                datasetType="official_market_data",
                status="error",
                errorMessage=f"TPEx 官方資料源連線失敗：{exc}",
                supportsLatestQuote=False,
                supportsIntraday=False,
                supportsDaily=True,
                isRealtime=False,
                tokenConfigured=False,
            )

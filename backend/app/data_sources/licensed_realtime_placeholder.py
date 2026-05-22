from datetime import date

from app.core.config import Settings
from app.data_sources.base import MarketDataProvider, ProviderUnavailable
from app.schemas.market import Interval, PriceBar, QuoteData, SourceHealth


class LicensedRealtimePlaceholder(MarketDataProvider):
    provider_name = "licensed-realtime-placeholder"
    data_source = "LicensedRealtime"
    is_realtime = True
    delay_minutes = 0
    license_note = "預留合法即時報價 provider；本階段未設定授權。"
    source_note = "需要正式行情授權或 API key，未設定時不會啟用。"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def get_latest_quote(self, symbol: str) -> QuoteData | None:
        raise ProviderUnavailable("尚未設定合法即時報價 provider。")

    async def get_kline(self, symbol: str, interval: Interval, start: date, end: date) -> list[PriceBar]:
        raise ProviderUnavailable("尚未設定合法即時報價 provider。")

    def supports_interval(self, interval: Interval) -> bool:
        return interval in {"1m", "5m", "15m", "1d"}

    async def health_check(self) -> SourceHealth:
        return SourceHealth(
            provider=self.provider_name,
            datasetType="quotes_latest",
            status="disabled",
            errorMessage="未設定合法即時行情授權。",
            supportsLatestQuote=True,
            supportsIntraday=True,
            supportsDaily=True,
            isRealtime=True,
            tokenConfigured=False,
        )

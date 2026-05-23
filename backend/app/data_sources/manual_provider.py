from datetime import date

from app.core.config import Settings
from app.data_sources.base import MarketDataProvider, ProviderUnavailable
from app.schemas.market import Interval, PriceBar, QuoteData, SourceHealth


class ManualProvider(MarketDataProvider):
    provider_name = "manual-import"
    data_source = "Manual"
    is_realtime = False
    delay_minutes = None
    license_note = "使用者手動匯入資料，請自行確認來源與正確性。"
    source_note = "後端第一版尚未讀取手動 CSV；前端 localStorage 匯入仍由前端處理。"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def get_latest_quote(self, symbol: str) -> QuoteData | None:
        raise ProviderUnavailable("後端尚無手動報價資料。")

    async def get_kline(self, symbol: str, interval: Interval, start: date, end: date) -> list[PriceBar]:
        raise ProviderUnavailable("後端尚無手動 K 線資料。")

    def supports_interval(self, interval: Interval) -> bool:
        return interval in {"1d", "1w", "1mo"}

    async def health_check(self) -> SourceHealth:
        return SourceHealth(
            provider=self.provider_name,
            datasetType="manual_market_data",
            status="disabled",
            errorMessage="後端尚未掛載手動 price_history 匯入；請先使用前端 CSV 匯入。",
            supportsLatestQuote=False,
            supportsIntraday=False,
            supportsDaily=True,
            isRealtime=False,
            tokenConfigured=False,
        )

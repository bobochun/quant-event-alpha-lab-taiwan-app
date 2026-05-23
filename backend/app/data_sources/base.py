from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date

from app.schemas.market import Interval, PriceBar, QuoteData, SourceHealth


class ProviderUnavailable(Exception):
    """Raised when a provider cannot serve the requested data."""


class UnsupportedInterval(Exception):
    """Raised when a provider does not support a k-line interval."""


class MarketDataProvider(ABC):
    provider_name: str
    data_source: str
    is_realtime: bool
    delay_minutes: int | None
    license_note: str
    source_note: str

    @abstractmethod
    async def get_latest_quote(self, symbol: str) -> QuoteData | None:
        raise NotImplementedError

    async def get_latest_quotes(self, symbols: list[str]) -> list[QuoteData]:
        results: list[QuoteData] = []
        for symbol in symbols:
            quote = await self.get_latest_quote(symbol)
            if quote:
                results.append(quote)
        return results

    @abstractmethod
    async def get_kline(self, symbol: str, interval: Interval, start: date, end: date) -> list[PriceBar]:
        raise NotImplementedError

    @abstractmethod
    def supports_interval(self, interval: Interval) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> SourceHealth:
        raise NotImplementedError

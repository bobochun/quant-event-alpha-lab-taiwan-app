from app.core.config import Settings, get_settings
from app.data_sources.finmind_provider import FinMindProvider
from app.data_sources.licensed_realtime_placeholder import LicensedRealtimePlaceholder
from app.data_sources.manual_provider import ManualProvider
from app.data_sources.tpex_provider import TpexProvider
from app.data_sources.twse_provider import TwseProvider
from app.data_sources.yfinance_provider import YFinanceProvider
from app.data_sources.base import MarketDataProvider


class ProviderRegistry:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.providers: dict[str, MarketDataProvider] = {
            "licensed": LicensedRealtimePlaceholder(self.settings),
            "finmind": FinMindProvider(self.settings),
            "twse": TwseProvider(self.settings),
            "tpex": TpexProvider(self.settings),
            "manual": ManualProvider(self.settings),
            "yfinance": YFinanceProvider(self.settings),
        }

    def get(self, provider: str) -> MarketDataProvider | None:
        return self.providers.get(provider)

    def quote_priority(self, requested: str = "auto") -> list[MarketDataProvider]:
        if requested != "auto":
            if requested == "official":
                return [self.providers["twse"], self.providers["tpex"]]
            provider = self.providers.get(requested)
            return [provider] if provider else []
        return [
            self.providers["licensed"],
            self.providers["finmind"],
            self.providers["twse"],
            self.providers["tpex"],
            self.providers["manual"],
            self.providers["yfinance"],
        ]

    async def health(self):
        return [await provider.health_check() for provider in self.providers.values()]

from datetime import date, datetime, timezone

from app.core.config import Settings
from app.data_sources.base import MarketDataProvider, ProviderUnavailable, UnsupportedInterval
from app.data_sources.demo_market import security_name
from app.schemas.market import Interval, PriceBar, QuoteData, SourceHealth


class YFinanceProvider(MarketDataProvider):
    provider_name = "yfinance"
    data_source = "DelayedFallback"
    is_realtime = False
    delay_minutes = None
    license_note = "非官方研究資料，可能延遲或不穩定。"
    source_note = "yfinance 僅作研究 fallback，不標示為正式即時資料。"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def get_latest_quote(self, symbol: str) -> QuoteData | None:
        if not self.settings.enable_yfinance:
            raise ProviderUnavailable("yfinance fallback 已停用。")
        try:
            import yfinance as yf  # type: ignore
        except Exception as exc:
            raise ProviderUnavailable(f"yfinance 套件未安裝：{exc}") from exc
        ticker = yf.Ticker(f"{symbol}.TW")
        history = ticker.history(period="5d", interval="1d")
        if history.empty:
            ticker = yf.Ticker(f"{symbol}.TWO")
            history = ticker.history(period="5d", interval="1d")
        if history.empty:
            raise ProviderUnavailable("yfinance 沒有回傳可用資料。")
        latest = history.iloc[-1]
        previous = history.iloc[-2]["Close"] if len(history) > 1 else latest["Close"]
        price = float(latest["Close"])
        change = price - float(previous)
        fetched = datetime.now(timezone.utc).isoformat()
        return QuoteData(
            symbol=symbol,
            name=security_name(symbol),
            price=round(price, 2),
            previousClose=round(float(previous), 2),
            change=round(change, 2),
            changePercent=round((change / float(previous)) * 100, 2) if previous else 0,
            open=round(float(latest["Open"]), 2),
            high=round(float(latest["High"]), 2),
            low=round(float(latest["Low"]), 2),
            volume=int(latest["Volume"]),
            value=None,
            quoteTime=str(history.index[-1]),
            provider=self.provider_name,
            dataSource=self.data_source,
            isRealtime=False,
            delayMinutes=None,
            licenseNote=self.license_note,
            sourceNote=self.source_note,
            fetchedAt=fetched,
        )

    async def get_kline(self, symbol: str, interval: Interval, start: date, end: date) -> list[PriceBar]:
        if not self.settings.enable_yfinance:
            raise ProviderUnavailable("yfinance fallback 已停用。")
        if not self.supports_interval(interval):
            raise UnsupportedInterval("yfinance fallback 不支援此週期。")
        try:
            import yfinance as yf  # type: ignore
        except Exception as exc:
            raise ProviderUnavailable(f"yfinance 套件未安裝：{exc}") from exc
        yf_interval = {"1m": "1m", "5m": "5m", "15m": "15m", "1d": "1d", "1w": "1wk", "1mo": "1mo"}[interval]
        ticker = yf.Ticker(f"{symbol}.TW")
        history = ticker.history(start=start.isoformat(), end=end.isoformat(), interval=yf_interval)
        if history.empty:
            ticker = yf.Ticker(f"{symbol}.TWO")
            history = ticker.history(start=start.isoformat(), end=end.isoformat(), interval=yf_interval)
        if history.empty:
            raise ProviderUnavailable("yfinance 沒有回傳可用 K 線資料。")
        bars: list[PriceBar] = []
        for timestamp, row in history.iterrows():
            bars.append(PriceBar(
                time=str(timestamp),
                open=round(float(row["Open"]), 2),
                high=round(float(row["High"]), 2),
                low=round(float(row["Low"]), 2),
                close=round(float(row["Close"]), 2),
                volume=int(row["Volume"]),
                value=None,
            ))
        return bars

    def supports_interval(self, interval: Interval) -> bool:
        return interval in {"1m", "5m", "15m", "1d", "1w", "1mo"}

    async def health_check(self) -> SourceHealth:
        package_ok = True
        try:
            import yfinance  # type: ignore  # noqa: F401
        except Exception:
            package_ok = False
        return SourceHealth(
            provider=self.provider_name,
            datasetType="quotes_latest,kline",
            status="ok" if self.settings.enable_yfinance and package_ok else "degraded",
            errorMessage=None if package_ok else "yfinance 套件未安裝；會使用 Demo fallback。",
            supportsLatestQuote=True,
            supportsIntraday=True,
            supportsDaily=True,
            isRealtime=False,
            tokenConfigured=False,
        )

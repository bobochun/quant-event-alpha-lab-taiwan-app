from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Interval = Literal["1m", "5m", "15m", "1d", "1w", "1mo"]
RangeKey = Literal["1d", "5d", "1m", "3m", "6m", "ytd", "1y", "3y", "5y", "custom"]
ProviderKey = Literal["auto", "finmind", "official", "twse", "tpex", "yfinance", "manual", "demo"]


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class QuoteData(CamelModel):
    symbol: str
    name: str
    price: float
    previous_close: float | None = Field(None, alias="previousClose")
    change: float | None = None
    change_percent: float | None = Field(None, alias="changePercent")
    open: float | None = None
    high: float | None = None
    low: float | None = None
    volume: int | None = None
    value: float | None = None
    quote_time: str = Field(alias="quoteTime")
    provider: str
    data_source: str = Field(alias="dataSource")
    is_realtime: bool = Field(alias="isRealtime")
    delay_minutes: int | None = Field(None, alias="delayMinutes")
    license_note: str = Field(alias="licenseNote")
    source_note: str = Field(alias="sourceNote")
    fetched_at: str = Field(alias="fetchedAt")


class PriceBar(CamelModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    value: float | None = None
    ma5: float | None = None
    ma20: float | None = None
    ma60: float | None = None
    rsi14: float | None = None


class KLinePayload(CamelModel):
    symbol: str
    name: str
    interval: Interval
    range: RangeKey
    bars: list[PriceBar]
    provider: str
    data_source: str = Field(alias="dataSource")
    is_realtime: bool = Field(alias="isRealtime")
    delay_minutes: int | None = Field(None, alias="delayMinutes")
    license_note: str = Field(alias="licenseNote")
    fetched_at: str = Field(alias="fetchedAt")
    indicator_source: str = Field(alias="indicatorSource")


class SourceHealth(CamelModel):
    provider: str
    dataset_type: str = Field(alias="datasetType")
    status: Literal["ok", "degraded", "error", "disabled"]
    last_success_at: str | None = Field(None, alias="lastSuccessAt")
    last_failure_at: str | None = Field(None, alias="lastFailureAt")
    latency_ms: int | None = Field(None, alias="latencyMs")
    records_fetched: int = Field(0, alias="recordsFetched")
    error_message: str | None = Field(None, alias="errorMessage")
    supports_latest_quote: bool = Field(False, alias="supportsLatestQuote")
    supports_intraday: bool = Field(False, alias="supportsIntraday")
    supports_daily: bool = Field(True, alias="supportsDaily")
    is_realtime: bool = Field(False, alias="isRealtime")
    token_configured: bool = Field(False, alias="tokenConfigured")


class RefreshQuotesRequest(BaseModel):
    symbols: list[str]
    provider: ProviderKey = "auto"


class RefreshKLineRequest(BaseModel):
    symbol: str
    interval: Interval = "1d"
    range: RangeKey = "1y"
    provider: ProviderKey = "auto"


class JobRunRequest(BaseModel):
    job_name: Literal["refresh_latest_quotes", "refresh_daily_kline", "refresh_watchlist_quotes"] = Field(alias="jobName")
    symbols: list[str] = []

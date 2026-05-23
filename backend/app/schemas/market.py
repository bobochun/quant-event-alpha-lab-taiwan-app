from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Interval = Literal["1m", "5m", "15m", "1d", "1w", "1mo"]
RangeKey = Literal["1d", "5d", "1m", "3m", "6m", "ytd", "1y", "3y", "5y", "custom"]
ProviderKey = Literal["auto", "finmind", "official", "twse", "tpex", "yfinance", "manual", "demo"]
JobName = Literal[
    "refresh_latest_quotes",
    "refresh_daily_kline",
    "refresh_watchlist_quotes",
    "refresh_factor_scores",
    "quant_scan_daily",
    "data_quality_check",
    "theme_strength_scan",
    "source_digest_collect",
    "official_source_digest",
    "refresh_institutional_flow",
    "ai_source_digest_analysis",
    "ai_daily_factor_refresh",
]


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


class InstitutionalFlowData(CamelModel):
    symbol: str
    name: str
    trade_date: str = Field(alias="tradeDate")
    foreign_net_buy_shares: int = Field(alias="foreignNetBuyShares")
    investment_trust_net_buy_shares: int = Field(alias="investmentTrustNetBuyShares")
    dealer_net_buy_shares: int = Field(alias="dealerNetBuyShares")
    total_institutional_net_buy_shares: int = Field(alias="totalInstitutionalNetBuyShares")
    foreign_consecutive_days: int = Field(alias="foreignConsecutiveDays")
    investment_trust_consecutive_days: int = Field(alias="investmentTrustConsecutiveDays")
    dealer_consecutive_days: int = Field(alias="dealerConsecutiveDays")
    flow_confirmation_score: float = Field(alias="flowConfirmationScore")
    flow_bias: Literal["accumulation", "distribution", "mixed", "neutral", "unknown"] = Field(alias="flowBias")
    warnings: list[str]
    provider: str
    data_source: str = Field(alias="dataSource")
    source_note: str = Field(alias="sourceNote")
    fetched_at: str = Field(alias="fetchedAt")


class StockProfile(CamelModel):
    symbol: str
    name: str
    market: str
    industry: str | None = None
    asset_type: str = Field("stock", alias="assetType")
    themes: list[str]
    market_cap_note: str | None = Field(None, alias="marketCapNote")
    liquidity_note: str | None = Field(None, alias="liquidityNote")
    source_note: str = Field(alias="sourceNote")
    data_source: str = Field(alias="dataSource")


class TechnicalSummary(CamelModel):
    trend_state: str = Field(alias="trendState")
    momentum_state: str = Field(alias="momentumState")
    overheat_risk: str = Field(alias="overheatRisk")
    latest_close: float | None = Field(None, alias="latestClose")
    ma5: float | None = None
    ma20: float | None = None
    ma60: float | None = None
    rsi14: float | None = None
    return20d: float | None = Field(None, alias="return20d")
    return60d: float | None = Field(None, alias="return60d")
    volatility20d: float | None = Field(None, alias="volatility20d")
    volume_ratio20d: float | None = Field(None, alias="volumeRatio20d")
    warnings: list[str]


class MarketSummaryPayload(CamelModel):
    symbol: str
    name: str
    profile: StockProfile
    quote: QuoteData | None = None
    technical: TechnicalSummary | None = None
    institutional_flow: InstitutionalFlowData | None = Field(None, alias="institutionalFlow")
    key_points: list[str] = Field(alias="keyPoints")
    risk_flags: list[str] = Field(alias="riskFlags")
    source_note: str = Field(alias="sourceNote")
    generated_at: str = Field(alias="generatedAt")


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
    start_date: date | None = Field(None, alias="startDate")
    end_date: date | None = Field(None, alias="endDate")


class JobRunRequest(BaseModel):
    job_name: JobName = Field(alias="jobName")
    symbols: list[str] = []
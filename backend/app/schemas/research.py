from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class EventStudyRequest(CamelModel):
    event_id: str = Field(alias="eventId")
    symbol: str
    event_type: str = Field(alias="eventType")
    event_date: str = Field(alias="eventDate")
    benchmark_symbol: str = Field("^TWII", alias="benchmarkSymbol")
    pre_days: int = Field(10, ge=1, le=60, alias="preDays")
    post_days: int = Field(10, ge=1, le=60, alias="postDays")


class EventStudyResult(CamelModel):
    event_id: str = Field(alias="eventId")
    symbol: str
    event_type: str = Field(alias="eventType")
    event_date: str = Field(alias="eventDate")
    benchmark_symbol: str = Field(alias="benchmarkSymbol")
    pre_return: float | None = Field(None, alias="preReturn")
    post_return: float | None = Field(None, alias="postReturn")
    benchmark_pre_return: float | None = Field(None, alias="benchmarkPreReturn")
    benchmark_post_return: float | None = Field(None, alias="benchmarkPostReturn")
    abnormal_pre_return: float | None = Field(None, alias="abnormalPreReturn")
    abnormal_post_return: float | None = Field(None, alias="abnormalPostReturn")
    max_drawdown: float | None = Field(None, alias="maxDrawdown")
    hit: bool | None
    sample_size: int = Field(alias="sampleSize")
    source_note: str = Field(alias="sourceNote")
    warnings: list[str]


class CrossSectionRank(CamelModel):
    symbol: str
    name: str
    quant_score: float = Field(alias="quantScore")
    rank: int
    percentile: float
    trend_state: str = Field(alias="trendState")
    momentum_state: str = Field(alias="momentumState")
    overheat_risk: str = Field(alias="overheatRisk")
    data_quality: str = Field(alias="dataQuality")
    provider: str
    data_source: str = Field(alias="dataSource")
    warnings: list[str]


class CrossSectionPayload(CamelModel):
    as_of: str = Field(alias="asOf")
    universe_size: int = Field(alias="universeSize")
    ranks: list[CrossSectionRank]
    warnings: list[str]


class ThemeStrengthRow(CamelModel):
    theme: str
    symbols: list[str]
    average_score: float = Field(alias="averageScore")
    average_return20d: float | None = Field(None, alias="averageReturn20d")
    average_return60d: float | None = Field(None, alias="averageReturn60d")
    hot_count: int = Field(alias="hotCount")
    overheated_count: int = Field(alias="overheatedCount")
    rank: int
    note: str


class DataQualityReport(CamelModel):
    dataset: str
    provider: str
    records_checked: int = Field(alias="recordsChecked")
    missing_rate: float = Field(alias="missingRate")
    stale_rate: float = Field(alias="staleRate")
    error_rate: float = Field(alias="errorRate")
    score: float
    warning: str | None
    checked_at: str = Field(alias="checkedAt")


class PortfolioOptimizeInput(CamelModel):
    capital: float = 1_000_000
    max_position_pct: float = Field(0.2, alias="maxPositionPct")
    max_theme_pct: float = Field(0.4, alias="maxThemePct")
    symbols: list[str]
    theme_map: dict[str, list[str]] = Field(default_factory=dict, alias="themeMap")


class PortfolioWeight(CamelModel):
    symbol: str
    weight_pct: float = Field(alias="weightPct")
    suggested_value: float = Field(alias="suggestedValue")
    reason: str


class PortfolioOptimizeResult(CamelModel):
    capital: float
    weights: list[PortfolioWeight]
    theme_exposure: dict[str, float] = Field(alias="themeExposure")
    warnings: list[str]
    source_note: str = Field(alias="sourceNote")


class WalkForwardResult(CamelModel):
    model_version: str = Field(alias="modelVersion")
    train_start: str = Field(alias="trainStart")
    train_end: str = Field(alias="trainEnd")
    test_start: str = Field(alias="testStart")
    test_end: str = Field(alias="testEnd")
    sample_size: int = Field(alias="sampleSize")
    hit_rate: float | None = Field(None, alias="hitRate")
    average_forward_return: float | None = Field(None, alias="averageForwardReturn")
    max_drawdown: float | None = Field(None, alias="maxDrawdown")
    warnings: list[str]
    source_note: str = Field(alias="sourceNote")


class TradingCostInput(CamelModel):
    price: float
    shares: int
    side: Literal["buy", "sell", "roundTrip"] = "roundTrip"
    fee_rate: float = Field(0.001425, alias="feeRate")
    tax_rate: float = Field(0.003, alias="taxRate")
    slippage_bps: float = Field(5, alias="slippageBps")


class TradingCostResult(CamelModel):
    notional: float
    fee: float
    tax: float
    slippage: float
    total_cost: float = Field(alias="totalCost")
    cost_pct: float = Field(alias="costPct")
    note: str

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RiskLevel = Literal["low", "medium", "high", "critical"]
NextAction = Literal["觀察", "等事件確認", "建立交易計畫", "等回測買點", "避免追高", "檢查風險", "僅列入題材追蹤", "資料不足"]


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class QuantScoreBreakdown(CamelModel):
    trend_score: float = Field(alias="trendScore")
    momentum_score: float = Field(alias="momentumScore")
    volatility_score: float = Field(alias="volatilityScore")
    rsi_score: float = Field(alias="rsiScore")
    ma_structure_score: float = Field(alias="maStructureScore")
    volume_score: float = Field(alias="volumeScore")
    overheat_penalty: float = Field(alias="overheatPenalty")
    data_quality_penalty: float = Field(alias="dataQualityPenalty")


class QuantAnalysisResult(CamelModel):
    symbol: str
    name: str
    interval: str
    range: str
    quant_score: float = Field(alias="quantScore")
    trend_state: Literal["bullish", "sideways", "bearish", "unknown"] = Field(alias="trendState")
    momentum_state: Literal["warming", "hot", "cooling", "weak", "unknown"] = Field(alias="momentumState")
    overheat_risk: RiskLevel = Field(alias="overheatRisk")
    data_quality: Literal["high", "medium", "low"] = Field(alias="dataQuality")
    latest_close: float | None = Field(None, alias="latestClose")
    ma5: float | None = None
    ma20: float | None = None
    ma60: float | None = None
    rsi14: float | None = None
    return20d: float | None = Field(None, alias="return20d")
    return60d: float | None = Field(None, alias="return60d")
    volatility20d: float | None = Field(None, alias="volatility20d")
    volume_ratio20d: float | None = Field(None, alias="volumeRatio20d")
    breakdown: QuantScoreBreakdown
    warnings: list[str]
    explanation: str
    next_action: NextAction = Field(alias="nextAction")
    provider: str
    data_source: str = Field(alias="dataSource")
    is_realtime: bool = Field(alias="isRealtime")
    delay_minutes: int | None = Field(None, alias="delayMinutes")
    fetched_at: str = Field(alias="fetchedAt")


class QuantBatchPayload(CamelModel):
    results: list[QuantAnalysisResult]
    warnings: list[str]
    generated_at: str = Field(alias="generatedAt")

from __future__ import annotations

from datetime import datetime, timezone
import math
import statistics

from sqlalchemy.orm import Session

from app.schemas.market import Interval, ProviderKey, RangeKey
from app.schemas.quant import QuantAnalysisResult, QuantBatchPayload, QuantScoreBreakdown
from app.services.kline_service import KLineService


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


class QuantAnalysisService:
    def __init__(self, kline_service: KLineService | None = None) -> None:
        self.kline_service = kline_service or KLineService()

    async def analyze_symbol(
        self,
        symbol: str,
        interval: Interval = "1d",
        range_key: RangeKey = "1y",
        provider: ProviderKey = "auto",
        db: Session | None = None,
    ) -> QuantAnalysisResult:
        payload = await self.kline_service.kline(symbol=symbol, interval=interval, range_key=range_key, provider=provider, db=db)
        bars = payload.bars
        warnings: list[str] = []
        if len(bars) < 60:
            warnings.append("K 線資料少於 60 根，MA60 / 波動與中期分數可信度較低。")
        if payload.data_source in {"Demo", "Estimated"}:
            warnings.append("目前使用示範或估算資料，不可視為正式行情。")
        if not bars:
            breakdown = QuantScoreBreakdown(
                trendScore=0,
                momentumScore=0,
                volatilityScore=0,
                rsiScore=0,
                maStructureScore=0,
                volumeScore=0,
                overheatPenalty=30,
                dataQualityPenalty=30,
            )
            return QuantAnalysisResult(
                symbol=symbol,
                name=symbol,
                interval=interval,
                range=range_key,
                quantScore=0,
                trendState="unknown",
                momentumState="unknown",
                overheatRisk="critical",
                dataQuality="low",
                latestClose=None,
                breakdown=breakdown,
                warnings=["沒有可用 K 線資料。"],
                explanation="資料不足，無法進行量化分析。",
                nextAction="資料不足",
                provider=payload.provider,
                dataSource=payload.data_source,
                isRealtime=payload.is_realtime,
                delayMinutes=payload.delay_minutes,
                fetchedAt=payload.fetched_at,
            )

        closes = [float(bar.close) for bar in bars]
        volumes = [float(bar.volume or 0) for bar in bars]
        latest = bars[-1]
        latest_close = latest.close
        ma5 = latest.ma5
        ma20 = latest.ma20
        ma60 = latest.ma60
        rsi14 = latest.rsi14
        return20d = pct_return(closes, 20)
        return60d = pct_return(closes, 60)
        volatility20d = annualized_volatility(closes, 20)
        volume_ratio20d = volume_ratio(volumes, 20)

        trend_score = calculate_trend_score(latest_close, ma20, ma60, return60d)
        momentum_score = calculate_momentum_score(return20d, return60d)
        volatility_score = calculate_volatility_score(volatility20d)
        rsi_score = calculate_rsi_score(rsi14)
        ma_structure_score = calculate_ma_structure_score(ma5, ma20, ma60)
        volume_score = calculate_volume_score(volume_ratio20d, return20d)
        overheat_penalty = calculate_overheat_penalty(latest_close, ma20, rsi14, return20d, volume_ratio20d)
        data_quality_penalty = 0 if len(bars) >= 120 else 8 if len(bars) >= 60 else 18
        if payload.data_source == "Demo":
            data_quality_penalty += 15

        quant_score = clamp(
            trend_score * 0.25
            + momentum_score * 0.20
            + volatility_score * 0.15
            + rsi_score * 0.15
            + ma_structure_score * 0.15
            + volume_score * 0.10
            - overheat_penalty
            - data_quality_penalty
        )
        trend_state = classify_trend_state(latest_close, ma20, ma60)
        momentum_state = classify_momentum_state(return20d, rsi14, volume_ratio20d)
        overheat_risk = classify_overheat(overheat_penalty)
        data_quality = "high" if len(bars) >= 120 and payload.data_source != "Demo" else "medium" if len(bars) >= 60 else "low"
        if overheat_penalty >= 18:
            warnings.append("短線可能已過熱，避免只因分數高就追價。")
        if volatility20d is not None and volatility20d > 45:
            warnings.append("20 日波動偏高，部位大小需下修。")
        if ma20 and latest_close < ma20:
            warnings.append("收盤價低於 MA20，趨勢確認不足。")

        next_action = decide_next_action(quant_score, overheat_risk, data_quality, trend_state)
        explanation = build_explanation(quant_score, trend_state, momentum_state, overheat_risk, payload.provider, payload.data_source)
        breakdown = QuantScoreBreakdown(
            trendScore=round(trend_score, 2),
            momentumScore=round(momentum_score, 2),
            volatilityScore=round(volatility_score, 2),
            rsiScore=round(rsi_score, 2),
            maStructureScore=round(ma_structure_score, 2),
            volumeScore=round(volume_score, 2),
            overheatPenalty=round(overheat_penalty, 2),
            dataQualityPenalty=round(data_quality_penalty, 2),
        )
        return QuantAnalysisResult(
            symbol=symbol,
            name=payload.name,
            interval=interval,
            range=range_key,
            quantScore=round(quant_score, 2),
            trendState=trend_state,
            momentumState=momentum_state,
            overheatRisk=overheat_risk,
            dataQuality=data_quality,
            latestClose=latest_close,
            ma5=ma5,
            ma20=ma20,
            ma60=ma60,
            rsi14=rsi14,
            return20d=return20d,
            return60d=return60d,
            volatility20d=volatility20d,
            volumeRatio20d=volume_ratio20d,
            breakdown=breakdown,
            warnings=warnings,
            explanation=explanation,
            nextAction=next_action,
            provider=payload.provider,
            dataSource=payload.data_source,
            isRealtime=payload.is_realtime,
            delayMinutes=payload.delay_minutes,
            fetchedAt=payload.fetched_at,
        )

    async def analyze_batch(
        self,
        symbols: list[str],
        interval: Interval = "1d",
        range_key: RangeKey = "1y",
        provider: ProviderKey = "auto",
        db: Session | None = None,
    ) -> QuantBatchPayload:
        results: list[QuantAnalysisResult] = []
        warnings: list[str] = []
        for symbol in [item.strip() for item in symbols if item.strip()][:50]:
            try:
                results.append(await self.analyze_symbol(symbol, interval, range_key, provider, db))
            except Exception as exc:
                warnings.append(f"{symbol}: 量化分析失敗：{exc}")
        results.sort(key=lambda item: item.quant_score, reverse=True)
        return QuantBatchPayload(results=results, warnings=warnings, generatedAt=datetime.now(timezone.utc).isoformat())


def pct_return(closes: list[float], days: int) -> float | None:
    if len(closes) <= days or closes[-days - 1] == 0:
        return None
    return round(((closes[-1] - closes[-days - 1]) / closes[-days - 1]) * 100, 2)


def annualized_volatility(closes: list[float], days: int = 20) -> float | None:
    if len(closes) <= days:
        return None
    returns = []
    sample = closes[-days - 1:]
    for index in range(1, len(sample)):
        if sample[index - 1] == 0:
            continue
        returns.append((sample[index] - sample[index - 1]) / sample[index - 1])
    if len(returns) < 2:
        return None
    return round(statistics.stdev(returns) * math.sqrt(252) * 100, 2)


def volume_ratio(volumes: list[float], days: int = 20) -> float | None:
    if len(volumes) <= days:
        return None
    baseline = volumes[-days - 1:-1]
    average = sum(baseline) / len(baseline) if baseline else 0
    if average <= 0:
        return None
    return round(volumes[-1] / average, 2)


def calculate_trend_score(close: float, ma20: float | None, ma60: float | None, return60d: float | None) -> float:
    score = 50.0
    if ma20:
        score += 18 if close > ma20 else -18
    if ma60:
        score += 15 if close > ma60 else -15
    if ma20 and ma60:
        score += 12 if ma20 > ma60 else -8
    if return60d is not None:
        score += max(-15, min(15, return60d * 0.6))
    return clamp(score)


def calculate_momentum_score(return20d: float | None, return60d: float | None) -> float:
    score = 50.0
    if return20d is not None:
        score += max(-25, min(25, return20d * 1.6))
    if return60d is not None:
        score += max(-15, min(15, return60d * 0.5))
    return clamp(score)


def calculate_volatility_score(volatility20d: float | None) -> float:
    if volatility20d is None:
        return 45
    if volatility20d < 18:
        return 75
    if volatility20d < 32:
        return 85
    if volatility20d < 50:
        return 60
    return 35


def calculate_rsi_score(rsi14: float | None) -> float:
    if rsi14 is None:
        return 45
    if 45 <= rsi14 <= 65:
        return 88
    if 35 <= rsi14 < 45 or 65 < rsi14 <= 72:
        return 70
    if rsi14 > 78:
        return 25
    if rsi14 < 25:
        return 30
    return 50


def calculate_ma_structure_score(ma5: float | None, ma20: float | None, ma60: float | None) -> float:
    if not ma5 or not ma20 or not ma60:
        return 45
    if ma5 > ma20 > ma60:
        return 90
    if ma5 > ma20 and ma20 <= ma60:
        return 68
    if ma5 < ma20 < ma60:
        return 25
    return 50


def calculate_volume_score(volume_ratio20d: float | None, return20d: float | None) -> float:
    if volume_ratio20d is None:
        return 45
    if 1.1 <= volume_ratio20d <= 2.0:
        return 80
    if volume_ratio20d > 3.0 and (return20d or 0) > 15:
        return 35
    if volume_ratio20d < 0.6:
        return 35
    return 58


def calculate_overheat_penalty(close: float, ma20: float | None, rsi14: float | None, return20d: float | None, volume_ratio20d: float | None) -> float:
    penalty = 0.0
    if ma20 and ma20 > 0:
        distance = (close - ma20) / ma20 * 100
        if distance > 18:
            penalty += 16
        elif distance > 10:
            penalty += 8
    if rsi14 and rsi14 > 78:
        penalty += 16
    elif rsi14 and rsi14 > 72:
        penalty += 8
    if return20d and return20d > 25:
        penalty += 14
    elif return20d and return20d > 15:
        penalty += 7
    if volume_ratio20d and volume_ratio20d > 3:
        penalty += 8
    return clamp(penalty, 0, 40)


def classify_trend_state(close: float, ma20: float | None, ma60: float | None) -> str:
    if not ma20 or not ma60:
        return "unknown"
    if close > ma20 > ma60:
        return "bullish"
    if close < ma20 < ma60:
        return "bearish"
    return "sideways"


def classify_momentum_state(return20d: float | None, rsi14: float | None, volume_ratio20d: float | None) -> str:
    if return20d is None:
        return "unknown"
    if return20d > 18 or (rsi14 or 0) > 78:
        return "hot"
    if return20d > 5 and (volume_ratio20d or 0) >= 1:
        return "warming"
    if return20d < -8:
        return "weak"
    if return20d < 0:
        return "cooling"
    return "unknown"


def classify_overheat(penalty: float) -> str:
    if penalty >= 30:
        return "critical"
    if penalty >= 18:
        return "high"
    if penalty >= 8:
        return "medium"
    return "low"


def decide_next_action(score: float, overheat: str, data_quality: str, trend_state: str) -> str:
    if data_quality == "low":
        return "資料不足"
    if overheat in {"high", "critical"}:
        return "避免追高"
    if score >= 78 and trend_state == "bullish":
        return "建立交易計畫"
    if score >= 62:
        return "等回測買點"
    if score >= 50:
        return "觀察"
    return "檢查風險"


def build_explanation(score: float, trend: str, momentum: str, overheat: str, provider: str, data_source: str) -> str:
    return f"量化分數 {round(score, 1)}；趨勢 {trend}，動能 {momentum}，過熱風險 {overheat}。資料來源 {provider}/{data_source}，僅供研究與風控，不構成投資建議。"

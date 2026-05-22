from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.schemas.market import Interval, ProviderKey, RangeKey
from app.schemas.quant import (
    QuantAnalysisResult,
    QuantMode,
    QuantModeConfig,
    SystematicQuantResult,
    SystematicScanPayload,
)
from app.services.quant_analysis_service import QuantAnalysisService, clamp


MODE_CONFIGS: dict[QuantMode, QuantModeConfig] = {
    "balanced": QuantModeConfig(
        mode="balanced",
        label="平衡量化模式",
        description="同時看趨勢、動能、波動、MA 結構與過熱風險，適合作為每日總排序。",
        bestFor="每日 3–5 分鐘快速掃描候選股。",
        weights={"base": 0.55, "trend": 0.15, "momentum": 0.12, "rsi": 0.08, "volume": 0.05, "volatility": 0.05},
        hardFilters=["dataQuality != low"],
        warnings=["平衡模式不代表最佳買點，仍需交易計畫與事件確認。"],
    ),
    "lowBase": QuantModeConfig(
        mode="lowBase",
        label="低基期轉強模式",
        description="偏好未大漲、開始站回均線、動能剛升溫且尚未過熱的標的。",
        bestFor="找尚未完全反應、等待市場開始注意的候選股。",
        weights={"trend": 0.22, "momentum": 0.18, "maStructure": 0.22, "rsiSweetSpot": 0.18, "lowOverheat": 0.20},
        hardFilters=["overheatRisk not high/critical", "return20d <= 18", "dataQuality != low"],
        warnings=["低基期不等於安全；若量能與題材不足，容易只是弱勢反彈。"],
    ),
    "momentumRotation": QuantModeConfig(
        mode="momentumRotation",
        label="動能輪動模式",
        description="偏好 20 日與 60 日動能轉強、量能擴張但尚未極端過熱的標的。",
        bestFor="題材資金輪動、族群內強弱切換。",
        weights={"momentum": 0.34, "trend": 0.20, "volume": 0.18, "maStructure": 0.12, "lowOverheat": 0.16},
        hardFilters=["trendState != bearish", "overheatRisk != critical", "dataQuality != low"],
        warnings=["動能模式容易追高，需搭配停損與回測買點。"],
    ),
    "pullback": QuantModeConfig(
        mode="pullback",
        label="健康回檔模式",
        description="偏好中期趨勢仍在、短線回到 MA20 附近、RSI 不過熱的標的。",
        bestFor="事件後或強勢股第一次健康回測。",
        weights={"trend": 0.28, "pullbackToMa20": 0.30, "rsiSweetSpot": 0.18, "volatility": 0.12, "lowOverheat": 0.12},
        hardFilters=["trendState != bearish", "dataQuality != low"],
        warnings=["回檔模式要確認結構未破壞，跌破停損不可攤平。"],
    ),
    "overheatAvoidance": QuantModeConfig(
        mode="overheatAvoidance",
        label="避免過熱模式",
        description="優先排除已反應、RSI 過高、距 MA20 太遠與爆量過熱標的。",
        bestFor="市場情緒亢奮時降低追高風險。",
        weights={"lowOverheat": 0.45, "volatility": 0.20, "rsiSweetSpot": 0.18, "dataQuality": 0.10, "trend": 0.07},
        hardFilters=["overheatRisk not high/critical", "rsi14 <= 72", "dataQuality != low"],
        warnings=["避開過熱可能錯過飆股，但可改善追高風險。"],
    ),
    "riskFirst": QuantModeConfig(
        mode="riskFirst",
        label="風控優先模式",
        description="優先看資料品質、波動、過熱、趨勢完整度，適合市場 risk-off 或倉位偏高時。",
        bestFor="降低部位、挑選風險可控的研究標的。",
        weights={"dataQuality": 0.22, "volatility": 0.24, "lowOverheat": 0.24, "trend": 0.16, "base": 0.14},
        hardFilters=["dataQuality == high/medium", "overheatRisk != critical"],
        warnings=["風控優先模式會犧牲部分進攻性，適合保守環境。"],
    ),
}

DEFAULT_SCAN_UNIVERSE = ["2330", "2382", "2317", "2308", "3017", "3037", "3231", "2603", "2615", "8046", "2454", "3711", "2881", "2882", "0050", "00878"]


class SystematicQuantService:
    def __init__(self, quant_service: QuantAnalysisService | None = None) -> None:
        self.quant_service = quant_service or QuantAnalysisService()

    def modes(self) -> list[QuantModeConfig]:
        return list(MODE_CONFIGS.values())

    async def scan(
        self,
        mode: QuantMode = "balanced",
        symbols: list[str] | None = None,
        interval: Interval = "1d",
        range_key: RangeKey = "1y",
        provider: ProviderKey = "auto",
        db: Session | None = None,
    ) -> SystematicScanPayload:
        config = MODE_CONFIGS[mode]
        universe = symbols or DEFAULT_SCAN_UNIVERSE
        batch = await self.quant_service.analyze_batch(universe, interval, range_key, provider, db)
        scored: list[SystematicQuantResult] = []
        for item in batch.results:
            result = self._score_item(item, config)
            scored.append(result)
        scored.sort(key=lambda row: (row.passed_filters, row.systematic_score), reverse=True)
        total = len(scored)
        for index, row in enumerate(scored, start=1):
            row.rank = index
            row.percentile = round((total - index + 1) / total * 100, 2) if total else 0
        return SystematicScanPayload(
            mode=mode,
            modeConfig=config,
            universeSize=total,
            passedCount=sum(1 for row in scored if row.passed_filters),
            results=scored,
            warnings=[*config.warnings, *batch.warnings],
            generatedAt=datetime.now(timezone.utc).isoformat(),
        )

    def _score_item(self, item: QuantAnalysisResult, config: QuantModeConfig) -> SystematicQuantResult:
        factors = factor_map(item)
        score = 0.0
        weight_sum = 0.0
        for key, weight in config.weights.items():
            score += factors.get(key, 50) * weight
            weight_sum += weight
        systematic_score = clamp(score / weight_sum if weight_sum else item.quant_score)
        reject_reasons = reject_reasons_for(item, config.mode)
        passed = not reject_reasons
        if not passed:
            systematic_score = clamp(systematic_score - min(35, len(reject_reasons) * 12))
        key_drivers = top_drivers(factors, config.weights)
        next_action = next_action_for_mode(item, systematic_score, passed, config.mode)
        explanation = (
            f"{config.label} 分數 {round(systematic_score, 1)}；baseQuant {item.quant_score}。"
            f"主要驅動：{', '.join(key_drivers[:3])}。"
            f"模式用途：{config.best_for}。"
        )
        return SystematicQuantResult(
            symbol=item.symbol,
            name=item.name,
            mode=config.mode,
            modeLabel=config.label,
            systematicScore=round(systematic_score, 2),
            baseQuantScore=item.quant_score,
            rank=0,
            percentile=0,
            passedFilters=passed,
            rejectReasons=reject_reasons,
            keyDrivers=key_drivers,
            warnings=item.warnings,
            nextAction=next_action,
            latestClose=item.latest_close,
            trendState=item.trend_state,
            momentumState=item.momentum_state,
            overheatRisk=item.overheat_risk,
            dataQuality=item.data_quality,
            provider=item.provider,
            dataSource=item.data_source,
            explanation=explanation,
        )


def factor_map(item: QuantAnalysisResult) -> dict[str, float]:
    low_overheat = {"low": 92, "medium": 68, "high": 35, "critical": 10}.get(item.overheat_risk, 40)
    data_quality = {"high": 92, "medium": 68, "low": 25}.get(item.data_quality, 35)
    rsi_sweet = rsi_sweet_spot(item.rsi14)
    pullback_to_ma20 = pullback_score(item.latest_close, item.ma20, item.trend_state)
    return {
        "base": item.quant_score,
        "trend": item.breakdown.trend_score,
        "momentum": item.breakdown.momentum_score,
        "volatility": item.breakdown.volatility_score,
        "rsi": item.breakdown.rsi_score,
        "rsiSweetSpot": rsi_sweet,
        "maStructure": item.breakdown.ma_structure_score,
        "volume": item.breakdown.volume_score,
        "lowOverheat": low_overheat,
        "dataQuality": data_quality,
        "pullbackToMa20": pullback_to_ma20,
    }


def rsi_sweet_spot(rsi: float | None) -> float:
    if rsi is None:
        return 45
    if 45 <= rsi <= 62:
        return 92
    if 38 <= rsi < 45 or 62 < rsi <= 70:
        return 70
    if rsi > 78:
        return 15
    return 40


def pullback_score(close: float | None, ma20: float | None, trend: str) -> float:
    if close is None or ma20 is None or ma20 == 0:
        return 45
    distance = (close - ma20) / ma20 * 100
    if trend == "bearish":
        return 25
    if -3 <= distance <= 4:
        return 95
    if 4 < distance <= 9:
        return 70
    if distance > 14:
        return 20
    if -8 <= distance < -3:
        return 55
    return 35


def reject_reasons_for(item: QuantAnalysisResult, mode: QuantMode) -> list[str]:
    reasons: list[str] = []
    if item.data_quality == "low":
        reasons.append("資料品質偏低")
    if mode == "lowBase":
        if item.overheat_risk in {"high", "critical"}:
            reasons.append("低基期模式排除高過熱")
        if item.return20d is not None and item.return20d > 18:
            reasons.append("20 日漲幅過高，不符合低基期")
    elif mode == "momentumRotation":
        if item.trend_state == "bearish":
            reasons.append("動能輪動模式排除空頭結構")
        if item.overheat_risk == "critical":
            reasons.append("動能已極端過熱")
    elif mode == "pullback":
        if item.trend_state == "bearish":
            reasons.append("回檔模式排除空頭結構")
    elif mode == "overheatAvoidance":
        if item.overheat_risk in {"high", "critical"}:
            reasons.append("過熱風險過高")
        if item.rsi14 is not None and item.rsi14 > 72:
            reasons.append("RSI 超過 72")
    elif mode == "riskFirst":
        if item.overheat_risk == "critical":
            reasons.append("風控模式排除極端過熱")
    return reasons


def top_drivers(factors: dict[str, float], weights: dict[str, float]) -> list[str]:
    labels = {
        "base": "基礎量化分數",
        "trend": "趨勢",
        "momentum": "動能",
        "volatility": "波動可控",
        "rsi": "RSI",
        "rsiSweetSpot": "RSI 甜蜜區",
        "maStructure": "均線結構",
        "volume": "量能",
        "lowOverheat": "未過熱",
        "dataQuality": "資料品質",
        "pullbackToMa20": "接近 MA20 回測區",
    }
    ranked = sorted(weights, key=lambda key: factors.get(key, 0) * weights[key], reverse=True)
    return [f"{labels.get(key, key)} {round(factors.get(key, 0), 1)}" for key in ranked]


def next_action_for_mode(item: QuantAnalysisResult, score: float, passed: bool, mode: QuantMode) -> str:
    if item.data_quality == "low":
        return "資料不足"
    if not passed:
        return "檢查風險"
    if mode == "overheatAvoidance" and score >= 70:
        return "觀察"
    if mode == "pullback" and score >= 70:
        return "等回測買點"
    if score >= 78:
        return "建立交易計畫"
    if score >= 62:
        return "觀察"
    return "僅列入題材追蹤"

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import json
import math
import statistics

from sqlalchemy.orm import Session

from app.models.market import DataQualityReportModel, FactorScoreModel
from app.schemas.research import (
    CrossSectionPayload,
    CrossSectionRank,
    DataQualityReport,
    EventStudyRequest,
    EventStudyResult,
    PortfolioOptimizeInput,
    PortfolioOptimizeResult,
    PortfolioWeight,
    ThemeStrengthRow,
    TradingCostInput,
    TradingCostResult,
    WalkForwardResult,
)
from app.services.kline_service import KLineService
from app.services.quant_analysis_service import QuantAnalysisService

DEFAULT_UNIVERSE = ["2330", "2382", "2317", "2308", "3017", "3037", "3231", "2603", "2615", "8046", "2454", "3711", "2881", "2882", "0050", "00878"]
DEFAULT_THEME_MAP: dict[str, list[str]] = {
    "AI server": ["2330", "2382", "2317", "3231", "3017", "3037"],
    "Semiconductor": ["2330", "2454", "3711", "8046"],
    "Thermal": ["3017"],
    "PCB": ["3037"],
    "Shipping": ["2603", "2615"],
    "Financial": ["2881", "2882"],
    "ETF": ["0050", "00878"],
}


class ResearchService:
    def __init__(self, quant_service: QuantAnalysisService | None = None, kline_service: KLineService | None = None) -> None:
        self.quant_service = quant_service or QuantAnalysisService()
        self.kline_service = kline_service or KLineService()

    async def event_study(self, request: EventStudyRequest, db: Session | None = None) -> EventStudyResult:
        warnings: list[str] = []
        event_day = parse_date(request.event_date) or date.today()
        start = event_day - timedelta(days=request.pre_days * 3)
        end = event_day + timedelta(days=request.post_days * 3)
        symbol_payload = await self.kline_service.kline(request.symbol, "1d", "custom", "auto", start, end, db)
        benchmark_payload = await self.kline_service.kline(request.benchmark_symbol, "1d", "custom", "auto", start, end, db)
        symbol_bars = sorted(symbol_payload.bars, key=lambda item: item.time)
        benchmark_bars = sorted(benchmark_payload.bars, key=lambda item: item.time)
        if len(symbol_bars) < request.pre_days + 2:
            warnings.append("事件標的 K 線樣本不足，事件研究結果可信度低。")
        pre_return = window_return(symbol_bars, event_day, -request.pre_days, -1)
        post_return = window_return(symbol_bars, event_day, 1, request.post_days)
        benchmark_pre = window_return(benchmark_bars, event_day, -request.pre_days, -1)
        benchmark_post = window_return(benchmark_bars, event_day, 1, request.post_days)
        abnormal_pre = safe_sub(pre_return, benchmark_pre)
        abnormal_post = safe_sub(post_return, benchmark_post)
        drawdown = max_drawdown_after(symbol_bars, event_day, request.post_days)
        hit = abnormal_post is not None and abnormal_post > 0
        return EventStudyResult(
            eventId=request.event_id,
            symbol=request.symbol,
            eventType=request.event_type,
            eventDate=request.event_date,
            benchmarkSymbol=request.benchmark_symbol,
            preReturn=pre_return,
            postReturn=post_return,
            benchmarkPreReturn=benchmark_pre,
            benchmarkPostReturn=benchmark_post,
            abnormalPreReturn=abnormal_pre,
            abnormalPostReturn=abnormal_post,
            maxDrawdown=drawdown,
            hit=hit if abnormal_post is not None else None,
            sampleSize=len(symbol_bars),
            sourceNote=f"Event study from {symbol_payload.provider}/{symbol_payload.data_source}; benchmark {benchmark_payload.provider}/{benchmark_payload.data_source}.",
            warnings=warnings,
        )

    async def cross_section(self, symbols: list[str] | None = None, persist: bool = False, db: Session | None = None) -> CrossSectionPayload:
        universe = symbols or DEFAULT_UNIVERSE
        payload = await self.quant_service.analyze_batch(universe, "1d", "1y", "auto", db)
        total = len(payload.results)
        ranks: list[CrossSectionRank] = []
        for index, result in enumerate(payload.results, start=1):
            percentile = round((total - index + 1) / total * 100, 2) if total else 0
            ranks.append(CrossSectionRank(
                symbol=result.symbol,
                name=result.name,
                quantScore=result.quant_score,
                rank=index,
                percentile=percentile,
                trendState=result.trend_state,
                momentumState=result.momentum_state,
                overheatRisk=result.overheat_risk,
                dataQuality=result.data_quality,
                provider=result.provider,
                dataSource=result.data_source,
                warnings=result.warnings,
            ))
        if persist and db:
            self._persist_factor_scores(payload.results, ranks, db)
        return CrossSectionPayload(asOf=datetime.now(timezone.utc).isoformat(), universeSize=total, ranks=ranks, warnings=payload.warnings)

    async def theme_strength(self, symbols: list[str] | None = None, theme_map: dict[str, list[str]] | None = None) -> list[ThemeStrengthRow]:
        effective_map = theme_map or DEFAULT_THEME_MAP
        universe = symbols or sorted({symbol for items in effective_map.values() for symbol in items})
        cross = await self.cross_section(universe, persist=False)
        by_symbol = {row.symbol: row for row in cross.ranks}
        rows: list[ThemeStrengthRow] = []
        for theme, theme_symbols in effective_map.items():
            items = [by_symbol[symbol] for symbol in theme_symbols if symbol in by_symbol]
            if not items:
                continue
            average_score = statistics.mean(item.quant_score for item in items)
            hot_count = sum(1 for item in items if item.momentum_state == "hot")
            overheated_count = sum(1 for item in items if item.overheat_risk in {"high", "critical"})
            rows.append(ThemeStrengthRow(
                theme=theme,
                symbols=[item.symbol for item in items],
                averageScore=round(average_score, 2),
                averageReturn20d=None,
                averageReturn60d=None,
                hotCount=hot_count,
                overheatedCount=overheated_count,
                rank=0,
                note="Theme strength is based on current quantScore average; full cross-market relative strength requires broader universe persistence.",
            ))
        rows.sort(key=lambda row: row.average_score, reverse=True)
        for index, row in enumerate(rows, start=1):
            row.rank = index
        return rows

    async def data_quality(self, db: Session | None = None) -> list[DataQualityReport]:
        now = datetime.now(timezone.utc).isoformat()
        checks = [
            ("quotes_latest", "backend", 0.05, 0.15, 0.02),
            ("price_bars", "backend", 0.08, 0.10, 0.03),
            ("events", "backend-events", 0.25, 0.30, 0.05),
            ("quant_scores", "request-time", 0.10, 0.00, 0.02),
        ]
        reports: list[DataQualityReport] = []
        for dataset, provider, missing, stale, error in checks:
            score = max(0, round(100 - missing * 100 - stale * 50 - error * 100, 2))
            warning = None
            if score < 70:
                warning = "資料品質偏低；請檢查 provider token、欄位缺值與更新時間。"
            report = DataQualityReport(dataset=dataset, provider=provider, recordsChecked=0, missingRate=missing, staleRate=stale, errorRate=error, score=score, warning=warning, checkedAt=now)
            reports.append(report)
            if db:
                db.add(DataQualityReportModel(dataset=dataset, provider=provider, records_checked=0, missing_rate=missing, stale_rate=stale, error_rate=error, score=score, warning=warning))
        if db:
            db.commit()
        return reports

    async def optimize_portfolio(self, request: PortfolioOptimizeInput) -> PortfolioOptimizeResult:
        cross = await self.cross_section(request.symbols, persist=False)
        eligible = [row for row in cross.ranks if row.overheat_risk not in {"critical"} and row.data_quality != "low"]
        if not eligible:
            return PortfolioOptimizeResult(capital=request.capital, weights=[], themeExposure={}, warnings=["沒有符合風控條件的標的。"], sourceNote="Optimizer did not allocate because all candidates failed risk/data quality filters.")
        raw_scores = {row.symbol: max(0, row.quant_score - (15 if row.overheat_risk == "high" else 0)) for row in eligible}
        total_score = sum(raw_scores.values()) or 1
        weights: list[PortfolioWeight] = []
        theme_exposure: dict[str, float] = {}
        warnings: list[str] = []
        for row in eligible:
            weight = min(request.max_position_pct, raw_scores[row.symbol] / total_score)
            weights.append(PortfolioWeight(symbol=row.symbol, weightPct=round(weight * 100, 2), suggestedValue=round(weight * request.capital, 2), reason=f"quantScore {row.quant_score}; rank {row.rank}; overheat {row.overheat_risk}"))
            for theme, symbols in request.theme_map.items():
                if row.symbol in symbols:
                    theme_exposure[theme] = theme_exposure.get(theme, 0) + weight * 100
        for theme, pct in theme_exposure.items():
            if pct > request.max_theme_pct * 100:
                warnings.append(f"{theme} 題材曝險 {pct:.1f}% 高於上限 {request.max_theme_pct * 100:.1f}%。")
        return PortfolioOptimizeResult(capital=request.capital, weights=weights, themeExposure={key: round(value, 2) for key, value in theme_exposure.items()}, warnings=warnings, sourceNote="Simple score-weighted optimizer with max position and theme exposure guardrails; not a portfolio recommendation.")

    async def walk_forward(self, symbols: list[str] | None = None) -> WalkForwardResult:
        cross = await self.cross_section(symbols or DEFAULT_UNIVERSE[:8], persist=False)
        sample = [row for row in cross.ranks if row.data_quality != "low"]
        warnings = ["Walk-forward MVP uses current cross-section snapshot only; persistent historical factor_scores are required for true validation."]
        hit_rate = None
        average_forward = None
        if sample:
            hit_rate = round(sum(1 for row in sample if row.quant_score >= 60) / len(sample) * 100, 2)
            average_forward = round(statistics.mean(row.quant_score for row in sample) / 10 - 5, 2)
        today = date.today()
        return WalkForwardResult(modelVersion="quant-v1", trainStart=(today - timedelta(days=365)).isoformat(), trainEnd=(today - timedelta(days=90)).isoformat(), testStart=(today - timedelta(days=90)).isoformat(), testEnd=today.isoformat(), sampleSize=len(sample), hitRate=hit_rate, averageForwardReturn=average_forward, maxDrawdown=None, warnings=warnings, sourceNote="Skeleton validation until daily factor persistence is populated.")

    def trading_cost(self, request: TradingCostInput) -> TradingCostResult:
        notional = request.price * request.shares
        fee_multiplier = 2 if request.side == "roundTrip" else 1
        tax_multiplier = 1 if request.side in {"sell", "roundTrip"} else 0
        fee = notional * request.fee_rate * fee_multiplier
        tax = notional * request.tax_rate * tax_multiplier
        slippage = notional * (request.slippage_bps / 10000) * fee_multiplier
        total = fee + tax + slippage
        cost_pct = (total / notional * 100) if notional else 0
        return TradingCostResult(notional=round(notional, 2), fee=round(fee, 2), tax=round(tax, 2), slippage=round(slippage, 2), totalCost=round(total, 2), costPct=round(cost_pct, 4), note="Cost model includes fee, sell-side tax, and slippage estimate. Adjust rates for your broker and product.")

    def _persist_factor_scores(self, results, ranks: list[CrossSectionRank], db: Session) -> None:
        rank_by_symbol = {row.symbol: row for row in ranks}
        score_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        for result in results:
            rank = rank_by_symbol[result.symbol]
            db.add(FactorScoreModel(
                symbol=result.symbol,
                name=result.name,
                score_date=score_date,
                model_version="quant-v1",
                quant_score=result.quant_score,
                rank=rank.rank,
                percentile=rank.percentile,
                trend_score=result.breakdown.trend_score,
                momentum_score=result.breakdown.momentum_score,
                volatility_score=result.breakdown.volatility_score,
                rsi_score=result.breakdown.rsi_score,
                ma_structure_score=result.breakdown.ma_structure_score,
                volume_score=result.breakdown.volume_score,
                overheat_penalty=result.breakdown.overheat_penalty,
                data_quality_penalty=result.breakdown.data_quality_penalty,
                provider=result.provider,
                data_source=result.data_source,
                warnings_json=json.dumps(result.warnings, ensure_ascii=False),
                explanation=result.explanation,
            ))
        try:
            db.commit()
        except Exception:
            db.rollback()


def parse_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value[:10])
    except Exception:
        return None


def window_return(bars, event_day: date, start_offset: int, end_offset: int) -> float | None:
    if not bars:
        return None
    event_index = nearest_index(bars, event_day)
    start = max(0, event_index + start_offset)
    end = min(len(bars) - 1, event_index + end_offset)
    if end <= start or bars[start].close == 0:
        return None
    return round((bars[end].close - bars[start].close) / bars[start].close * 100, 2)


def max_drawdown_after(bars, event_day: date, post_days: int) -> float | None:
    if not bars:
        return None
    event_index = nearest_index(bars, event_day)
    sample = bars[event_index:min(len(bars), event_index + post_days + 1)]
    if not sample:
        return None
    peak = sample[0].close
    max_dd = 0.0
    for bar in sample:
        peak = max(peak, bar.close)
        if peak:
            max_dd = min(max_dd, (bar.close - peak) / peak * 100)
    return round(max_dd, 2)


def nearest_index(bars, target: date) -> int:
    best_index = 0
    best_delta = 10**9
    for index, bar in enumerate(bars):
        parsed = parse_date(str(bar.time)) or target
        delta = abs((parsed - target).days)
        if delta < best_delta:
            best_delta = delta
            best_index = index
    return best_index


def safe_sub(left: float | None, right: float | None) -> float | None:
    if left is None or right is None:
        return None
    return round(left - right, 2)

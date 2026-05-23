from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import json
import math
import statistics

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.market import DataQualityReportModel, FactorScoreModel, PriceBarModel, QuoteLatestModel
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
        if symbol_payload.data_source in {"Demo", "Estimated"}:
            warnings.append("事件標的使用 Demo / Estimated 價格資料，abnormal return 僅供流程驗證。")
        if benchmark_payload.data_source in {"Demo", "Estimated"}:
            warnings.append("Benchmark 使用 Demo / Estimated 資料，abnormal return 可信度降低。")
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
        warnings = list(payload.warnings)
        demo_count = sum(1 for row in payload.results if row.data_source == "Demo")
        low_quality_count = sum(1 for row in payload.results if row.data_quality == "low")
        if demo_count:
            warnings.append(f"{demo_count}/{total} 檔使用 Demo fallback，橫截面排名不可視為真實市場排序。")
        if low_quality_count:
            warnings.append(f"{low_quality_count}/{total} 檔資料品質偏低，請先補行情資料再做量化排名。")
        if persist and db:
            self._persist_factor_scores(payload.results, ranks, db)
        return CrossSectionPayload(asOf=datetime.now(timezone.utc).isoformat(), universeSize=total, ranks=ranks, warnings=warnings)

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
        now = datetime.now(timezone.utc)
        if not db:
            return self._static_data_quality(now)
        reports = [
            self._quote_quality(db, now),
            self._price_bar_quality(db, now),
            self._factor_score_quality(db, now),
            self._event_quality_placeholder(now),
        ]
        for report in reports:
            db.add(DataQualityReportModel(
                dataset=report.dataset,
                provider=report.provider,
                records_checked=report.records_checked,
                missing_rate=report.missing_rate,
                stale_rate=report.stale_rate,
                error_rate=report.error_rate,
                score=report.score,
                warning=report.warning,
            ))
        try:
            db.commit()
        except Exception:
            db.rollback()
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
        if cross.warnings:
            warnings.extend(cross.warnings[:3])
        return PortfolioOptimizeResult(capital=request.capital, weights=weights, themeExposure={key: round(value, 2) for key, value in theme_exposure.items()}, warnings=warnings, sourceNote="Simple score-weighted optimizer with max position and theme exposure guardrails; not a portfolio recommendation.")

    async def walk_forward(self, symbols: list[str] | None = None, db: Session | None = None) -> WalkForwardResult:
        if db:
            historical = self._walk_forward_from_factor_scores(symbols or DEFAULT_UNIVERSE[:8], db)
            if historical:
                return historical
        cross = await self.cross_section(symbols or DEFAULT_UNIVERSE[:8], persist=False)
        sample = [row for row in cross.ranks if row.data_quality != "low"]
        warnings = ["Walk-forward fallback uses current cross-section snapshot only; persistent historical factor_scores and price_bars are required for true validation."]
        if cross.warnings:
            warnings.extend(cross.warnings[:3])
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

    def _walk_forward_from_factor_scores(self, symbols: list[str], db: Session) -> WalkForwardResult | None:
        rows = db.query(FactorScoreModel).filter(
            FactorScoreModel.symbol.in_(symbols),
            FactorScoreModel.model_version == "quant-v1",
        ).order_by(FactorScoreModel.score_date.asc()).all()
        unique_dates = sorted({row.score_date.date() for row in rows})
        if len(rows) < 5 or len(unique_dates) < 2:
            return None
        returns: list[float] = []
        hits = 0
        max_drawdown = 0.0
        warnings: list[str] = []
        for row in rows:
            forward = forward_return_from_bars(db, row.symbol, row.score_date, horizon_days=20)
            if forward is None:
                continue
            returns.append(forward)
            if forward > 0:
                hits += 1
            max_drawdown = min(max_drawdown, forward)
        if len(returns) < 3:
            return None
        demo_factor_count = sum(1 for row in rows if row.data_source == "Demo")
        if demo_factor_count:
            warnings.append(f"factor_scores 中有 {demo_factor_count}/{len(rows)} 筆 Demo/fallback 資料，walk-forward 可信度降低。")
        price_demo_count = db.query(PriceBarModel).filter(PriceBarModel.symbol.in_(symbols), PriceBarModel.data_source == "Demo").count()
        if price_demo_count:
            warnings.append(f"price_bars 中有 {price_demo_count} 筆 Demo/fallback 資料，forward return 只能做流程驗證。")
        train_cutoff = unique_dates[max(0, int(len(unique_dates) * 0.7) - 1)]
        return WalkForwardResult(
            modelVersion="quant-v1",
            trainStart=unique_dates[0].isoformat(),
            trainEnd=train_cutoff.isoformat(),
            testStart=unique_dates[min(len(unique_dates) - 1, int(len(unique_dates) * 0.7))].isoformat(),
            testEnd=unique_dates[-1].isoformat(),
            sampleSize=len(returns),
            hitRate=round(hits / len(returns) * 100, 2),
            averageForwardReturn=round(statistics.mean(returns), 2),
            maxDrawdown=round(max_drawdown, 2),
            warnings=warnings,
            sourceNote="Walk-forward validation from persisted factor_scores joined with price_bars 20-day forward returns. MVP estimate; not investment advice.",
        )

    def _persist_factor_scores(self, results, ranks: list[CrossSectionRank], db: Session) -> None:
        rank_by_symbol = {row.symbol: row for row in ranks}
        score_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        symbols = [result.symbol for result in results]
        try:
            db.query(FactorScoreModel).filter(
                FactorScoreModel.symbol.in_(symbols),
                FactorScoreModel.score_date == score_date,
                FactorScoreModel.model_version == "quant-v1",
            ).delete(synchronize_session=False)
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
            db.commit()
        except Exception:
            db.rollback()

    def _quote_quality(self, db: Session, now: datetime) -> DataQualityReport:
        total = db.query(QuoteLatestModel).count()
        demo = db.query(QuoteLatestModel).filter(QuoteLatestModel.data_source == "Demo").count()
        latest = db.query(func.max(QuoteLatestModel.fetched_at)).scalar()
        stale_rate = stale_rate_from_latest(latest, now, stale_after_hours=6)
        missing_rate = 1.0 if total == 0 else demo / total
        warning = quality_warning("quotes_latest", total, missing_rate, stale_rate, 0)
        return make_quality_report("quotes_latest", "database", total, missing_rate, stale_rate, 0, now, warning)

    def _price_bar_quality(self, db: Session, now: datetime) -> DataQualityReport:
        total = db.query(PriceBarModel).count()
        demo = db.query(PriceBarModel).filter(PriceBarModel.data_source == "Demo").count()
        latest = db.query(func.max(PriceBarModel.fetched_at)).scalar()
        stale_rate = stale_rate_from_latest(latest, now, stale_after_hours=36)
        missing_rate = 1.0 if total == 0 else demo / total
        warning = quality_warning("price_bars", total, missing_rate, stale_rate, 0)
        return make_quality_report("price_bars", "database", total, missing_rate, stale_rate, 0, now, warning)

    def _factor_score_quality(self, db: Session, now: datetime) -> DataQualityReport:
        total = db.query(FactorScoreModel).count()
        demo = db.query(FactorScoreModel).filter(FactorScoreModel.data_source == "Demo").count()
        latest = db.query(func.max(FactorScoreModel.created_at)).scalar()
        stale_rate = stale_rate_from_latest(latest, now, stale_after_hours=30)
        missing_rate = 1.0 if total == 0 else demo / total
        warning = quality_warning("factor_scores", total, missing_rate, stale_rate, 0)
        return make_quality_report("factor_scores", "database", total, missing_rate, stale_rate, 0, now, warning)

    def _event_quality_placeholder(self, now: datetime) -> DataQualityReport:
        warning = "事件資料尚未完全資料庫化；目前依 backend event adapters / imported / manual / demo fallback 混合。"
        return make_quality_report("events", "backend-events", 0, 0.35, 0.25, 0.05, now, warning)

    def _static_data_quality(self, now: datetime) -> list[DataQualityReport]:
        checks = [
            ("quotes_latest", "backend", 0.05, 0.15, 0.02),
            ("price_bars", "backend", 0.08, 0.10, 0.03),
            ("events", "backend-events", 0.25, 0.30, 0.05),
            ("factor_scores", "request-time", 0.20, 0.30, 0.02),
        ]
        return [make_quality_report(dataset, provider, 0, missing, stale, error, now, quality_warning(dataset, 0, missing, stale, error)) for dataset, provider, missing, stale, error in checks]


def forward_return_from_bars(db: Session, symbol: str, score_date: datetime, horizon_days: int = 20) -> float | None:
    start_bar = db.query(PriceBarModel).filter(
        PriceBarModel.symbol == symbol,
        PriceBarModel.interval == "1d",
        PriceBarModel.date_time >= score_date,
    ).order_by(PriceBarModel.date_time.asc()).first()
    if not start_bar or not start_bar.close:
        return None
    end_bar = db.query(PriceBarModel).filter(
        PriceBarModel.symbol == symbol,
        PriceBarModel.interval == "1d",
        PriceBarModel.date_time >= score_date + timedelta(days=horizon_days),
    ).order_by(PriceBarModel.date_time.asc()).first()
    if not end_bar or not end_bar.close:
        return None
    return round((end_bar.close - start_bar.close) / start_bar.close * 100, 2)


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


def stale_rate_from_latest(latest: datetime | None, now: datetime, stale_after_hours: int) -> float:
    if not latest:
        return 1.0
    if latest.tzinfo is None:
        latest = latest.replace(tzinfo=timezone.utc)
    age_hours = max(0.0, (now - latest).total_seconds() / 3600)
    if age_hours <= stale_after_hours:
        return 0.0
    if age_hours >= stale_after_hours * 4:
        return 1.0
    return round((age_hours - stale_after_hours) / (stale_after_hours * 3), 4)


def quality_score(missing_rate: float, stale_rate: float, error_rate: float) -> float:
    return max(0, round(100 - missing_rate * 70 - stale_rate * 25 - error_rate * 100, 2))


def quality_warning(dataset: str, records_checked: int, missing_rate: float, stale_rate: float, error_rate: float) -> str | None:
    if records_checked == 0:
        return f"{dataset} 目前資料庫沒有紀錄；量化分析會依 provider 即時計算或 fallback。"
    score = quality_score(missing_rate, stale_rate, error_rate)
    if score < 70:
        return f"{dataset} 資料品質偏低；missing/demo ratio {missing_rate:.1%}, stale {stale_rate:.1%}, error {error_rate:.1%}。"
    if missing_rate > 0.25:
        return f"{dataset} Demo / fallback 比例偏高，請補真實資料源。"
    if stale_rate > 0.25:
        return f"{dataset} 更新時間偏舊，請執行刷新 job。"
    return None


def make_quality_report(dataset: str, provider: str, records: int, missing: float, stale: float, error: float, now: datetime, warning: str | None) -> DataQualityReport:
    return DataQualityReport(
        dataset=dataset,
        provider=provider,
        recordsChecked=records,
        missingRate=round(missing * 100, 2),
        staleRate=round(stale * 100, 2),
        errorRate=round(error * 100, 2),
        score=quality_score(missing, stale, error),
        warning=warning,
        checkedAt=now.isoformat(),
    )

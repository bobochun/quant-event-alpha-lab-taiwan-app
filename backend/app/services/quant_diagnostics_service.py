from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.market import FactorScoreModel, PriceBarModel, QuoteLatestModel
from app.schemas.diagnostics import QuantDatasetDiagnostic, QuantDiagnosticsPayload


class QuantDiagnosticsService:
    def diagnostics(self, db: Session) -> QuantDiagnosticsPayload:
        now = datetime.now(timezone.utc)
        datasets = [
            dataset_diag(
                dataset="quotes_latest",
                records=db.query(QuoteLatestModel).count(),
                demo_records=db.query(QuoteLatestModel).filter(QuoteLatestModel.data_source == "Demo").count(),
                latest=db.query(func.max(QuoteLatestModel.fetched_at)).scalar(),
                stale_after_hours=6,
                min_records=5,
            ),
            dataset_diag(
                dataset="price_bars",
                records=db.query(PriceBarModel).count(),
                demo_records=db.query(PriceBarModel).filter(PriceBarModel.data_source == "Demo").count(),
                latest=db.query(func.max(PriceBarModel.fetched_at)).scalar(),
                stale_after_hours=36,
                min_records=240,
            ),
            dataset_diag(
                dataset="factor_scores",
                records=db.query(FactorScoreModel).count(),
                demo_records=db.query(FactorScoreModel).filter(FactorScoreModel.data_source == "Demo").count(),
                latest=db.query(func.max(FactorScoreModel.created_at)).scalar(),
                stale_after_hours=30,
                min_records=10,
            ),
        ]
        score = readiness_score(datasets)
        recommendations = recommendations_for(datasets)
        return QuantDiagnosticsPayload(
            readinessScore=score,
            readinessLevel=readiness_level(score),
            datasets=datasets,
            recommendations=recommendations,
            generatedAt=now.isoformat(),
        )


def dataset_diag(dataset: str, records: int, demo_records: int, latest: datetime | None, stale_after_hours: int, min_records: int) -> QuantDatasetDiagnostic:
    now = datetime.now(timezone.utc)
    latest_ts = normalize_dt(latest)
    staleness_hours = None
    if latest_ts:
        staleness_hours = round(max(0.0, (now - latest_ts).total_seconds() / 3600), 2)
    demo_ratio = demo_records / records if records else 1.0
    warning = None
    status = "ok"
    if records == 0:
        status = "missing"
        warning = f"{dataset} 沒有資料，後端會即時計算或 fallback，但不適合做完整量化研究。"
    elif records < min_records:
        status = "degraded"
        warning = f"{dataset} 筆數 {records} 低於建議 {min_records}，橫截面/回測可信度有限。"
    elif demo_ratio > 0.5:
        status = "degraded"
        warning = f"{dataset} Demo/fallback 比例 {demo_ratio:.1%} 偏高，請補真實資料源。"
    elif staleness_hours is not None and staleness_hours > stale_after_hours:
        status = "stale"
        warning = f"{dataset} 最近更新距今 {staleness_hours:.1f} 小時，建議刷新。"
    return QuantDatasetDiagnostic(
        dataset=dataset,
        records=records,
        demoRecords=demo_records,
        latestTimestamp=latest_ts.isoformat() if latest_ts else None,
        stalenessHours=staleness_hours,
        status=status,
        warning=warning,
    )


def readiness_score(datasets: list[QuantDatasetDiagnostic]) -> float:
    if not datasets:
        return 0
    status_score = {"ok": 100, "stale": 70, "degraded": 55, "missing": 15, "error": 0}
    return round(sum(status_score.get(row.status, 30) for row in datasets) / len(datasets), 2)


def readiness_level(score: float) -> str:
    if score >= 85:
        return "ready"
    if score >= 65:
        return "usable_with_warnings"
    if score >= 40:
        return "limited"
    return "not_ready"


def recommendations_for(datasets: list[QuantDatasetDiagnostic]) -> list[str]:
    recs: list[str] = []
    by_name = {row.dataset: row for row in datasets}
    if by_name.get("quotes_latest") and by_name["quotes_latest"].status != "ok":
        recs.append("先執行 refresh_latest_quotes 或確認 FinMind/yfinance/official provider。")
    if by_name.get("price_bars") and by_name["price_bars"].status != "ok":
        recs.append("先執行 refresh_daily_kline，至少累積 1 年日 K，MA60/RSI/波動分數才穩。")
    if by_name.get("factor_scores") and by_name["factor_scores"].status != "ok":
        recs.append("執行 refresh_factor_scores / quant_scan_daily，讓全市場排名與 walk-forward 有持久化資料。")
    if not recs:
        recs.append("資料狀態足以執行 MVP 量化掃描；仍需注意這不是投資建議。")
    return recs


def normalize_dt(value: datetime | None) -> datetime | None:
    if not value:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

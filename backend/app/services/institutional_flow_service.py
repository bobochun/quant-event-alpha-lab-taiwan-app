from __future__ import annotations

from datetime import datetime, timezone
import math
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.data_sources.demo_market import security_name
from app.schemas.market import InstitutionalFlowData

DEMO_FLOW: dict[str, tuple[int, int, int]] = {
    "2330": (8_500_000, 1_200_000, -450_000),
    "2382": (2_100_000, 1_850_000, 220_000),
    "2317": (-4_200_000, 900_000, -300_000),
    "2308": (1_350_000, 650_000, 180_000),
    "3017": (680_000, 420_000, 90_000),
    "3037": (900_000, 300_000, -40_000),
    "2603": (-1_200_000, -180_000, 70_000),
    "2615": (450_000, 120_000, 40_000),
}


class InstitutionalFlowService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.finmind_url = "https://api.finmindtrade.com/api/v4/data"

    async def latest_flow(self, symbol: str, provider: str = "auto") -> InstitutionalFlowData:
        if provider in {"auto", "finmind"} and self.settings.enable_finmind and self.settings.finmind_api_token:
            try:
                return await self._finmind_flow(symbol)
            except Exception as exc:
                fallback = self._demo_flow(symbol)
                fallback.warnings.append(f"FinMind 法人資料讀取失敗，使用示範 fallback：{exc}")
                return fallback
        if provider in {"auto", "official", "twse", "tpex"} and self.settings.enable_official_data:
            fallback = self._demo_flow(symbol)
            fallback.provider = "official-placeholder"
            fallback.data_source = "Estimated"
            fallback.source_note = "官方法人資料 adapter 尚待 endpoint normalizer；目前回傳估算/示範 fallback，不可視為真實法人買賣超。"
            fallback.warnings.append("官方法人籌碼 endpoint 尚未接入；請勿視為真實外資/投信資料。")
            return fallback
        return self._demo_flow(symbol)

    async def _finmind_flow(self, symbol: str) -> InstitutionalFlowData:
        # FinMind TaiwanStockInstitutionalInvestorsBuySell supports institutional investor buy/sell by date.
        # The field names may vary by dataset version; normalize defensively.
        today = datetime.now(timezone.utc).date()
        start = today.replace(day=1).isoformat()
        params = {
            "dataset": "TaiwanStockInstitutionalInvestorsBuySell",
            "data_id": symbol,
            "start_date": start,
            "token": self.settings.finmind_api_token,
        }
        async with httpx.AsyncClient(timeout=self.settings.official_data_timeout_ms / 1000) as client:
            response = await client.get(self.finmind_url, params=params)
        if response.status_code in {401, 402, 403}:
            raise RuntimeError("FinMind 權限不足，可能需要 sponsor 或有效 token。")
        response.raise_for_status()
        body = response.json()
        if body.get("status") != 200:
            raise RuntimeError(str(body.get("msg") or "FinMind 回傳非成功狀態"))
        rows = body.get("data") or []
        if not rows:
            raise RuntimeError("FinMind 未回傳法人買賣超資料。")
        return normalize_finmind_rows(symbol, rows)

    def _demo_flow(self, symbol: str) -> InstitutionalFlowData:
        foreign, trust, dealer = DEMO_FLOW.get(symbol, (0, 0, 0))
        total = foreign + trust + dealer
        score = calculate_flow_score(foreign, trust, dealer, total)
        now = datetime.now(timezone.utc).isoformat()
        return InstitutionalFlowData(
            symbol=symbol,
            name=security_name(symbol),
            tradeDate=datetime.now(timezone.utc).date().isoformat(),
            foreignNetBuyShares=foreign,
            investmentTrustNetBuyShares=trust,
            dealerNetBuyShares=dealer,
            totalInstitutionalNetBuyShares=total,
            foreignConsecutiveDays=consecutive_stub(foreign),
            investmentTrustConsecutiveDays=consecutive_stub(trust),
            dealerConsecutiveDays=consecutive_stub(dealer),
            flowConfirmationScore=score,
            flowBias=classify_flow_bias(foreign, trust, dealer, total),
            warnings=["此為 Demo / fallback 法人籌碼資料，僅供 UI 與流程測試，不可視為真實外資、投信、自營商買賣超。"],
            provider="demo-flow",
            dataSource="Demo",
            sourceNote="Demo institutional flow fallback. Connect FinMind/official adapters for real institutional flow.",
            fetchedAt=now,
        )


def normalize_finmind_rows(symbol: str, rows: list[dict[str, Any]]) -> InstitutionalFlowData:
    grouped: dict[str, dict[str, int]] = {}
    for row in rows[-80:]:
        trade_date = str(row.get("date") or row.get("trade_date") or datetime.now(timezone.utc).date().isoformat())[:10]
        name = str(row.get("name") or row.get("institutional_investor") or row.get("type") or "")
        buy = safe_int(row.get("buy") or row.get("buy_shares") or row.get("Buy"))
        sell = safe_int(row.get("sell") or row.get("sell_shares") or row.get("Sell"))
        net = safe_int(row.get("net_buy_sell") or row.get("buy_sell") or row.get("NetBuySell"), default=buy - sell)
        bucket = investor_bucket(name)
        if bucket not in grouped:
            grouped[bucket] = {}
        grouped[bucket][trade_date] = grouped[bucket].get(trade_date, 0) + net
    all_dates = sorted({date for bucket in grouped.values() for date in bucket})
    latest_date = all_dates[-1] if all_dates else datetime.now(timezone.utc).date().isoformat()
    foreign = grouped.get("foreign", {}).get(latest_date, 0)
    trust = grouped.get("investment_trust", {}).get(latest_date, 0)
    dealer = grouped.get("dealer", {}).get(latest_date, 0)
    total = foreign + trust + dealer
    return InstitutionalFlowData(
        symbol=symbol,
        name=security_name(symbol),
        tradeDate=latest_date,
        foreignNetBuyShares=foreign,
        investmentTrustNetBuyShares=trust,
        dealerNetBuyShares=dealer,
        totalInstitutionalNetBuyShares=total,
        foreignConsecutiveDays=consecutive_from_series(grouped.get("foreign", {}), latest_date),
        investmentTrustConsecutiveDays=consecutive_from_series(grouped.get("investment_trust", {}), latest_date),
        dealerConsecutiveDays=consecutive_from_series(grouped.get("dealer", {}), latest_date),
        flowConfirmationScore=calculate_flow_score(foreign, trust, dealer, total),
        flowBias=classify_flow_bias(foreign, trust, dealer, total),
        warnings=[],
        provider="finmind-flow",
        dataSource="Official",
        sourceNote="FinMind institutional buy/sell dataset. Verify dataset permission, freshness, and field definitions before research use.",
        fetchedAt=datetime.now(timezone.utc).isoformat(),
    )


def investor_bucket(name: str) -> str:
    lowered = name.lower()
    if "投信" in name or "investment" in lowered:
        return "investment_trust"
    if "自營" in name or "dealer" in lowered:
        return "dealer"
    if "外資" in name or "foreign" in lowered:
        return "foreign"
    return "foreign"


def safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        return int(float(value))
    except Exception:
        return default


def consecutive_stub(value: int) -> int:
    if value > 0:
        return 3
    if value < 0:
        return -2
    return 0


def consecutive_from_series(series: dict[str, int], latest_date: str) -> int:
    dates = sorted(series)
    if not dates or latest_date not in series:
        return 0
    latest_value = series[latest_date]
    if latest_value == 0:
        return 0
    sign = 1 if latest_value > 0 else -1
    count = 0
    for date_value in reversed(dates):
        value = series.get(date_value, 0)
        if value == 0 or (value > 0) != (sign > 0):
            break
        count += 1
    return count * sign


def calculate_flow_score(foreign: int, trust: int, dealer: int, total: int) -> float:
    score = 50.0
    score += 18 if foreign > 0 else -12 if foreign < 0 else 0
    score += 22 if trust > 0 else -14 if trust < 0 else 0
    score += 8 if dealer > 0 else -5 if dealer < 0 else 0
    score += 12 if total > 0 else -10 if total < 0 else 0
    return round(max(0, min(100, score)), 2)


def classify_flow_bias(foreign: int, trust: int, dealer: int, total: int) -> str:
    positive_count = sum(1 for value in [foreign, trust, dealer] if value > 0)
    negative_count = sum(1 for value in [foreign, trust, dealer] if value < 0)
    if positive_count >= 2 and total > 0:
        return "accumulation"
    if negative_count >= 2 and total < 0:
        return "distribution"
    if positive_count and negative_count:
        return "mixed"
    if total == 0:
        return "neutral"
    return "unknown"

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import time
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.data_sources.demo_market import security_name
from app.schemas.events import EventData, EventProviderStatus, EventsPayload

_SHARED_EVENTS_CACHE: dict[str, tuple[float, EventsPayload]] = {}

AI_THEMES = {"AI server", "CoWoS", "Semiconductor Equipment"}
DEFAULT_THEMES_BY_SYMBOL: dict[str, list[str]] = {
    "2330": ["AI server", "CoWoS", "Semiconductor Equipment"],
    "2317": ["AI server", "EV"],
    "2382": ["AI server"],
    "3231": ["AI server"],
    "3017": ["Thermal", "AI server"],
    "3037": ["PCB", "AI server"],
    "2308": ["AI server", "EV"],
    "2603": ["Shipping", "Dividend ETF"],
    "2615": ["Shipping"],
}


class EventService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.finmind_url = "https://api.finmindtrade.com/api/v4/data"
        self._cache = _SHARED_EVENTS_CACHE

    async def upcoming(self, days: int = 30, symbols: list[str] | None = None, provider: str = "auto") -> EventsPayload:
        normalized_symbols = sorted({item.strip() for item in (symbols or []) if item.strip()})
        cache_key = f"{provider}|{days}|{','.join(normalized_symbols)}|{date.today().isoformat()}"
        cached = self._cache.get(cache_key)
        if cached and time.time() - cached[0] < 600:
            return cached[1]

        providers: list[EventProviderStatus] = []
        events: list[EventData] = []
        notes: list[str] = []

        if provider in {"auto", "finmind"}:
            finmind_events, finmind_status = await self._fetch_finmind_events(days, normalized_symbols)
            events.extend(finmind_events)
            providers.append(finmind_status)
            if finmind_status.error_message:
                notes.append(finmind_status.error_message)

        if provider in {"auto", "official", "mops"}:
            providers.append(self._mops_status())
            providers.append(self._official_status())
            notes.append("MOPS / TWSE / TPEx 事件類資料目前以 metadata 與 CSV 匯入為主，不做激進爬蟲。")

        events = dedupe_events(events)
        source_note = "已由後端事件 provider 取得事件資料。" if events else "後端尚未取得正式事件資料；前端可使用 Imported / Manual / Demo fallback，且必須明確標示來源。"
        if notes:
            source_note = f"{source_note} {' '.join(notes[:3])}"
        payload = EventsPayload(
            events=events,
            providers=providers,
            sourceNote=source_note,
            generatedAt=datetime.now(timezone.utc).isoformat(),
        )
        self._cache[cache_key] = (time.time(), payload)
        return payload

    async def _fetch_finmind_events(self, days: int, symbols: list[str]) -> tuple[list[EventData], EventProviderStatus]:
        if not (self.settings.enable_finmind and self.settings.finmind_api_token):
            return [], EventProviderStatus(
                provider="finmind-events",
                status="disabled",
                supportsEvents=True,
                supportsMonthlyRevenue=True,
                supportsDividends=True,
                supportsInvestorConference=False,
                supportsAttentionDisposition=False,
                tokenConfigured=bool(self.settings.finmind_api_token),
                errorMessage="未設定 ENABLE_FINMIND=true 與 FINMIND_API_TOKEN；正式事件來源停用。",
                sourceNote="FinMind 事件 adapter 預留；未設定 token 時不使用。",
            )

        events: list[EventData] = []
        errors: list[str] = []
        target_symbols = symbols or ["2330", "2317", "2382", "2308", "2603"]
        start = (date.today() - timedelta(days=45)).isoformat()
        end = (date.today() + timedelta(days=days)).isoformat()

        for symbol in target_symbols[:30]:
            try:
                revenue_rows = await self._finmind_fetch("TaiwanStockMonthRevenue", symbol, start, end)
                events.extend(monthly_revenue_events(symbol, revenue_rows))
            except Exception as exc:
                errors.append(f"{symbol} monthlyRevenue: {exc}")
            try:
                dividend_rows = await self._finmind_fetch("TaiwanStockDividend", symbol, start, end)
                events.extend(dividend_events(symbol, dividend_rows, days))
            except Exception as exc:
                errors.append(f"{symbol} dividend: {exc}")

        status = "ok" if events else "degraded"
        return events, EventProviderStatus(
            provider="finmind-events",
            status=status,
            supportsEvents=True,
            supportsMonthlyRevenue=True,
            supportsDividends=True,
            supportsInvestorConference=False,
            supportsAttentionDisposition=False,
            tokenConfigured=True,
            recordsFetched=len(events),
            errorMessage=None if events else ("FinMind 未回傳可用事件資料。" if not errors else "；".join(errors[:3])),
            sourceNote="FinMind 事件資料依 API 權限與 dataset 可用性而定；不代表完整市場事件。",
        )

    async def _finmind_fetch(self, dataset: str, symbol: str, start: str, end: str) -> list[dict[str, Any]]:
        params = {
            "dataset": dataset,
            "data_id": symbol,
            "start_date": start,
            "end_date": end,
            "token": self.settings.finmind_api_token,
        }
        timeout = self.settings.official_data_timeout_ms / 1000
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(self.finmind_url, params=params)
        if response.status_code in {401, 402, 403}:
            raise RuntimeError("FinMind 權限不足，可能需要 sponsor 權限。")
        response.raise_for_status()
        body = response.json()
        if body.get("status") != 200:
            raise RuntimeError(str(body.get("msg") or "FinMind API 回傳非成功狀態。"))
        return body.get("data") or []

    def _mops_status(self) -> EventProviderStatus:
        return EventProviderStatus(
            provider="mops-metadata",
            status="degraded",
            supportsEvents=True,
            supportsMonthlyRevenue=True,
            supportsDividends=True,
            supportsInvestorConference=True,
            supportsAttentionDisposition=False,
            tokenConfigured=False,
            recordsFetched=0,
            errorMessage="MOPS 第一版不做激進爬蟲；請用 CSV / manual import 或未來官方 connector。",
            sourceNote="公開資訊觀測站適合做事件 metadata 來源，但需遵守查詢限制與欄位更新。",
        )

    def _official_status(self) -> EventProviderStatus:
        return EventProviderStatus(
            provider="twse-tpex-official-events",
            status="degraded" if self.settings.enable_official_data else "disabled",
            supportsEvents=True,
            supportsMonthlyRevenue=False,
            supportsDividends=True,
            supportsInvestorConference=False,
            supportsAttentionDisposition=True,
            tokenConfigured=False,
            recordsFetched=0,
            errorMessage=None if self.settings.enable_official_data else "ENABLE_OFFICIAL_DATA 未開啟；官方事件 adapter 暫停。",
            sourceNote="TWSE / TPEx 可作除權息、注意股、處置股等公開資料來源，不標示為即時。",
        )


def monthly_revenue_events(symbol: str, rows: list[dict[str, Any]]) -> list[EventData]:
    events: list[EventData] = []
    now = datetime.now(timezone.utc).isoformat()
    for row in rows[-3:]:
        date_value = str(row.get("date") or row.get("revenue_year_month") or date.today().isoformat())
        event_date = normalize_date(date_value)
        revenue = safe_float(row.get("revenue") or row.get("Revenue"))
        yoy = safe_float(row.get("revenue_growth_rate") or row.get("YoY") or row.get("yoy"))
        title_parts = ["月營收更新"]
        if revenue is not None:
            title_parts.append(f"營收 {round(revenue / 100000000, 2)} 億")
        if yoy is not None:
            title_parts.append(f"YoY {round(yoy, 2)}%")
        events.append(EventData(
            id=f"finmind-monthlyRevenue-{symbol}-{event_date}",
            symbol=symbol,
            name=security_name(symbol),
            eventType="monthlyRevenue",
            eventTitle=" / ".join(title_parts),
            eventDate=event_date,
            source="FinMind TaiwanStockMonthRevenue",
            sourceUrl="https://finmindtrade.com/analysis/#/data/api",
            dataSource="Official",
            sourceNote="FinMind API 取得之月營收資料；需自行確認公告時點與欄位定義。",
            confidence=72,
            expectedImpact=70 if (yoy or 0) > 10 else 55,
            marketAwareness=45,
            relatedThemes=themes_for_symbol(symbol),
            createdAt=now,
            updatedAt=now,
        ))
    return events


def dividend_events(symbol: str, rows: list[dict[str, Any]], days: int) -> list[EventData]:
    events: list[EventData] = []
    now = datetime.now(timezone.utc).isoformat()
    today = date.today()
    latest = today + timedelta(days=days)
    for row in rows[-8:]:
        raw_date = row.get("ex_dividend_date") or row.get("date") or row.get("CashExDividendTradingDate")
        if not raw_date:
            continue
        event_date = normalize_date(str(raw_date))
        parsed = parse_date(event_date)
        if not parsed or parsed < today or parsed > latest:
            continue
        cash = safe_float(row.get("CashEarningsDistribution") or row.get("cash_dividend") or row.get("dividend"))
        title = "除息 / 股利事件" + (f"，現金股利 {cash}" if cash is not None else "")
        events.append(EventData(
            id=f"finmind-exDividend-{symbol}-{event_date}",
            symbol=symbol,
            name=security_name(symbol),
            eventType="exDividend",
            eventTitle=title,
            eventDate=event_date,
            source="FinMind TaiwanStockDividend",
            sourceUrl="https://finmindtrade.com/analysis/#/data/api",
            dataSource="Official",
            sourceNote="FinMind API 取得之股利 / 除息資料；不構成交易建議。",
            confidence=75,
            expectedImpact=55,
            marketAwareness=50,
            relatedThemes=themes_for_symbol(symbol),
            createdAt=now,
            updatedAt=now,
        ))
    return events


def dedupe_events(events: list[EventData]) -> list[EventData]:
    seen: set[str] = set()
    output: list[EventData] = []
    for event in sorted(events, key=lambda item: (item.event_date, item.symbol, item.event_type)):
        key = f"{event.symbol}|{event.event_type}|{event.event_date}|{event.event_title}"
        if key in seen:
            continue
        seen.add(key)
        output.append(event)
    return output


def normalize_date(value: str) -> str:
    value = value[:10].replace("/", "-")
    if len(value) == 7:
        return f"{value}-10"
    parsed = parse_date(value)
    return parsed.isoformat() if parsed else date.today().isoformat()


def parse_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value[:10])
    except Exception:
        return None


def safe_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def themes_for_symbol(symbol: str) -> list[str]:
    return DEFAULT_THEMES_BY_SYMBOL.get(symbol, ["Market Event"])


def clear_event_cache() -> None:
    _SHARED_EVENTS_CACHE.clear()

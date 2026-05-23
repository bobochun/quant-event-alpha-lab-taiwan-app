from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.data_sources.demo_market import security_name
from app.schemas.warnings import MarketWarningItem, MarketWarningsPayload, WarningSeverity, WarningType


class MarketWarningService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def warnings(self, symbols: list[str] | None = None) -> MarketWarningsPayload:
        normalized = {symbol.strip() for symbol in (symbols or []) if symbol.strip()}
        status: list[dict[str, Any]] = []
        items: list[MarketWarningItem] = []
        if not self.settings.enable_official_data:
            return MarketWarningsPayload(
                items=[],
                providerStatus=[{"provider": "official-warning", "status": "disabled", "message": "ENABLE_OFFICIAL_DATA 未開啟，官方注意/處置資料停用。"}],
                sourceNote="官方注意股 / 處置股 adapter 已建立，但目前未啟用 official data。",
                generatedAt=now_iso(),
            )

        sources = [
            ("twse-attention", "TWSE", "attention", self.settings.twse_attention_endpoint),
            ("twse-disposition", "TWSE", "disposition", self.settings.twse_disposition_endpoint),
            ("tpex-attention", "TPEx", "attention", self.settings.tpex_attention_endpoint),
            ("tpex-disposition", "TPEx", "disposition", self.settings.tpex_disposition_endpoint),
        ]
        for provider, market, warning_type, url in sources:
            if not url:
                status.append({"provider": provider, "status": "degraded", "recordsFetched": 0, "message": "尚未設定 endpoint，未抓取資料。"})
                continue
            try:
                rows = await self._fetch_json_rows(url)
                parsed = [parse_warning_row(row, provider, market, warning_type, url) for row in rows]
                parsed = [item for item in parsed if item is not None]
                if normalized:
                    parsed = [item for item in parsed if item.symbol in normalized]
                items.extend(parsed)
                status.append({"provider": provider, "status": "ok", "recordsFetched": len(parsed), "message": "官方警示資料解析完成。"})
            except Exception as exc:
                status.append({"provider": provider, "status": "error", "recordsFetched": 0, "message": f"官方警示資料讀取失敗：{exc}"})
        source_note = "官方注意股 / 處置股 adapter 完成；僅在 endpoint 設定後抓取公開資料，不假裝即時。"
        if not items:
            source_note += " 目前沒有回傳項目，可能是 endpoint 未設定、官方無資料或篩選 symbols 無命中。"
        return MarketWarningsPayload(items=items, providerStatus=status, sourceNote=source_note, generatedAt=now_iso())

    async def warnings_for_symbol(self, symbol: str) -> MarketWarningsPayload:
        return await self.warnings([symbol])

    async def _fetch_json_rows(self, url: str) -> list[dict[str, Any]]:
        timeout = self.settings.official_data_timeout_ms / 1000
        headers = {"user-agent": "QuantEventAlphaLabTaiwan/0.1 official metadata checker"}
        async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
            response = await client.get(url)
        response.raise_for_status()
        body = response.json()
        if isinstance(body, list):
            return [row for row in body if isinstance(row, dict)]
        if isinstance(body, dict):
            for key in ["data", "items", "result", "aaData"]:
                value = body.get(key)
                if isinstance(value, list):
                    return [row for row in value if isinstance(row, dict)]
        return []


def parse_warning_row(row: dict[str, Any], provider: str, market: str, warning_type: str, url: str) -> MarketWarningItem | None:
    symbol = first_string(row, ["Code", "SecuritiesCompanyCode", "stock_id", "stockNo", "stock_id_code", "證券代號", "有價證券代號", "代號"])
    if not symbol:
        symbol = extract_symbol_from_any_value(row)
    if not symbol:
        return None
    name = first_string(row, ["Name", "CompanyName", "stock_name", "stockName", "證券名稱", "有價證券名稱", "名稱"]) or security_name(symbol)
    reason = first_string(row, ["Reason", "AttentionReason", "DispositionReason", "處置原因", "注意原因", "原因", "Content", "說明"]) or "官方警示資料，請至來源查證細節。"
    effective_date = normalize_date(first_string(row, ["Date", "AnnounceDate", "StartDate", "effective_date", "生效日期", "公布日期", "日期"]))
    end_date = normalize_date(first_string(row, ["EndDate", "end_date", "迄日", "結束日期"]))
    severity = infer_severity(reason, warning_type)
    return MarketWarningItem(
        symbol=symbol,
        name=name,
        market=market,
        warningType=warning_type if warning_type in {"attention", "disposition"} else "unknown",
        reason=reason,
        severity=severity,
        effectiveDate=effective_date,
        endDate=end_date,
        provider=provider,
        dataSource="Official",
        sourceUrl=url,
        sourceNote="官方公開注意股 / 處置股資料；欄位依 endpoint 調整，請以交易所公告為準。",
        fetchedAt=now_iso(),
    )


def first_string(row: dict[str, Any], keys: list[str]) -> str | None:
    for key in keys:
        value = row.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def extract_symbol_from_any_value(row: dict[str, Any]) -> str | None:
    for value in row.values():
        text = str(value).strip()
        if len(text) >= 4 and text[:4].isdigit():
            return text[:4]
    return None


def normalize_date(value: str | None) -> str | None:
    if not value:
        return None
    text = value[:10].replace("/", "-").replace(".", "-")
    parts = text.split("-")
    if len(parts) >= 3 and parts[0].isdigit() and len(parts[0]) == 3:
        year = int(parts[0]) + 1911
        return f"{year:04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
    try:
        return datetime.fromisoformat(text).date().isoformat()
    except Exception:
        return value[:10]


def infer_severity(reason: str, warning_type: str) -> WarningSeverity:
    text = reason.lower()
    if warning_type == "disposition":
        if "延長" in reason or "加重" in reason or "再次" in reason:
            return "critical"
        return "high"
    if "處置" in reason or "分盤" in reason:
        return "high"
    if "注意" in reason or "警示" in reason or "異常" in reason:
        return "medium"
    if "risk" in text or "warning" in text:
        return "medium"
    return "low"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import time

from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.data_sources.base import ProviderUnavailable, UnsupportedInterval
from app.data_sources.demo_market import demo_bars, security_name
from app.data_sources.provider_registry import ProviderRegistry
from app.models.market import PriceBarModel
from app.quant.indicators import attach_indicators
from app.schemas.market import Interval, KLinePayload, PriceBar, ProviderKey, RangeKey


class KLineService:
    def __init__(self, registry: ProviderRegistry | None = None, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.registry = registry or ProviderRegistry(self.settings)
        self._cache: dict[tuple[str, str, str, str], tuple[float, KLinePayload]] = {}

    async def kline(
        self,
        symbol: str,
        interval: Interval = "1d",
        range_key: RangeKey = "1y",
        provider: ProviderKey = "auto",
        start_date: date | None = None,
        end_date: date | None = None,
        db: Session | None = None,
    ) -> KLinePayload:
        start, end = resolve_range(range_key, start_date, end_date)
        cache_key = (symbol, interval, start.isoformat(), end.isoformat())
        cached = self._cache.get(cache_key)
        if cached and (time.time() - cached[0]) < self.settings.market_data_cache_seconds:
            return cached[1]

        errors: list[str] = []
        for candidate in self.registry.quote_priority(provider):
            if not candidate.supports_interval(interval):
                errors.append(f"{candidate.provider_name}: 不支援 {interval}")
                continue
            try:
                bars = await candidate.get_kline(symbol, interval, start, end)
                if bars:
                    payload = self._build_payload(symbol, interval, range_key, bars, candidate.provider_name, candidate.data_source, candidate.is_realtime, candidate.delay_minutes, candidate.license_note)
                    self._cache[cache_key] = (time.time(), payload)
                    if db:
                        self._insert_bars(db, symbol, security_name(symbol), interval, payload.bars, payload.provider, payload.data_source, payload.is_realtime, payload.delay_minutes)
                    return payload
            except (ProviderUnavailable, UnsupportedInterval) as exc:
                errors.append(f"{candidate.provider_name}: {exc}")
            except Exception as exc:
                errors.append(f"{candidate.provider_name}: {exc}")

        bars = demo_bars(symbol, start, end, interval)
        payload = self._build_payload(symbol, interval, range_key, bars, "demo", "Demo", False, None, "示範 fallback，不是真實即時行情。")
        if errors:
            payload.license_note = "示範 fallback，不是真實即時行情。"
        self._cache[cache_key] = (time.time(), payload)
        if db:
            self._insert_bars(db, symbol, security_name(symbol), interval, payload.bars, payload.provider, payload.data_source, payload.is_realtime, payload.delay_minutes)
        return payload

    def _build_payload(
        self,
        symbol: str,
        interval: Interval,
        range_key: RangeKey,
        bars: list[PriceBar],
        provider: str,
        data_source: str,
        is_realtime: bool,
        delay_minutes: int | None,
        license_note: str,
    ) -> KLinePayload:
        dict_rows = [bar.model_dump(by_alias=True) for bar in bars]
        enriched, indicator_source = attach_indicators(dict_rows)
        return KLinePayload(
            symbol=symbol,
            name=security_name(symbol),
            interval=interval,
            range=range_key,
            bars=[PriceBar(**row) for row in enriched],
            provider=provider,
            dataSource=data_source,
            isRealtime=is_realtime,
            delayMinutes=delay_minutes,
            licenseNote=license_note,
            fetchedAt=datetime.now(timezone.utc).isoformat(),
            indicatorSource=indicator_source,
        )

    def _insert_bars(self, db: Session, symbol: str, name: str, interval: str, bars: list[PriceBar], provider: str, data_source: str, is_realtime: bool, delay_minutes: int | None) -> None:
        fetched_at = datetime.now(timezone.utc)
        for bar in bars:
            db.add(PriceBarModel(
                symbol=symbol,
                name=name,
                interval=interval,
                date_time=_parse_dt(bar.time),
                open=bar.open,
                high=bar.high,
                low=bar.low,
                close=bar.close,
                volume=bar.volume,
                value=bar.value,
                provider=provider,
                data_source=data_source,
                is_realtime=is_realtime,
                delay_minutes=delay_minutes,
                fetched_at=fetched_at,
            ))
        try:
            db.commit()
        except Exception:
            db.rollback()


def resolve_range(range_key: RangeKey, start_date: date | None = None, end_date: date | None = None) -> tuple[date, date]:
    end = end_date or date.today()
    if range_key == "custom":
        return start_date or (end - timedelta(days=365)), end
    days = {"1d": 1, "5d": 10, "1m": 31, "3m": 93, "6m": 186, "1y": 366, "3y": 366 * 3, "5y": 366 * 5}
    if range_key == "ytd":
        return date(end.year, 1, 1), end
    return end - timedelta(days=days.get(range_key, 366)), end


def _parse_dt(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)

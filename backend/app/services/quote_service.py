from __future__ import annotations

from datetime import datetime, timezone
import math
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.data_sources.base import ProviderUnavailable, UnsupportedInterval
from app.data_sources.demo_market import demo_quote
from app.data_sources.provider_registry import ProviderRegistry
from app.models.market import QuoteLatestModel
from app.schemas.market import ProviderKey, QuoteData

_SHARED_QUOTE_CACHE: dict[tuple[str, str], tuple[float, QuoteData]] = {}


class QuoteService:
    def __init__(self, registry: ProviderRegistry | None = None, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.registry = registry or ProviderRegistry(self.settings)
        self._cache = _SHARED_QUOTE_CACHE

    async def latest(self, symbol: str, provider: ProviderKey = "auto", db: Session | None = None) -> QuoteData:
        normalized = symbol.strip()
        errors: list[str] = []
        for candidate in self.registry.quote_priority(provider):
            key = (candidate.provider_name, normalized)
            cached = self._cache.get(key)
            if cached and (time.time() - cached[0]) < self.settings.quote_cache_seconds:
                return cached[1]
            try:
                quote = await candidate.get_latest_quote(normalized)
                if quote:
                    self._cache[key] = (time.time(), quote)
                    if db:
                        self._safe_upsert_quote(db, quote)
                    return quote
            except (ProviderUnavailable, UnsupportedInterval) as exc:
                errors.append(f"{candidate.provider_name}: {exc}")
            except Exception as exc:
                errors.append(f"{candidate.provider_name}: {exc}")
        quote = demo_quote(normalized)
        if errors:
            quote.source_note = "所有正式 provider 不可用，已使用示範 fallback。原因：" + "；".join(errors[:3])
        self._cache[("demo", normalized)] = (time.time(), quote)
        if db:
            self._safe_upsert_quote(db, quote)
        return quote

    async def batch_latest(self, symbols: list[str], provider: ProviderKey = "auto", db: Session | None = None) -> list[QuoteData]:
        return [await self.latest(symbol, provider, db) for symbol in symbols if symbol.strip()]

    def _safe_upsert_quote(self, db: Session, quote: QuoteData) -> None:
        try:
            self._upsert_quote(db, quote)
        except Exception:
            db.rollback()

    def _upsert_quote(self, db: Session, quote: QuoteData) -> None:
        price = _finite_float(quote.price)
        if price is None:
            raise ValueError(f"Invalid quote price for {quote.symbol}: {quote.price}")
        existing = db.scalar(select(QuoteLatestModel).where(
            QuoteLatestModel.symbol == quote.symbol,
            QuoteLatestModel.provider == quote.provider,
        ))
        quote_time = _parse_dt(quote.quote_time)
        fetched_at = _parse_dt(quote.fetched_at)
        if existing:
            existing.name = quote.name
            existing.price = price
            existing.previous_close = _finite_float(quote.previous_close)
            existing.change = _finite_float(quote.change)
            existing.change_percent = _finite_float(quote.change_percent)
            existing.open = _finite_float(quote.open)
            existing.high = _finite_float(quote.high)
            existing.low = _finite_float(quote.low)
            existing.volume = quote.volume
            existing.value = _finite_float(quote.value)
            existing.quote_time = quote_time
            existing.data_source = quote.data_source
            existing.is_realtime = quote.is_realtime
            existing.delay_minutes = quote.delay_minutes
            existing.license_note = quote.license_note
            existing.fetched_at = fetched_at
            existing.updated_at = datetime.now(timezone.utc)
        else:
            db.add(QuoteLatestModel(
                symbol=quote.symbol,
                name=quote.name,
                price=price,
                previous_close=_finite_float(quote.previous_close),
                change=_finite_float(quote.change),
                change_percent=_finite_float(quote.change_percent),
                open=_finite_float(quote.open),
                high=_finite_float(quote.high),
                low=_finite_float(quote.low),
                volume=quote.volume,
                value=_finite_float(quote.value),
                quote_time=quote_time,
                provider=quote.provider,
                data_source=quote.data_source,
                is_realtime=quote.is_realtime,
                delay_minutes=quote.delay_minutes,
                license_note=quote.license_note,
                fetched_at=fetched_at,
            ))
        db.commit()


def clear_quote_cache() -> None:
    _SHARED_QUOTE_CACHE.clear()


def _finite_float(value: float | int | None) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _parse_dt(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class SecurityModel(Base):
    __tablename__ = "securities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True, unique=True)
    name: Mapped[str] = mapped_column(String(80))
    market: Mapped[str] = mapped_column(String(24), default="Unknown")
    asset_type: Mapped[str] = mapped_column(String(24), default="stock")
    industry: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source_name: Mapped[str] = mapped_column(String(80), default="Demo")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class QuoteLatestModel(Base):
    __tablename__ = "quotes_latest"
    __table_args__ = (UniqueConstraint("symbol", "provider", name="uq_quotes_latest_symbol_provider"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(80))
    price: Mapped[float] = mapped_column(Float)
    previous_close: Mapped[float | None] = mapped_column(Float, nullable=True)
    change: Mapped[float | None] = mapped_column(Float, nullable=True)
    change_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    open: Mapped[float | None] = mapped_column(Float, nullable=True)
    high: Mapped[float | None] = mapped_column(Float, nullable=True)
    low: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume: Mapped[int | None] = mapped_column(Integer, nullable=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    quote_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    provider: Mapped[str] = mapped_column(String(40))
    data_source: Mapped[str] = mapped_column(String(40))
    is_realtime: Mapped[bool] = mapped_column(Boolean, default=False)
    delay_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    license_note: Mapped[str] = mapped_column(String(240))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class PriceBarModel(Base):
    __tablename__ = "price_bars"
    __table_args__ = (UniqueConstraint("symbol", "interval", "date_time", "provider", name="uq_price_bars_symbol_interval_time_provider"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(80))
    interval: Mapped[str] = mapped_column(String(8), index=True)
    date_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    open: Mapped[float] = mapped_column(Float)
    high: Mapped[float] = mapped_column(Float)
    low: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    volume: Mapped[int] = mapped_column(Integer)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    provider: Mapped[str] = mapped_column(String(40))
    data_source: Mapped[str] = mapped_column(String(40))
    is_realtime: Mapped[bool] = mapped_column(Boolean, default=False)
    delay_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class FactorScoreModel(Base):
    __tablename__ = "factor_scores"
    __table_args__ = (UniqueConstraint("symbol", "score_date", "model_version", name="uq_factor_scores_symbol_date_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(80))
    score_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    model_version: Mapped[str] = mapped_column(String(40), default="quant-v1")
    quant_score: Mapped[float] = mapped_column(Float)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentile: Mapped[float | None] = mapped_column(Float, nullable=True)
    trend_score: Mapped[float] = mapped_column(Float)
    momentum_score: Mapped[float] = mapped_column(Float)
    volatility_score: Mapped[float] = mapped_column(Float)
    rsi_score: Mapped[float] = mapped_column(Float)
    ma_structure_score: Mapped[float] = mapped_column(Float)
    volume_score: Mapped[float] = mapped_column(Float)
    overheat_penalty: Mapped[float] = mapped_column(Float)
    data_quality_penalty: Mapped[float] = mapped_column(Float)
    provider: Mapped[str] = mapped_column(String(40))
    data_source: Mapped[str] = mapped_column(String(40))
    warnings_json: Mapped[str] = mapped_column(Text, default="[]")
    explanation: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class EventStudyResultModel(Base):
    __tablename__ = "event_study_results"
    __table_args__ = (UniqueConstraint("event_id", "symbol", "model_version", name="uq_event_study_event_symbol_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[str] = mapped_column(String(120), index=True)
    symbol: Mapped[str] = mapped_column(String(16), index=True)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    model_version: Mapped[str] = mapped_column(String(40), default="event-study-v1")
    pre_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    post_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    abnormal_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[float | None] = mapped_column(Float, nullable=True)
    hit: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    sample_size: Mapped[int] = mapped_column(Integer, default=0)
    source_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class DataQualityReportModel(Base):
    __tablename__ = "data_quality_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset: Mapped[str] = mapped_column(String(80), index=True)
    provider: Mapped[str] = mapped_column(String(80), index=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
    records_checked: Mapped[int] = mapped_column(Integer, default=0)
    missing_rate: Mapped[float] = mapped_column(Float, default=0)
    stale_rate: Mapped[float] = mapped_column(Float, default=0)
    error_rate: Mapped[float] = mapped_column(Float, default=0)
    score: Mapped[float] = mapped_column(Float, default=0)
    warning: Mapped[str | None] = mapped_column(Text, nullable=True)


class QuantJobRunModel(Base):
    __tablename__ = "quant_job_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_name: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(24), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    records_processed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_json: Mapped[str] = mapped_column(Text, default="{}")

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class IntelligenceItemModel(Base):
    __tablename__ = "intelligence_items"
    __table_args__ = (UniqueConstraint("source_url", "title", name="uq_intelligence_source_title"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_name: Mapped[str] = mapped_column(String(80), index=True)
    source_type: Mapped[str] = mapped_column(String(40), default="metadata", index=True)
    source_url: Mapped[str] = mapped_column(String(500), index=True)
    title: Mapped[str] = mapped_column(String(300))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
    symbols_json: Mapped[str] = mapped_column(Text, default="[]")
    themes_json: Mapped[str] = mapped_column(Text, default="[]")
    event_type: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    confidence: Mapped[float] = mapped_column(Float, default=50)
    relevance_score: Mapped[float] = mapped_column(Float, default=50)
    summary_snippet: Mapped[str] = mapped_column(Text, default="")
    raw_metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    content_hash: Mapped[str] = mapped_column(String(80), default="")
    copyright_note: Mapped[str] = mapped_column(Text, default="Metadata only; do not store copyrighted full text.")


class CrawlRunModel(Base):
    __tablename__ = "crawl_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_type: Mapped[str] = mapped_column(String(60), index=True)
    status: Mapped[str] = mapped_column(String(24), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pages_attempted: Mapped[int] = mapped_column(Integer, default=0)
    items_found: Mapped[int] = mapped_column(Integer, default=0)
    items_saved: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_json: Mapped[str] = mapped_column(Text, default="{}")

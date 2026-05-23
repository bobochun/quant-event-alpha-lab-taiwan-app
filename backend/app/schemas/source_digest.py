from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class SourceDigestItem(CamelModel):
    id: int | None = None
    source_name: str = Field(alias="sourceName")
    source_type: str = Field(alias="sourceType")
    source_url: str = Field(alias="sourceUrl")
    title: str
    published_at: str | None = Field(None, alias="publishedAt")
    fetched_at: str = Field(alias="fetchedAt")
    symbols: list[str]
    themes: list[str]
    event_type: str | None = Field(None, alias="eventType")
    confidence: float
    relevance_score: float = Field(alias="relevanceScore")
    summary_snippet: str = Field(alias="summarySnippet")
    copyright_note: str = Field(alias="copyrightNote")


class SourceDigestRequest(CamelModel):
    symbols: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    source_set: Literal["official", "public", "all"] = Field("official", alias="sourceSet")
    max_pages: int = Field(8, ge=1, le=30, alias="maxPages")
    persist: bool = True


class SourceDigestStatus(CamelModel):
    source_name: str = Field(alias="sourceName")
    status: Literal["ok", "disabled", "skipped", "error"]
    allowed: bool
    attempted: int
    found: int
    saved: int
    message: str


class SourceDigestResult(CamelModel):
    ok: bool
    source_set: str = Field(alias="sourceSet")
    items: list[SourceDigestItem]
    sources: list[SourceDigestStatus]
    warnings: list[str]
    generated_at: str = Field(alias="generatedAt")


class SourceDigestQueryResult(CamelModel):
    items: list[SourceDigestItem]
    warnings: list[str]
    generated_at: str = Field(alias="generatedAt")

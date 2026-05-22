from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AIEvidence(CamelModel):
    source_url: str = Field(alias="sourceUrl")
    source_title: str = Field(alias="sourceTitle")
    published_at: str | None = Field(None, alias="publishedAt")
    evidence_snippet: str = Field(alias="evidenceSnippet")
    source_type: str = Field("metadata", alias="sourceType")


class AIEventFactor(CamelModel):
    symbol: str
    event_type: str = Field(alias="eventType")
    event_date: str | None = Field(None, alias="eventDate")
    related_themes: list[str] = Field(alias="relatedThemes")
    event_novelty_score: float = Field(alias="eventNoveltyScore")
    surprise_potential_score: float = Field(alias="surprisePotentialScore")
    market_awareness_score: float = Field(alias="marketAwarenessScore")
    source_credibility_score: float = Field(alias="sourceCredibilityScore")
    theme_relevance_score: float = Field(alias="themeRelevanceScore")
    risk_flag_penalty: float = Field(alias="riskFlagPenalty")
    ai_information_score: float = Field(alias="aiInformationScore")
    confidence: float
    risk_flags: list[str] = Field(alias="riskFlags")
    warnings: list[str]
    evidence: list[AIEvidence]
    extraction_method: Literal["openai", "ruleFallback"] = Field(alias="extractionMethod")
    schema_version: str = Field(alias="schemaVersion")
    should_include_in_alpha: bool = Field(False, alias="shouldIncludeInAlpha")
    explanation: str


class AISourceDigestInput(CamelModel):
    symbols: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    max_items: int = Field(10, ge=1, le=50, alias="maxItems")


class AIExtractTextInput(CamelModel):
    text: str
    source_url: str = Field("manual://input", alias="sourceUrl")
    source_title: str = Field("Manual input", alias="sourceTitle")
    published_at: str | None = Field(None, alias="publishedAt")
    symbols: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)


class AIAnalysisResult(CamelModel):
    ok: bool
    enabled: bool
    model: str
    factors: list[AIEventFactor]
    warnings: list[str]
    generated_at: str = Field(alias="generatedAt")


class AIStatus(CamelModel):
    enabled: bool
    has_api_key: bool = Field(alias="hasApiKey")
    model: str
    score_in_alpha: bool = Field(alias="scoreInAlpha")
    schema_version: str = Field(alias="schemaVersion")
    fallback_available: bool = Field(True, alias="fallbackAvailable")
    note: str

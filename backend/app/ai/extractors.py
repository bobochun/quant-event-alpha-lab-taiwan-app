from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ai.llm_client import AIQuantClient
from app.ai.schemas import AIAnalysisResult, AIExtractTextInput, AISourceDigestInput, AIStatus
from app.ai.scoring import recompute_ai_information_score
from app.ai.validators import validate_factor
from app.core.config import Settings, get_settings
from app.schemas.source_digest import SourceDigestRequest
from app.services.source_digest_service import SourceDigestService


class AIQuantService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.client = AIQuantClient(self.settings)
        self.source_digest = SourceDigestService(self.settings)

    def status(self) -> AIStatus:
        return AIStatus(
            enabled=self.settings.enable_ai_quant,
            hasApiKey=bool(self.settings.openai_api_key.strip()),
            model=self.settings.openai_model,
            scoreInAlpha=self.settings.enable_ai_score_in_alpha,
            schemaVersion=self.settings.ai_schema_version,
            fallbackAvailable=True,
            note="OpenAI API is used only when ENABLE_AI_QUANT=true and OPENAI_API_KEY is set; otherwise rule-based fallback is used.",
        )

    async def analyze_text(self, request: AIExtractTextInput) -> AIAnalysisResult:
        factor = await self.client.extract_event_factor(
            text=request.text,
            source_url=request.source_url,
            source_title=request.source_title,
            symbols=request.symbols,
            themes=request.themes,
            published_at=request.published_at,
        )
        factor = validate_factor(recompute_ai_information_score(factor))
        return AIAnalysisResult(
            ok=True,
            enabled=self.settings.enable_ai_quant,
            model=self.settings.openai_model if self.settings.ai_enabled_with_key else "rule-based-fallback",
            factors=[factor],
            warnings=self._global_warnings(),
            generatedAt=datetime.now(timezone.utc).isoformat(),
        )

    async def analyze_source_digest(self, request: AISourceDigestInput, db: Session | None = None) -> AIAnalysisResult:
        digest = await self.source_digest.collect(
            SourceDigestRequest(symbols=request.symbols, themes=request.themes, sourceSet="official", maxPages=min(request.max_items, self.settings.ai_max_items_per_run), persist=True),
            db,
        )
        factors = []
        for item in digest.items[: self.settings.ai_max_items_per_run]:
            text = f"{item.title}\n{item.summary_snippet}\nThemes: {', '.join(item.themes)}\nSymbols: {', '.join(item.symbols)}"
            factor = await self.client.extract_event_factor(
                text=text,
                source_url=item.source_url,
                source_title=item.title,
                symbols=item.symbols or request.symbols,
                themes=item.themes or request.themes,
                published_at=item.published_at,
            )
            factors.append(validate_factor(recompute_ai_information_score(factor)))
        return AIAnalysisResult(
            ok=True,
            enabled=self.settings.enable_ai_quant,
            model=self.settings.openai_model if self.settings.ai_enabled_with_key else "rule-based-fallback",
            factors=factors,
            warnings=[*self._global_warnings(), *digest.warnings],
            generatedAt=datetime.now(timezone.utc).isoformat(),
        )

    def _global_warnings(self) -> list[str]:
        warnings: list[str] = []
        if not self.settings.enable_ai_quant:
            warnings.append("ENABLE_AI_QUANT=false; rule-based fallback is used.")
        elif not self.settings.openai_api_key.strip():
            warnings.append("OPENAI_API_KEY is not set; rule-based fallback is used.")
        if not self.settings.enable_ai_score_in_alpha:
            warnings.append("ENABLE_AI_SCORE_IN_ALPHA=false; AI factors are display-only and not included in final alpha score.")
        warnings.append("AI factors are research signals only, not investment advice or buy/sell recommendations.")
        return warnings

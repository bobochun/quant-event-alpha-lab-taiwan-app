from __future__ import annotations

import json
from typing import Any

import httpx

from app.ai.fallback_rules import extract_rule_based_factor
from app.ai.schemas import AIEventFactor
from app.core.config import Settings, get_settings

AI_FACTOR_JSON_SCHEMA: dict[str, Any] = {
    "name": "ai_quant_event_factor",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "symbol": {"type": "string"},
            "eventType": {"type": "string"},
            "eventDate": {"type": ["string", "null"]},
            "relatedThemes": {"type": "array", "items": {"type": "string"}},
            "eventNoveltyScore": {"type": "number", "minimum": 0, "maximum": 100},
            "surprisePotentialScore": {"type": "number", "minimum": 0, "maximum": 100},
            "marketAwarenessScore": {"type": "number", "minimum": 0, "maximum": 100},
            "sourceCredibilityScore": {"type": "number", "minimum": 0, "maximum": 100},
            "themeRelevanceScore": {"type": "number", "minimum": 0, "maximum": 100},
            "riskFlagPenalty": {"type": "number", "minimum": 0, "maximum": 100},
            "aiInformationScore": {"type": "number", "minimum": 0, "maximum": 100},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "riskFlags": {"type": "array", "items": {"type": "string"}},
            "warnings": {"type": "array", "items": {"type": "string"}},
            "explanation": {"type": "string"}
        },
        "required": ["symbol", "eventType", "eventDate", "relatedThemes", "eventNoveltyScore", "surprisePotentialScore", "marketAwarenessScore", "sourceCredibilityScore", "themeRelevanceScore", "riskFlagPenalty", "aiInformationScore", "confidence", "riskFlags", "warnings", "explanation"]
    },
    "strict": True,
}


class AIQuantClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def extract_event_factor(
        self,
        text: str,
        source_url: str,
        source_title: str,
        symbols: list[str],
        themes: list[str],
        published_at: str | None = None,
    ) -> AIEventFactor:
        if not self.settings.ai_enabled_with_key:
            return extract_rule_based_factor(text, source_url, source_title, symbols, themes, self.settings, published_at)
        try:
            payload = await self._call_openai(text, source_url, source_title, symbols, themes, published_at)
            factor = AIEventFactor(
                symbol=str(payload.get("symbol") or (symbols[0] if symbols else "UNKNOWN")),
                eventType=str(payload.get("eventType") or "other"),
                eventDate=payload.get("eventDate"),
                relatedThemes=list(payload.get("relatedThemes") or themes or ["Market Watch"]),
                eventNoveltyScore=float(payload.get("eventNoveltyScore", 50)),
                surprisePotentialScore=float(payload.get("surprisePotentialScore", 50)),
                marketAwarenessScore=float(payload.get("marketAwarenessScore", 60)),
                sourceCredibilityScore=float(payload.get("sourceCredibilityScore", 60)),
                themeRelevanceScore=float(payload.get("themeRelevanceScore", 50)),
                riskFlagPenalty=float(payload.get("riskFlagPenalty", 0)),
                aiInformationScore=float(payload.get("aiInformationScore", 50)),
                confidence=float(payload.get("confidence", 0.5)),
                riskFlags=list(payload.get("riskFlags") or []),
                warnings=[*list(payload.get("warnings") or []), "AI factor is research-only and not a buy/sell recommendation."],
                evidence=[{
                    "sourceUrl": source_url,
                    "sourceTitle": source_title,
                    "publishedAt": published_at,
                    "evidenceSnippet": text[:240],
                    "sourceType": "metadata",
                }],
                extractionMethod="openai",
                schemaVersion=self.settings.ai_schema_version,
                shouldIncludeInAlpha=self.settings.enable_ai_score_in_alpha,
                explanation=str(payload.get("explanation") or "OpenAI structured extraction completed."),
            )
            return factor
        except Exception as exc:
            fallback = extract_rule_based_factor(text, source_url, source_title, symbols, themes, self.settings, published_at)
            fallback.warnings.append(f"OpenAI extraction failed, fallback used: {exc}")
            return fallback

    async def _call_openai(
        self,
        text: str,
        source_url: str,
        source_title: str,
        symbols: list[str],
        themes: list[str],
        published_at: str | None,
    ) -> dict[str, Any]:
        system = (
            "You are an AI quant research extractor for Taiwan equities. "
            "Convert source metadata into structured research factors. "
            "Do not provide buy/sell advice. Do not invent unavailable facts. "
            "Scores must be 0-100 except confidence 0-1."
        )
        user = {
            "sourceUrl": source_url,
            "sourceTitle": source_title,
            "publishedAt": published_at,
            "symbols": symbols,
            "themes": themes,
            "text": text[:4000],
            "instructions": "Extract event factors, market awareness, risk flags, and AI information score. Keep output JSON only. Do not recommend trades.",
        }
        request_body = {
            "model": self.settings.openai_model,
            "input": [
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": AI_FACTOR_JSON_SCHEMA["name"],
                    "schema": AI_FACTOR_JSON_SCHEMA["schema"],
                    "strict": True,
                }
            },
        }
        async with httpx.AsyncClient(timeout=self.settings.ai_request_timeout_ms / 1000) as client:
            response = await client.post(
                f"{self.settings.openai_base_url.rstrip('/')}/responses",
                headers={"Authorization": f"Bearer {self.settings.openai_api_key}", "Content-Type": "application/json"},
                json=request_body,
            )
        response.raise_for_status()
        data = response.json()
        output_text = extract_response_text(data)
        return json.loads(output_text)


def extract_response_text(data: dict[str, Any]) -> str:
    if isinstance(data.get("output_text"), str):
        return data["output_text"]
    for item in data.get("output", []) or []:
        for content in item.get("content", []) or []:
            if content.get("type") in {"output_text", "text"} and isinstance(content.get("text"), str):
                return content["text"]
    raise RuntimeError("OpenAI response did not include output text.")

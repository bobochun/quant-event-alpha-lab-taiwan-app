from __future__ import annotations

from app.ai.schemas import AIEventFactor


def recompute_ai_information_score(factor: AIEventFactor) -> AIEventFactor:
    raw = (
        factor.event_novelty_score * 0.18
        + factor.surprise_potential_score * 0.22
        + (100 - factor.market_awareness_score) * 0.16
        + factor.source_credibility_score * 0.18
        + factor.theme_relevance_score * 0.18
        - factor.risk_flag_penalty * 0.08
    )
    confidence_penalty = max(0, (0.65 - factor.confidence) * 35)
    score = max(0, min(100, raw - confidence_penalty))
    factor.ai_information_score = round(score, 2)
    return factor


def alpha_inclusion_note(factor: AIEventFactor) -> str:
    if not factor.should_include_in_alpha:
        return "Display-only AI factor; not included in final alpha score."
    return "AI factor is eligible for alpha integration, but only if ENABLE_AI_SCORE_IN_ALPHA=true and backtest validation passes."

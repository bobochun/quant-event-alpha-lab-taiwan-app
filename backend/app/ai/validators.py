from __future__ import annotations

from app.ai.schemas import AIEventFactor

VALID_EVENT_TYPES = {
    "investorConference", "exDividend", "monthlyRevenue", "earnings", "foreignBrokerReport", "majorHolderChange", "etfRebalance", "attentionStock", "dispositionStock", "shareholderMeetingGift", "productLaunch", "aiServerNews", "semiconductorNews", "industryConference", "policy", "orderContract", "buyback", "capitalIncrease", "convertibleBond", "mergerAcquisition", "supplyChainNews", "other"
}


def validate_factor(factor: AIEventFactor) -> AIEventFactor:
    warnings = list(factor.warnings)
    if factor.symbol == "UNKNOWN" or not factor.symbol.strip():
        warnings.append("AI validation: missing symbol; factor cannot be included in alpha.")
        factor.should_include_in_alpha = False
    if factor.event_type not in VALID_EVENT_TYPES:
        warnings.append(f"AI validation: unknown eventType {factor.event_type}; normalized to other.")
        factor.event_type = "other"
    if factor.confidence < 0.55:
        warnings.append("AI validation: confidence below 0.55; display only.")
        factor.should_include_in_alpha = False
    if not factor.evidence:
        warnings.append("AI validation: missing evidence; display only.")
        factor.should_include_in_alpha = False
    if factor.market_awareness_score >= 85:
        warnings.append("AI validation: market awareness is high; priced-in risk should be checked.")
    if factor.risk_flag_penalty >= 25:
        warnings.append("AI validation: risk penalty is high; do not include in final alpha without manual review.")
        factor.should_include_in_alpha = False
    factor.warnings = dedupe(warnings)
    return factor


def dedupe(items: list[str]) -> list[str]:
    return list(dict.fromkeys(items))

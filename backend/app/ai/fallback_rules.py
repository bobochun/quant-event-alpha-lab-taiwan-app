from __future__ import annotations

from datetime import datetime, timezone
import re

from app.ai.schemas import AIEvidence, AIEventFactor
from app.core.config import Settings, get_settings

THEME_KEYWORDS: dict[str, list[str]] = {
    "AI server": ["AI", "server", "伺服器", "GB200", "GB300", "AI伺服器"],
    "CoWoS": ["CoWoS", "先進封裝", "advanced packaging"],
    "HBM": ["HBM", "高頻寬記憶體"],
    "PCB": ["PCB", "印刷電路板", "CCL"],
    "Thermal": ["散熱", "水冷", "thermal", "cooling"],
    "Semiconductor": ["半導體", "晶圓", "foundry", "晶片"],
    "Shipping": ["航運", "運價", "貨櫃", "散裝"],
    "Financial": ["金控", "銀行", "保險"],
}

EVENT_KEYWORDS: list[tuple[str, list[str]]] = [
    ("monthlyRevenue", ["月營收", "營收", "revenue"]),
    ("earnings", ["財報", "EPS", "獲利", "earnings"]),
    ("investorConference", ["法說", "法說會", "investor conference"]),
    ("exDividend", ["除息", "除權", "股利", "dividend"]),
    ("orderContract", ["訂單", "合約", "order", "contract"]),
    ("productLaunch", ["新品", "發表", "launch"]),
    ("attentionStock", ["注意股", "注意交易"]),
    ("dispositionStock", ["處置股", "處置交易"]),
]

RISK_KEYWORDS: list[tuple[str, float]] = [
    ("市場可能已高度關注或已反應", 12),
    ("傳聞或來源未明", 10),
    ("注意股 / 處置股風險", 14),
    ("法說會前可能已過熱", 8),
]


def extract_rule_based_factor(
    text: str,
    source_url: str,
    source_title: str,
    symbols: list[str],
    themes: list[str],
    settings: Settings | None = None,
    published_at: str | None = None,
) -> AIEventFactor:
    settings = settings or get_settings()
    text_l = text.lower()
    detected_symbol = symbols[0] if symbols else detect_symbol(text) or "UNKNOWN"
    detected_themes = sorted(set(themes + detect_themes(text))) or ["Market Watch"]
    event_type = detect_event_type(text)
    novelty = 55 + (8 if "首次" in text or "first" in text_l else 0) - (8 if "再度" in text or "重申" in text else 0)
    surprise = 55 + (12 if any(word in text for word in ["優於", "創高", "上修", "大幅"]) else 0) - (10 if any(word in text for word in ["低於", "下修", "衰退"]) else 0)
    awareness = 65 + (12 if any(word in text for word in ["熱門", "市場關注", "多家", "媒體"] ) else 0)
    credibility = 82 if "twse" in source_url or "tpex" in source_url or "mops" in source_url else 62
    theme_relevance = min(90, 45 + len(detected_themes) * 12)
    risk_flags = detect_risk_flags(text)
    penalty = min(35, len(risk_flags) * 8)
    ai_score = clamp(novelty * 0.18 + surprise * 0.22 + (100 - awareness) * 0.16 + credibility * 0.18 + theme_relevance * 0.18 - penalty * 0.08)
    warnings = ["Rule-based fallback used; set OPENAI_API_KEY and ENABLE_AI_QUANT=true for LLM extraction."]
    if detected_symbol == "UNKNOWN":
        warnings.append("未偵測到明確股票代號，AI factor 不應納入 alpha score。")
    return AIEventFactor(
        symbol=detected_symbol,
        eventType=event_type,
        eventDate=detect_date(text),
        relatedThemes=detected_themes,
        eventNoveltyScore=round(clamp(novelty), 2),
        surprisePotentialScore=round(clamp(surprise), 2),
        marketAwarenessScore=round(clamp(awareness), 2),
        sourceCredibilityScore=round(clamp(credibility), 2),
        themeRelevanceScore=round(clamp(theme_relevance), 2),
        riskFlagPenalty=round(clamp(penalty), 2),
        aiInformationScore=round(clamp(ai_score), 2),
        confidence=0.48 if detected_symbol == "UNKNOWN" else 0.62,
        riskFlags=risk_flags,
        warnings=warnings,
        evidence=[AIEvidence(sourceUrl=source_url, sourceTitle=source_title, publishedAt=published_at, evidenceSnippet=text[:240], sourceType="metadata")],
        extractionMethod="ruleFallback",
        schemaVersion=settings.ai_schema_version,
        shouldIncludeInAlpha=False,
        explanation="Rule-based extraction converts source metadata into research factors only; it does not produce buy/sell advice.",
    )


def detect_symbol(text: str) -> str | None:
    match = re.search(r"\b\d{4}\b", text)
    return match.group(0) if match else None


def detect_themes(text: str) -> list[str]:
    output: list[str] = []
    text_l = text.lower()
    for theme, keywords in THEME_KEYWORDS.items():
        if any(keyword.lower() in text_l for keyword in keywords):
            output.append(theme)
    return output


def detect_event_type(text: str) -> str:
    text_l = text.lower()
    for event_type, keywords in EVENT_KEYWORDS:
        if any(keyword.lower() in text_l for keyword in keywords):
            return event_type
    return "other"


def detect_date(text: str) -> str | None:
    match = re.search(r"(20\d{2})[-/](\d{1,2})[-/](\d{1,2})", text)
    if not match:
        return None
    year, month, day = match.groups()
    return f"{year}-{int(month):02d}-{int(day):02d}"


def detect_risk_flags(text: str) -> list[str]:
    flags: list[str] = []
    if any(word in text for word in ["傳聞", "未證實", "市場傳出"]):
        flags.append("傳聞或來源未明")
    if any(word in text for word in ["注意股", "處置股", "處置交易"]):
        flags.append("注意股 / 處置股風險")
    if any(word in text for word in ["熱門", "多家媒體", "市場關注", "已反應"]):
        flags.append("市場可能已高度關注或已反應")
    if any(word in text for word in ["法說會前", "財報前"]):
        flags.append("法說會前可能已過熱")
    return flags


def clamp(value: float) -> float:
    return max(0, min(100, value))

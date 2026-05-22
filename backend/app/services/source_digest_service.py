from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from urllib.parse import urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.intelligence import IntelligenceItemModel
from app.schemas.source_digest import SourceDigestItem, SourceDigestRequest, SourceDigestResult, SourceDigestStatus

OFFICIAL_SEEDS = [
    {
        "sourceName": "TWSE OpenAPI",
        "sourceType": "official-api-index",
        "sourceUrl": "https://openapi.twse.com.tw/v1/",
        "title": "TWSE OpenAPI 官方公開資料索引",
        "eventType": "other",
        "themes": ["Official Data"],
    },
    {
        "sourceName": "TPEx OpenAPI",
        "sourceType": "official-api-index",
        "sourceUrl": "https://www.tpex.org.tw/openapi/",
        "title": "TPEx OpenAPI 官方公開資料索引",
        "eventType": "other",
        "themes": ["Official Data"],
    },
    {
        "sourceName": "MOPS Metadata",
        "sourceType": "official-metadata",
        "sourceUrl": "https://mops.twse.com.tw/",
        "title": "公開資訊觀測站事件 metadata 入口",
        "eventType": "other",
        "themes": ["MOPS", "Official Data"],
    },
]

PUBLIC_SEEDS = [
    {
        "sourceName": "FinMind API Docs",
        "sourceType": "api-docs",
        "sourceUrl": "https://finmindtrade.com/analysis/#/data/api",
        "title": "FinMind 台股資料 API 文件與 dataset metadata",
        "eventType": "other",
        "themes": ["FinMind", "Official-like Data"],
    },
]

SYMBOL_THEME_HINTS = {
    "2330": ["AI server", "CoWoS", "Semiconductor"],
    "2382": ["AI server"],
    "2317": ["AI server", "EV"],
    "3017": ["Thermal", "AI server"],
    "3037": ["PCB", "AI server"],
    "2603": ["Shipping"],
    "2615": ["Shipping"],
}


class SourceDigestService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def collect(self, request: SourceDigestRequest, db: Session | None = None) -> SourceDigestResult:
        seeds = OFFICIAL_SEEDS.copy()
        if request.source_set in {"public", "all"}:
            seeds.extend(PUBLIC_SEEDS)
        seeds = seeds[: min(request.max_pages, self.settings.crawler_max_pages_per_run)]
        warnings: list[str] = []
        statuses: list[SourceDigestStatus] = []
        items: list[SourceDigestItem] = []
        if request.source_set in {"public", "all"} and not self.settings.enable_public_web_crawler:
            warnings.append("Public source digest is disabled by ENABLE_PUBLIC_WEB_CRAWLER=false; only safe official metadata seeds are used.")
        for seed in seeds:
            allowed = self._allowed(seed["sourceUrl"])
            if not allowed:
                statuses.append(SourceDigestStatus(sourceName=seed["sourceName"], status="skipped", allowed=False, attempted=0, found=0, saved=0, message="Domain is not in CRAWLER_ALLOWED_DOMAINS."))
                continue
            if seed in PUBLIC_SEEDS and not self.settings.enable_public_web_crawler:
                statuses.append(SourceDigestStatus(sourceName=seed["sourceName"], status="disabled", allowed=True, attempted=0, found=0, saved=0, message="Public digest disabled; set ENABLE_PUBLIC_WEB_CRAWLER=true to include this source."))
                continue
            item = await self._build_item(seed, request.symbols, request.themes)
            saved = 0
            if request.persist and db:
                saved = self._save_item(item, db)
            items.append(item)
            statuses.append(SourceDigestStatus(sourceName=seed["sourceName"], status="ok", allowed=True, attempted=1, found=1, saved=saved, message="Metadata seed collected. Full copyrighted content is not stored."))
        return SourceDigestResult(ok=True, sourceSet=request.source_set, items=items, sources=statuses, warnings=warnings, generatedAt=datetime.now(timezone.utc).isoformat())

    async def query(self, symbols: list[str] | None = None, themes: list[str] | None = None, limit: int = 50, db: Session | None = None):
        if not db:
            return []
        stmt = select(IntelligenceItemModel).order_by(IntelligenceItemModel.fetched_at.desc()).limit(limit)
        rows = list(db.scalars(stmt))
        items = [self._model_to_item(row) for row in rows]
        if symbols:
            wanted = set(symbols)
            items = [item for item in items if wanted.intersection(item.symbols)]
        if themes:
            wanted_themes = {theme.lower() for theme in themes}
            items = [item for item in items if wanted_themes.intersection({theme.lower() for theme in item.themes})]
        return items

    async def probe_url(self, url: str) -> tuple[bool, str]:
        if not self._allowed(url):
            return False, "URL domain is not in allowlist."
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            return False, "Only http/https URLs are supported."
        try:
            async with httpx.AsyncClient(timeout=self.settings.crawler_timeout_ms / 1000, headers={"User-Agent": self.settings.crawler_user_agent}) as client:
                response = await client.head(url, follow_redirects=True)
            if response.status_code >= 400:
                return False, f"HEAD returned HTTP {response.status_code}."
            content_type = response.headers.get("content-type", "")
            return True, f"Reachable metadata source; content-type={content_type or 'unknown'}."
        except Exception as exc:
            return False, str(exc)

    async def _build_item(self, seed: dict, symbols: list[str], themes: list[str]) -> SourceDigestItem:
        now = datetime.now(timezone.utc).isoformat()
        related_themes = list(dict.fromkeys([*seed.get("themes", []), *themes, *themes_from_symbols(symbols)]))
        summary = f"{seed['sourceName']} metadata entry for research source tracking. This stores title/link/time only, not full article/report content."
        return SourceDigestItem(
            sourceName=seed["sourceName"],
            sourceType=seed["sourceType"],
            sourceUrl=seed["sourceUrl"],
            title=seed["title"],
            publishedAt=None,
            fetchedAt=now,
            symbols=symbols,
            themes=related_themes,
            eventType=seed.get("eventType"),
            confidence=70 if "Official" in seed["sourceName"] or seed["sourceName"].startswith(("TWSE", "TPEx")) else 55,
            relevanceScore=60,
            summarySnippet=summary,
            copyrightNote="Metadata only; do not store copyrighted full text.",
        )

    def _save_item(self, item: SourceDigestItem, db: Session) -> int:
        content_hash = hashlib.sha256(f"{item.source_url}|{item.title}".encode("utf-8")).hexdigest()[:32]
        existing = db.scalar(select(IntelligenceItemModel).where(IntelligenceItemModel.source_url == item.source_url, IntelligenceItemModel.title == item.title))
        if existing:
            existing.fetched_at = parse_dt(item.fetched_at)
            existing.symbols_json = json.dumps(item.symbols, ensure_ascii=False)
            existing.themes_json = json.dumps(item.themes, ensure_ascii=False)
            existing.summary_snippet = item.summary_snippet
            db.commit()
            return 0
        db.add(IntelligenceItemModel(
            source_name=item.source_name,
            source_type=item.source_type,
            source_url=item.source_url,
            title=item.title,
            published_at=parse_dt(item.published_at) if item.published_at else None,
            fetched_at=parse_dt(item.fetched_at),
            symbols_json=json.dumps(item.symbols, ensure_ascii=False),
            themes_json=json.dumps(item.themes, ensure_ascii=False),
            event_type=item.event_type,
            confidence=item.confidence,
            relevance_score=item.relevance_score,
            summary_snippet=item.summary_snippet,
            raw_metadata_json=json.dumps({"sourceName": item.source_name, "sourceType": item.source_type}, ensure_ascii=False),
            content_hash=content_hash,
            copyright_note=item.copyright_note,
        ))
        try:
            db.commit()
            return 1
        except Exception:
            db.rollback()
            return 0

    def _model_to_item(self, row: IntelligenceItemModel) -> SourceDigestItem:
        return SourceDigestItem(
            id=row.id,
            sourceName=row.source_name,
            sourceType=row.source_type,
            sourceUrl=row.source_url,
            title=row.title,
            publishedAt=row.published_at.isoformat() if row.published_at else None,
            fetchedAt=row.fetched_at.isoformat(),
            symbols=json.loads(row.symbols_json or "[]"),
            themes=json.loads(row.themes_json or "[]"),
            eventType=row.event_type,
            confidence=row.confidence,
            relevanceScore=row.relevance_score,
            summarySnippet=row.summary_snippet,
            copyrightNote=row.copyright_note,
        )

    def _allowed(self, url: str) -> bool:
        host = urlparse(url).hostname or ""
        host = host.lower()
        return any(host == domain or host.endswith(f".{domain}") for domain in self.settings.crawler_allowed_domain_list)


def themes_from_symbols(symbols: list[str]) -> list[str]:
    output: list[str] = []
    for symbol in symbols:
        output.extend(SYMBOL_THEME_HINTS.get(symbol, []))
    return list(dict.fromkeys(output))


def parse_dt(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)

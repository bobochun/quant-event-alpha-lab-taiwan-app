import asyncio

from app.services.quote_service import QuoteService


def test_quote_cache_guard():
    service = QuoteService()
    first = asyncio.run(service.latest("2382"))
    second = asyncio.run(service.latest("2382"))
    assert first.symbol == second.symbol
    assert first.provider == second.provider

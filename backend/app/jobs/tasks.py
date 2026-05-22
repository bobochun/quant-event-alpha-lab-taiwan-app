import asyncio

from app.services.quote_service import QuoteService


async def _refresh_watchlist() -> None:
    await QuoteService().batch_latest(["2330", "2382", "2317"])


def refresh_watchlist_quotes() -> None:
    asyncio.run(_refresh_watchlist())

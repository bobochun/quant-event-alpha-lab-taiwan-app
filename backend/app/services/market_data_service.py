from app.schemas.market import ProviderKey, RefreshKLineRequest, RefreshQuotesRequest
from app.services.kline_service import KLineService
from app.services.quote_service import QuoteService


class MarketDataService:
    def __init__(self) -> None:
        self.quote_service = QuoteService()
        self.kline_service = KLineService()

    async def refresh_quotes(self, request: RefreshQuotesRequest):
        return await self.quote_service.batch_latest(request.symbols, request.provider)

    async def refresh_kline(self, request: RefreshKLineRequest):
        return await self.kline_service.kline(request.symbol, request.interval, request.range, request.provider)

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import ok_response
from app.schemas.market import ProviderKey
from app.services.quote_service import QuoteService

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.get("/latest/{symbol}")
async def latest_quote(symbol: str, provider: ProviderKey = "auto", db: Session = Depends(get_db)):
    quote = await QuoteService().latest(symbol, provider, db)
    return ok_response(
        quote.model_dump(by_alias=True),
        quote.data_source,
        quote.source_note,
    )


@router.get("/latest")
async def latest_quotes(symbols: str = Query(...), provider: ProviderKey = "auto", db: Session = Depends(get_db)):
    symbol_list = [symbol.strip() for symbol in symbols.split(",") if symbol.strip()]
    quotes = await QuoteService().batch_latest(symbol_list, provider, db)
    data_source = quotes[0].data_source if quotes else "Missing"
    return ok_response(
        [quote.model_dump(by_alias=True) for quote in quotes],
        data_source,
        "批次報價已回傳；若 provider 不可用會自動 fallback 並明確標示來源。",
    )

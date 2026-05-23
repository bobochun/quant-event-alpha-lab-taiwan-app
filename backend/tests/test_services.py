import asyncio

from app.services.institutional_flow_service import normalize_finmind_rows
from app.services.quote_service import QuoteService


def test_quote_cache_guard():
    service = QuoteService()
    first = asyncio.run(service.latest("2382"))
    second = asyncio.run(service.latest("2382"))
    assert first.symbol == second.symbol
    assert first.provider == second.provider


def test_finmind_institutional_flow_normalization():
    rows = [
        {"date": "2026-05-20", "name": "外資", "buy": 10_000, "sell": 2_000},
        {"date": "2026-05-20", "name": "投信", "buy": 3_000, "sell": 1_000},
        {"date": "2026-05-20", "name": "自營商", "buy": 1_000, "sell": 2_000},
        {"date": "2026-05-21", "name": "外資", "buy": 12_000, "sell": 1_000},
        {"date": "2026-05-21", "name": "投信", "buy": 5_000, "sell": 1_000},
        {"date": "2026-05-21", "name": "自營商", "buy": 900, "sell": 2_000},
    ]
    result = normalize_finmind_rows("2330", rows)
    assert result.symbol == "2330"
    assert result.trade_date == "2026-05-21"
    assert result.foreign_net_buy_shares == 11_000
    assert result.investment_trust_net_buy_shares == 4_000
    assert result.dealer_net_buy_shares == -1_100
    assert result.total_institutional_net_buy_shares == 13_900
    assert result.foreign_consecutive_days == 2
    assert result.investment_trust_consecutive_days == 2
    assert result.dealer_consecutive_days == -2
    assert result.flow_bias == "accumulation"
    assert result.flow_confirmation_score > 70
    assert result.data_source == "Official"


def test_finmind_institutional_flow_alternate_field_names():
    rows = [
        {"trade_date": "2026-05-20", "institutional_investor": "Foreign_Investor", "net_buy_sell": -1000},
        {"trade_date": "2026-05-20", "institutional_investor": "Investment Trust", "NetBuySell": 2000},
        {"trade_date": "2026-05-21", "institutional_investor": "Dealer", "buy_shares": 500, "sell_shares": 300},
    ]
    result = normalize_finmind_rows("2382", rows)
    assert result.trade_date == "2026-05-21"
    assert result.dealer_net_buy_shares == 200
    assert result.total_institutional_net_buy_shares == 200
    assert result.provider == "finmind-flow"

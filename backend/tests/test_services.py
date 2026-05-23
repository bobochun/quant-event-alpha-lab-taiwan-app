import asyncio

from app.services.institutional_flow_service import normalize_finmind_rows
from app.services.market_warning_service import parse_warning_row
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


def test_official_market_warning_parser_chinese_fields():
    item = parse_warning_row(
        {
            "有價證券代號": "2330",
            "有價證券名稱": "台積電",
            "注意原因": "最近六個營業日累積週轉率過高，列為注意股票",
            "公布日期": "115/05/21",
        },
        provider="twse-attention",
        market="TWSE",
        warning_type="attention",
        url="https://example.test/twse-attention",
    )
    assert item is not None
    assert item.symbol == "2330"
    assert item.name == "台積電"
    assert item.warning_type == "attention"
    assert item.severity == "medium"
    assert item.effective_date == "2026-05-21"
    assert item.data_source == "Official"


def test_official_market_warning_parser_disposition_severity():
    item = parse_warning_row(
        {
            "Code": "3017",
            "Name": "奇鋐",
            "DispositionReason": "再次達處置標準，延長分盤撮合",
            "StartDate": "2026-05-21",
            "EndDate": "2026-05-30",
        },
        provider="twse-disposition",
        market="TWSE",
        warning_type="disposition",
        url="https://example.test/twse-disposition",
    )
    assert item is not None
    assert item.symbol == "3017"
    assert item.warning_type == "disposition"
    assert item.severity == "critical"
    assert item.end_date == "2026-05-30"

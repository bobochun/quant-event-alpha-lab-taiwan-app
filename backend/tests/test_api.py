from fastapi.testclient import TestClient

from app.main import app
from app.quant.indicators import attach_indicators, rsi, sma
from app.services.kline_service import clear_kline_cache
from app.services.quote_service import clear_quote_cache


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True


def test_latest_quote_fallback():
    response = client.get("/quotes/latest/2330")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["symbol"] == "2330"
    assert "provider" in body["data"]
    assert "isRealtime" in body["data"]
    assert "delayMinutes" in body["data"]


def test_quote_cache_guard_does_not_crash():
    clear_quote_cache()
    first = client.get("/quotes/latest/2330")
    second = client.get("/quotes/latest/2330")
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["ok"] is True
    assert second.json()["ok"] is True
    assert second.json()["data"]["symbol"] == "2330"


def test_kline_fallback():
    response = client.get("/kline/2330?interval=1d&range=1y")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["symbol"] == "2330"
    assert len(body["data"]["bars"]) > 20
    assert "ma5" in body["data"]["bars"][-1]
    assert "rsi14" in body["data"]["bars"][-1]


def test_kline_cache_guard_does_not_crash():
    clear_kline_cache()
    first = client.get("/kline/2330?interval=1d&range=1m")
    second = client.get("/kline/2330?interval=1d&range=1m")
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["ok"] is True
    assert second.json()["ok"] is True
    assert len(second.json()["data"]["bars"]) > 0


def test_unsupported_interval_does_not_crash():
    response = client.get("/kline/2330?interval=1m&range=1d&provider=official")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["dataSource"] == "Demo"


def test_provider_status():
    response = client.get("/market-data/providers")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert any(row["provider"] == "finmind" for row in body["data"])
    assert any(row["provider"] == "yfinance" for row in body["data"])


def test_yfinance_status_does_not_crash():
    response = client.get("/market-data/source-health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    yf_rows = [row for row in body["data"] if row["provider"] == "yfinance"]
    assert len(yf_rows) == 1
    assert yf_rows[0]["status"] in {"ok", "degraded", "disabled", "error"}


def test_events_upcoming_without_token_does_not_crash():
    response = client.get("/events/upcoming?days=30&symbols=2330,2382")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "events" in body["data"]
    assert "providers" in body["data"]
    assert isinstance(body["data"]["events"], list)
    assert any(row["provider"] == "finmind-events" for row in body["data"]["providers"])


def test_event_providers_status():
    response = client.get("/events/providers")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert isinstance(body["data"], list)
    assert any(row["supportsEvents"] for row in body["data"])


def test_quant_analyze_symbol():
    response = client.get("/quant/analyze/2330?interval=1d&range=1y")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["symbol"] == "2330"
    assert "quantScore" in body["data"]
    assert "breakdown" in body["data"]
    assert "overheatRisk" in body["data"]
    assert "nextAction" in body["data"]


def test_quant_analyze_batch():
    response = client.get("/quant/analyze?symbols=2330,2382&interval=1d&range=1m")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "results" in body["data"]
    assert isinstance(body["data"]["results"], list)
    assert len(body["data"]["results"]) >= 1
    assert "warnings" in body["data"]


def test_research_cross_section():
    response = client.get("/research/cross-section?symbols=2330,2382")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "ranks" in body["data"]
    assert body["data"]["universeSize"] >= 1


def test_research_theme_strength():
    response = client.get("/research/theme-strength?symbols=2330,2382,2317")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert isinstance(body["data"], list)


def test_research_data_quality():
    response = client.get("/research/data-quality")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert isinstance(body["data"], list)
    assert any(row["dataset"] == "price_bars" for row in body["data"])


def test_research_trading_cost():
    response = client.post("/research/trading-cost", json={"price": 100, "shares": 1000, "side": "roundTrip"})
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["totalCost"] > 0


def test_research_portfolio_optimize():
    response = client.post("/research/portfolio-optimize", json={"capital": 1000000, "symbols": ["2330", "2382"], "themeMap": {"AI server": ["2330", "2382"]}})
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "weights" in body["data"]


def test_jobs_quant_scan_and_data_quality():
    scan = client.post("/jobs/run", json={"jobName": "refresh_factor_scores", "symbols": ["2330", "2382"]})
    quality = client.post("/jobs/run", json={"jobName": "data_quality_check", "symbols": ["2330"]})
    assert scan.status_code == 200
    assert quality.status_code == 200
    assert scan.json()["ok"] is True
    assert quality.json()["ok"] is True


def test_indicators_calculation():
    closes = [float(value) for value in range(1, 31)]
    assert sma(closes, 5)[4] == 3.0
    assert sma(closes, 20)[19] == 10.5
    assert rsi(closes, 14)[-1] == 100

    rows = [
        {"time": f"2026-01-{day:02d}", "open": float(day), "high": float(day + 1), "low": float(day - 1), "close": float(day), "volume": 1000}
        for day in range(1, 31)
    ]
    enriched, source = attach_indicators(rows)
    assert "partial indicators" in source
    assert enriched[-1]["ma5"] is not None
    assert enriched[-1]["ma20"] is not None
    assert enriched[-1]["ma60"] is None
    assert enriched[-1]["rsi14"] is not None

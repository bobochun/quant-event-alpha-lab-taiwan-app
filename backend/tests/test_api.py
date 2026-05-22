from fastapi.testclient import TestClient

from app.main import app


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


def test_kline_fallback():
    response = client.get("/kline/2330?interval=1d&range=1y")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["symbol"] == "2330"
    assert len(body["data"]["bars"]) > 20
    assert "ma5" in body["data"]["bars"][-1]


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

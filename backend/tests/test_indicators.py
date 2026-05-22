from app.quant.indicators import attach_indicators, rsi, sma


def test_sma_and_rsi_calculation():
    values = [float(index) for index in range(1, 70)]
    ma5 = sma(values, 5)
    assert ma5[3] is None
    assert ma5[4] == 3
    rsi14 = rsi(values, 14)
    assert rsi14[-1] == 100


def test_attach_indicators_handles_short_data():
    rows = [{"time": f"2026-01-{index:02d}", "open": 10, "high": 11, "low": 9, "close": 10 + index, "volume": 1000} for index in range(1, 10)]
    enriched, source = attach_indicators(rows)
    assert len(enriched) == 9
    assert "insufficient" in source
    assert enriched[-1]["ma5"] is not None
    assert enriched[-1]["ma20"] is None

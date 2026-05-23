from __future__ import annotations

from typing import Iterable


def sma(values: Iterable[float], window: int) -> list[float | None]:
    series = list(values)
    out: list[float | None] = []
    for index in range(len(series)):
      if index + 1 < window:
          out.append(None)
          continue
      chunk = series[index + 1 - window:index + 1]
      out.append(round(sum(chunk) / window, 4))
    return out


def rsi(values: Iterable[float], window: int = 14) -> list[float | None]:
    closes = list(values)
    out: list[float | None] = [None] * len(closes)
    if len(closes) <= window:
        return out
    gains: list[float] = []
    losses: list[float] = []
    for index in range(1, len(closes)):
        delta = closes[index] - closes[index - 1]
        gains.append(max(delta, 0))
        losses.append(abs(min(delta, 0)))
        if index < window:
            continue
        avg_gain = sum(gains[index - window:index]) / window
        avg_loss = sum(losses[index - window:index]) / window
        if avg_loss == 0:
            out[index] = 100
        else:
            rs = avg_gain / avg_loss
            out[index] = round(100 - (100 / (1 + rs)), 4)
    return out


def attach_indicators(rows: list[dict]) -> tuple[list[dict], str]:
    if not rows:
        return rows, "insufficient data"
    closes = [float(row["close"]) for row in rows]
    ma5 = sma(closes, 5)
    ma20 = sma(closes, 20)
    ma60 = sma(closes, 60)
    rsi14 = rsi(closes, 14)
    enriched: list[dict] = []
    for index, row in enumerate(rows):
        enriched.append({
            **row,
            "ma5": ma5[index],
            "ma20": ma20[index],
            "ma60": ma60[index],
            "rsi14": rsi14[index],
        })
    source = "calculated from available OHLCV" if len(rows) >= 60 else "insufficient data; partial indicators only"
    return enriched, source

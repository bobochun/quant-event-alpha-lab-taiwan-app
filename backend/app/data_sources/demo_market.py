from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import math
import random

from app.schemas.market import PriceBar, QuoteData

NAMES = {
    "2330": "台積電",
    "2317": "鴻海",
    "2382": "廣達",
    "3231": "緯創",
    "6669": "緯穎",
    "2308": "台達電",
    "3017": "奇鋐",
    "3324": "雙鴻",
    "2454": "聯發科",
    "006208": "富邦台50",
}


def security_name(symbol: str) -> str:
    return NAMES.get(symbol, f"{symbol} 台股標的")


def base_price(symbol: str) -> float:
    seed = sum(ord(char) for char in symbol)
    return round(40 + (seed % 920) + (seed % 17) * 0.5, 2)


def demo_quote(symbol: str, provider: str = "demo") -> QuoteData:
    now = datetime.now(timezone.utc)
    base = base_price(symbol)
    drift = math.sin(now.timestamp() / 86400 + len(symbol)) * 0.018
    price = round(base * (1 + drift), 2)
    previous = round(base * 0.992, 2)
    change = round(price - previous, 2)
    change_percent = round((change / previous) * 100, 2) if previous else 0
    volume = int(1200 + (base * 37) % 80000) * 1000
    return QuoteData(
        symbol=symbol,
        name=security_name(symbol),
        price=price,
        previousClose=previous,
        change=change,
        changePercent=change_percent,
        open=round(previous * 1.002, 2),
        high=round(max(price, previous) * 1.014, 2),
        low=round(min(price, previous) * 0.986, 2),
        volume=volume,
        value=round(volume * price, 0),
        quoteTime=now.isoformat(),
        provider=provider,
        dataSource="Demo",
        isRealtime=False,
        delayMinutes=None,
        licenseNote="示範 fallback，不是真實即時行情。",
        sourceNote="後端 provider 無可用資料時產生的示範報價，僅供功能測試。",
        fetchedAt=now.isoformat(),
    )


def demo_bars(symbol: str, start: date, end: date, interval: str = "1d", provider: str = "demo") -> list[PriceBar]:
    seed = sum(ord(char) for char in symbol)
    rng = random.Random(seed + len(interval))
    days = max((end - start).days + 1, 1)
    if interval == "1w":
        step = 7
    elif interval == "1mo":
        step = 30
    else:
        step = 1
    rows: list[PriceBar] = []
    price = base_price(symbol)
    current = start
    index = 0
    while current <= end:
        if interval == "1d" and current.weekday() >= 5:
            current += timedelta(days=1)
            continue
        wave = math.sin((index + seed) / 8) * 0.012
        noise = rng.uniform(-0.018, 0.018)
        open_price = price
        close = max(1, round(price * (1 + wave + noise), 2))
        high = round(max(open_price, close) * (1 + rng.uniform(0.003, 0.025)), 2)
        low = round(min(open_price, close) * (1 - rng.uniform(0.003, 0.022)), 2)
        volume = int((1500 + (seed % 90) * 60 + abs(noise) * 90000) * 1000)
        rows.append(PriceBar(
            time=current.isoformat(),
            open=round(open_price, 2),
            high=high,
            low=low,
            close=close,
            volume=volume,
            value=round(volume * close, 0),
        ))
        price = close
        current += timedelta(days=step)
        index += 1
    return rows[-max(days // step, 1):]

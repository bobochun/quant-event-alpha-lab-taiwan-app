from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.data_sources.demo_market import security_name
from app.schemas.market import MarketSummaryPayload, StockProfile, TechnicalSummary
from app.services.institutional_flow_service import InstitutionalFlowService
from app.services.quant_analysis_service import QuantAnalysisService
from app.services.quote_service import QuoteService

THEME_MAP: dict[str, list[str]] = {
    "2330": ["AI server", "CoWoS", "Semiconductor", "Foundry"],
    "2382": ["AI server", "ODM"],
    "2317": ["AI server", "EV", "EMS"],
    "2308": ["Power Supply", "EV", "AI server"],
    "3017": ["Thermal", "AI server"],
    "3037": ["PCB", "AI server"],
    "3231": ["AI server", "ODM"],
    "2603": ["Shipping"],
    "2615": ["Shipping"],
    "2454": ["IC Design", "Semiconductor"],
    "3711": ["Semiconductor", "Foundry"],
    "2881": ["Financial"],
    "2882": ["Financial"],
    "0050": ["ETF", "Large Cap"],
    "00878": ["ETF", "Dividend"],
}

INDUSTRY_MAP: dict[str, str] = {
    "2330": "Semiconductor",
    "2454": "Semiconductor",
    "3711": "Semiconductor",
    "2382": "Computer & Peripheral",
    "2317": "Electronics Manufacturing",
    "2308": "Electronic Components",
    "3017": "Thermal Solutions",
    "3037": "PCB",
    "3231": "Computer & Peripheral",
    "2603": "Shipping",
    "2615": "Shipping",
    "2881": "Financial",
    "2882": "Financial",
    "0050": "ETF",
    "00878": "ETF",
}


class MarketSummaryService:
    def __init__(self) -> None:
        self.quote_service = QuoteService()
        self.quant_service = QuantAnalysisService()
        self.flow_service = InstitutionalFlowService()

    async def summary(self, symbol: str, db: Session | None = None) -> MarketSummaryPayload:
        quote = None
        technical = None
        flow = None
        key_points: list[str] = []
        risk_flags: list[str] = []
        try:
            quote = await self.quote_service.latest_quote(symbol=symbol, provider="auto", db=db)
        except Exception as exc:
            risk_flags.append(f"最新報價讀取失敗：{exc}")
        try:
            quant = await self.quant_service.analyze_symbol(symbol=symbol, interval="1d", range_key="1y", provider="auto", db=db)
            technical = TechnicalSummary(
                trendState=quant.trend_state,
                momentumState=quant.momentum_state,
                overheatRisk=quant.overheat_risk,
                latestClose=quant.latest_close,
                ma5=quant.ma5,
                ma20=quant.ma20,
                ma60=quant.ma60,
                rsi14=quant.rsi14,
                return20d=quant.return20d,
                return60d=quant.return60d,
                volatility20d=quant.volatility20d,
                volumeRatio20d=quant.volumeRatio20d,
                warnings=quant.warnings,
            )
            key_points.append(f"技術狀態：{quant.trend_state} / {quant.momentum_state}，量化分數 {quant.quant_score}。")
            if quant.overheat_risk in {"high", "critical"}:
                risk_flags.append("短線過熱風險偏高，避免追高。")
            if quant.data_quality == "low":
                risk_flags.append("技術資料品質偏低，需確認資料來源。")
        except Exception as exc:
            risk_flags.append(f"技術摘要讀取失敗：{exc}")
        try:
            flow = await self.flow_service.latest_flow(symbol)
            key_points.append(f"法人籌碼：{flow.flow_bias}，主力/法人確認分數 {flow.flow_confirmation_score}。")
            if flow.flow_bias == "distribution":
                risk_flags.append("法人籌碼偏賣超或分歧，需降低追價衝動。")
            if flow.data_source == "Demo":
                risk_flags.append("法人籌碼目前為 Demo fallback，不可視為真實外資投信買賣超。")
        except Exception as exc:
            risk_flags.append(f"法人籌碼讀取失敗：{exc}")
        profile = self._profile(symbol)
        if quote:
            key_points.append(f"最新價 {quote.price}，資料來源 {quote.provider}/{quote.data_source}。")
        return MarketSummaryPayload(
            symbol=symbol,
            name=security_name(symbol),
            profile=profile,
            quote=quote,
            technical=technical,
            institutionalFlow=flow,
            keyPoints=key_points,
            riskFlags=risk_flags,
            sourceNote="Market summary combines quote, K-line technical analysis, institutional flow, and profile metadata. Fallback data is clearly marked.",
            generatedAt=datetime.now(timezone.utc).isoformat(),
        )

    def _profile(self, symbol: str) -> StockProfile:
        return StockProfile(
            symbol=symbol,
            name=security_name(symbol),
            market="TWSE/TPEx/ETF",
            industry=INDUSTRY_MAP.get(symbol, "Unknown"),
            assetType="ETF" if symbol.startswith("00") else "stock",
            themes=THEME_MAP.get(symbol, ["Market Watch"]),
            marketCapNote="Market cap adapter pending; use official/basic-data provider in next stage.",
            liquidityNote="Liquidity should be checked with volume/value and order book from licensed provider if available.",
            sourceNote="Profile metadata uses local map fallback until official security master is fully normalized.",
            dataSource="Estimated",
        )

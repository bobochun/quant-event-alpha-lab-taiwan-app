import type { MarketRegime, PositionSizingResult, RiskLevel } from "./types";
import { clamp, round } from "./utils";

export interface PositionSizingInput {
  capital: number;
  entryPrice: number;
  stopLoss: number;
  riskPerTradePct: number;
  maxPositionPct: number;
  combinedAlphaScore: number;
  marketRegime: MarketRegime;
  eventRisk: RiskLevel;
  portfolioExposurePct: number;
  themeConcentrationPct: number;
  volatility20d: number;
  confidence: number;
  dataQuality: number;
}

export function calculateAdaptivePositionSize(input: PositionSizingInput): PositionSizingResult {
  const perShareRisk = input.entryPrice - input.stopLoss;
  if (perShareRisk <= 0 || input.capital <= 0 || input.entryPrice <= 0) {
    return {
      suggestedShares: 0,
      suggestedPositionPct: 0,
      riskAdjustedPositionPct: 0,
      confidenceAdjustedSize: 0,
      estimatedCost: 0,
      maxRiskAmount: 0,
      warnings: ["研究進場價必須高於停損價。"]
    };
  }

  const alphaMultiplier = input.combinedAlphaScore >= 80 ? 1 : input.combinedAlphaScore >= 65 ? 0.82 : input.combinedAlphaScore >= 50 ? 0.55 : 0.3;
  const regimeMultiplier = input.marketRegime === "bullish" ? 1 : input.marketRegime === "sideways" ? 0.78 : input.marketRegime === "highVolatility" ? 0.6 : input.marketRegime === "bearish" ? 0.45 : input.marketRegime === "riskOff" ? 0.28 : 0.5;
  const eventMultiplier = input.eventRisk === "critical" ? 0.35 : input.eventRisk === "high" ? 0.55 : input.eventRisk === "medium" ? 0.78 : 1;
  const concentrationMultiplier = input.themeConcentrationPct > 40 ? 0.45 : input.themeConcentrationPct > 28 ? 0.65 : input.portfolioExposurePct > 70 ? 0.7 : 1;
  const volatilityMultiplier = input.volatility20d > 45 ? 0.45 : input.volatility20d > 32 ? 0.65 : input.volatility20d > 22 ? 0.85 : 1;
  const confidenceMultiplier = clamp((input.confidence + input.dataQuality) / 160, 0.35, 1);

  const adjustedRiskPct = input.riskPerTradePct * alphaMultiplier * regimeMultiplier * eventMultiplier * concentrationMultiplier * volatilityMultiplier * confidenceMultiplier;
  const maxRiskAmount = input.capital * (adjustedRiskPct / 100);
  const rawShares = Math.floor(maxRiskAmount / perShareRisk);
  const maxCost = input.capital * (input.maxPositionPct / 100);
  const cappedShares = Math.min(rawShares, Math.floor(maxCost / input.entryPrice));
  const estimatedCost = cappedShares * input.entryPrice;
  const suggestedPositionPct = (estimatedCost / input.capital) * 100;

  const warnings = [
    input.marketRegime === "riskOff" ? "市場處於風險趨避，所有事件策略都應下修部位。" : "",
    input.eventRisk === "high" || input.eventRisk === "critical" ? "事件風險偏高，降低部位並等待確認。" : "",
    input.themeConcentrationPct > 40 ? "題材集中度偏高，避免新增高度相關曝險。" : "",
    input.volatility20d > 32 ? "近期波動偏高，已下修建議部位。" : "",
    input.confidence < 50 ? "事件可信度偏低，資料改善前應降低部位。" : ""
  ].filter(Boolean);

  return {
    suggestedShares: cappedShares,
    suggestedPositionPct: round(suggestedPositionPct, 2),
    riskAdjustedPositionPct: round(adjustedRiskPct, 2),
    confidenceAdjustedSize: round(confidenceMultiplier * 100, 1),
    estimatedCost,
    maxRiskAmount: round(maxRiskAmount, 0),
    warnings
  };
}

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
      warnings: ["Entry price must be greater than stop loss."]
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
    input.marketRegime === "riskOff" ? "Market regime is risk-off; reduce all event strategy sizing." : "",
    input.eventRisk === "high" || input.eventRisk === "critical" ? "Event risk is elevated; lower the position size and require confirmation." : "",
    input.themeConcentrationPct > 40 ? "Theme concentration is high; avoid adding correlated exposure." : "",
    input.volatility20d > 32 ? "Recent volatility is high; position size has been reduced." : "",
    input.confidence < 50 ? "Event confidence is low; size is reduced until data improves." : ""
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

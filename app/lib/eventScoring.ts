import type { CatalystScoreResult, Event, NextAction, Stock, Theme } from "./types";
import { clamp, daysBetween, todayTaipei } from "./utils";

const importanceByType: Record<Event["eventType"], number> = {
  investorConference: 78,
  exDividend: 45,
  monthlyRevenue: 72,
  earnings: 86,
  foreignBrokerReport: 54,
  majorHolderChange: 48,
  etfRebalance: 74,
  attentionStock: 38,
  dispositionStock: 25,
  shareholderMeetingGift: 28,
  productLaunch: 76,
  aiServerNews: 80,
  semiconductorNews: 75,
  industryConference: 62,
  policy: 70,
  orderContract: 82,
  buyback: 58,
  capitalIncrease: 42,
  convertibleBond: 35,
  mergerAcquisition: 78,
  supplyChainNews: 70,
  other: 40
};

export function calculateCatalystTimingScore(eventDate: string): number {
  const days = daysBetween(todayTaipei(), eventDate);
  if (days < 0) return 15;
  if (days <= 2) return 90;
  if (days <= 7) return 100 - days * 4;
  if (days <= 14) return 72 - (days - 7) * 3;
  if (days <= 30) return 45 - (days - 14);
  return 18;
}

function confidenceLabel(score: number): CatalystScoreResult["confidenceLevel"] {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function nextActionFrom(total: number, riskPenalty: number, confidence: number, overheated: boolean): NextAction {
  if (confidence < 45) return "InsufficientData";
  if (riskPenalty >= 22 || overheated) return "AvoidChasing";
  if (total >= 78) return "CreateTradePlan";
  if (total >= 66) return "WaitForPullback";
  if (total >= 52) return "Observe";
  return "ThemeTrackingOnly";
}

export function calculateCatalystScore(event: Event, stock?: Stock, themes: Theme[] = []): CatalystScoreResult {
  const matchedThemes = themes.filter((theme) => event.relatedThemes.includes(theme.name));
  const themeHeatRaw = matchedThemes.length
    ? matchedThemes.reduce((sum, theme) => sum + theme.sevenDayEventCount * 7 + theme.institutionalFlowScore * 0.45 + theme.synchronizedBreakoutCount * 5 - theme.limitUpClusterCount * 8, 0) / matchedThemes.length
    : 42;
  const eventImportanceScore = clamp(importanceByType[event.eventType] * 0.65 + event.expectedImpact * 0.35);
  const timingScore = calculateCatalystTimingScore(event.eventDate);
  const surprisePotentialScore = clamp((100 - event.marketAwareness) * 0.55 + event.expectedImpact * 0.35 + event.confidence * 0.1);
  const themeHeatScore = clamp(themeHeatRaw);
  const flowConfirmationScore = stock ? clamp(50 + stock.institutionalFlow5d * 0.45 + stock.foreignFlow5d * 0.35 + stock.investmentTrustFlow5d * 0.3) : 45;
  const technicalSetupScore = stock ? clamp(50 + stock.ma20Slope * 14 + (stock.relativeStrengthRank - 50) * 0.35 - Math.max(0, stock.ma20DistancePct - 8) * 3) : 45;
  const overheated = Boolean(stock && (stock.rsi14 > 70 || stock.ma20DistancePct > 10 || stock.volumeRatio > 1.8 || stock.limitUpCount10d >= 2));
  const riskPenalty = clamp(
    (stock?.isDispositionStock ? 18 : 0) +
      (stock?.isAttentionStock ? 8 : 0) +
      Math.max(0, (stock?.rsi14 ?? 50) - 68) * 0.8 +
      Math.max(0, (stock?.ma20DistancePct ?? 0) - 8) * 1.2 +
      Math.max(0, (stock?.volumeRatio ?? 1) - 1.6) * 10 +
      Math.max(0, event.marketAwareness - 72) * 0.35,
    0,
    30
  );
  const totalCatalystScore = clamp(
    eventImportanceScore * 0.25 +
      timingScore * 0.15 +
      surprisePotentialScore * 0.2 +
      themeHeatScore * 0.15 +
      flowConfirmationScore * 0.1 +
      technicalSetupScore * 0.1 -
      riskPenalty
  );
  const warnings = [
    event.dataSource === "Demo" ? "示範資料，不是真實即時市場資料。" : "",
    event.confidence < 45 ? "資料可信度偏低，僅適合觀察。" : "",
    stock?.isDispositionStock ? "處置股：交易限制與流動性風險上升。" : "",
    overheated ? "價格或量能可能已在事件前提前反應。" : ""
  ].filter(Boolean);

  return {
    totalCatalystScore,
    eventImportanceScore,
    timingScore,
    surprisePotentialScore,
    themeHeatScore,
    flowConfirmationScore,
    technicalSetupScore,
    riskPenalty,
    confidenceLevel: confidenceLabel(event.confidence),
    reason: `事件重要性 ${Math.round(eventImportanceScore)}，時間分數 ${Math.round(timingScore)}，驚喜潛力 ${Math.round(surprisePotentialScore)}。`,
    warnings,
    nextAction: nextActionFrom(totalCatalystScore, riskPenalty, event.confidence, overheated)
  };
}

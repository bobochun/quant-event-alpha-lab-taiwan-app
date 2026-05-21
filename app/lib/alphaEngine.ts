import type {
  AlphaEngineResult,
  BehaviorAnalyticsResult,
  CombinedAlphaResult,
  Event,
  JournalEntry,
  MarketRegime,
  MarketRegimeResult,
  NextAction,
  Portfolio,
  PortfolioExposureResult,
  Position,
  RiskAlert,
  RiskLevel,
  Stock,
  Theme,
  ThemeHeatResult
} from "./types";
import { calculateCatalystScore, calculateCatalystTimingScore } from "./eventScoring";
import { DEMO_SOURCE_NOTE, clamp, daysBetween, riskFromScore, round, todayTaipei } from "./utils";

export function calculateQuantTrendScore(stock?: Stock): number {
  if (!stock) return 45;
  return clamp(50 + stock.ma20Slope * 16 + stock.sevenDayReturnPct * 1.1 + stock.twentyDayReturnPct * 0.45 - Math.max(0, stock.ma20DistancePct - 9) * 2.2);
}

export function calculateFlowConfirmationScore(stock?: Stock): number {
  if (!stock) return 45;
  return clamp(50 + stock.institutionalFlow5d * 0.45 + stock.foreignFlow5d * 0.3 + stock.investmentTrustFlow5d * 0.35 + stock.dealerFlow5d * 0.15);
}

export function calculateThemeMomentumScore(themes: Theme[], event?: Event, stock?: Stock): number {
  const names = event?.relatedThemes ?? stock?.themes ?? [];
  const matched = themes.filter((theme) => names.includes(theme.name));
  if (!matched.length) return 42;
  const raw = matched.reduce((sum, theme) => {
    const acceleration = theme.sevenDayNewsCount - theme.priorSevenDayNewsCount;
    return sum + 45 + acceleration * 2.5 + theme.sevenDayEventCount * 4 + theme.institutionalFlowScore * 0.25 + theme.synchronizedBreakoutCount * 4 - theme.limitUpClusterCount * 6 - (theme.isOverheated ? 12 : 0);
  }, 0) / matched.length;
  return clamp(raw);
}

export function calculateRiskAdjustedMomentum(stock?: Stock): number {
  if (!stock) return 45;
  const momentum = stock.sevenDayReturnPct * 2.2 + stock.twentyDayReturnPct * 0.8 + stock.relativeStrengthRank * 0.5;
  const volatilityDrag = stock.volatility20d * 0.65 + Math.max(0, stock.volumeRatio - 1.6) * 12;
  return clamp(35 + momentum - volatilityDrag);
}

export function calculateRelativeStrengthScore(stock?: Stock): number {
  return stock ? clamp(stock.relativeStrengthRank) : 45;
}

export function classifyMarketRegime(stocks: Stock[]): MarketRegimeResult {
  const liquid = stocks.filter((stock) => stock.liquidityScore >= 70);
  const avgRs = liquid.reduce((sum, stock) => sum + stock.relativeStrengthRank, 0) / Math.max(1, liquid.length);
  const avgVol = liquid.reduce((sum, stock) => sum + stock.volatility20d, 0) / Math.max(1, liquid.length);
  const advancers = liquid.filter((stock) => stock.sevenDayReturnPct > 0).length / Math.max(1, liquid.length);
  let regime: MarketRegime = "sideways";
  if (avgVol > 42) regime = "highVolatility";
  if (avgRs > 65 && advancers > 0.55 && avgVol < 38) regime = "bullish";
  if (avgRs < 40 && advancers < 0.4) regime = "bearish";
  if (avgVol > 48 && advancers < 0.35) regime = "riskOff";
  const suggestedGrossExposurePct = regime === "bullish" ? 70 : regime === "sideways" ? 45 : regime === "highVolatility" ? 35 : regime === "bearish" ? 25 : regime === "riskOff" ? 15 : 30;
  const volatilityState = avgVol > 48 ? "extreme" : avgVol > 36 ? "elevated" : avgVol > 22 ? "normal" : "low";
  return {
    regime,
    suggestedGrossExposurePct,
    volatilityState,
    score: clamp(avgRs * 0.65 + advancers * 35 - avgVol * 0.35),
    explanation: `Liquid sample RS ${round(avgRs)}, advancer ratio ${round(advancers * 100)}%, volatility ${round(avgVol)}.`,
    dataSource: "Demo",
    sourceNote: DEMO_SOURCE_NOTE
  };
}

export function calculateMarketRegimeAlignmentScore(regime: MarketRegime, stock?: Stock): number {
  if (!stock) return 45;
  const base = regime === "bullish" ? 68 : regime === "sideways" ? 54 : regime === "highVolatility" ? 43 : regime === "bearish" ? 34 : regime === "riskOff" ? 22 : 40;
  return clamp(base + (stock.beta <= 1 ? 5 : -Math.max(0, stock.beta - 1) * 12) + (stock.relativeStrengthRank - 50) * 0.2);
}

export function detectOverheatRisk(stock?: Stock, event?: Event, themes: Theme[] = []): RiskLevel {
  if (!stock) return "medium";
  const themeHeat = calculateThemeMomentumScore(themes, event, stock);
  const risk = Math.max(0, stock.rsi14 - 65) * 2 + Math.max(0, stock.ma20DistancePct - 7) * 4 + Math.max(0, stock.volumeRatio - 1.4) * 18 + stock.limitUpCount10d * 8 + Math.max(0, themeHeat - 78) * 0.7;
  return riskFromScore(risk);
}

export function detectPricedInRisk(stock?: Stock, event?: Event, themes: Theme[] = []): RiskLevel {
  if (!stock || !event) return "medium";
  const mediaCluster = calculateThemeMomentumScore(themes, event, stock);
  const risk = stock.sevenDayReturnPct * 2 + stock.twentyDayReturnPct * 1.1 + Math.max(0, stock.rsi14 - 62) * 1.6 + Math.max(0, stock.volumeRatio - 1.5) * 16 + event.marketAwareness * 0.45 + Math.max(0, mediaCluster - 72) * 0.8 + Math.max(0, -stock.institutionalFlow5d) * 1.2;
  return riskFromScore(risk);
}

function penaltyFromRisk(level: RiskLevel): number {
  return level === "critical" ? 22 : level === "high" ? 15 : level === "medium" ? 7 : 0;
}

function alphaAction(score: number, warnings: string[], pricedInRisk: RiskLevel): NextAction {
  if (warnings.some((warning) => warning.includes("confidence"))) return "InsufficientData";
  if (pricedInRisk === "critical" || pricedInRisk === "high") return "AvoidChasing";
  if (score >= 80) return "CreateTradePlan";
  if (score >= 65) return "WaitForPullback";
  if (score >= 50) return "Observe";
  return "ThemeTrackingOnly";
}

export function calculateCombinedAlphaScore(event: Event, stock: Stock | undefined, themes: Theme[], regime: MarketRegimeResult): CombinedAlphaResult {
  const catalyst = calculateCatalystScore(event, stock, themes);
  const quantTrendScore = calculateQuantTrendScore(stock);
  const flowConfirmationScore = calculateFlowConfirmationScore(stock);
  const themeMomentumScore = calculateThemeMomentumScore(themes, event, stock);
  const riskAdjustedMomentumScore = calculateRiskAdjustedMomentum(stock);
  const marketRegimeAlignmentScore = calculateMarketRegimeAlignmentScore(regime.regime, stock);
  const relativeStrengthScore = calculateRelativeStrengthScore(stock);
  const overheatPenalty = penaltyFromRisk(detectOverheatRisk(stock, event, themes));
  const liquidityPenalty = stock ? clamp((55 - stock.liquidityScore) * 0.5, 0, 14) : 8;
  const dataQualityPenalty = clamp((65 - event.confidence) * 0.28, 0, 16);
  const dispositionPenalty = stock?.isDispositionStock ? 18 : stock?.isAttentionStock ? 8 : 0;
  const pricedInRisk = detectPricedInRisk(stock, event, themes);
  const pricedInPenalty = penaltyFromRisk(pricedInRisk);
  const combinedAlphaScore = clamp(
    catalyst.totalCatalystScore * 0.3 +
      quantTrendScore * 0.2 +
      flowConfirmationScore * 0.15 +
      themeMomentumScore * 0.15 +
      riskAdjustedMomentumScore * 0.1 +
      marketRegimeAlignmentScore * 0.05 +
      relativeStrengthScore * 0.05 -
      (overheatPenalty + liquidityPenalty + dataQualityPenalty + dispositionPenalty + pricedInPenalty)
  );
  const warnings = [
    ...catalyst.warnings,
    pricedInRisk === "high" || pricedInRisk === "critical" ? "Event may already be priced in; chase risk is elevated." : "",
    overheatPenalty >= 15 ? "Technical or volume overheat detected; wait for pullback." : "",
    liquidityPenalty > 0 ? "Liquidity is below preferred threshold; reduce size." : ""
  ].filter(Boolean);
  return {
    combinedAlphaScore,
    catalystScore: catalyst.totalCatalystScore,
    quantTrendScore,
    flowConfirmationScore,
    themeMomentumScore,
    riskAdjustedMomentumScore,
    marketRegimeAlignmentScore,
    relativeStrengthScore,
    overheatPenalty,
    liquidityPenalty,
    dataQualityPenalty,
    dispositionPenalty,
    pricedInPenalty,
    nextAction: alphaAction(combinedAlphaScore, warnings, pricedInRisk),
    explanation: `Alpha combines catalyst ${round(catalyst.totalCatalystScore)}, trend ${round(quantTrendScore)}, flow ${round(flowConfirmationScore)}, theme ${round(themeMomentumScore)}, then subtracts overheat, liquidity, data-quality and priced-in penalties.`,
    warnings
  };
}

export function buildAlphaEngineResults(events: Event[], stocks: Stock[], themes: Theme[]): AlphaEngineResult[] {
  const regime = classifyMarketRegime(stocks);
  return events.map((event) => {
    const stock = stocks.find((item) => item.symbol === event.symbol);
    const catalyst = calculateCatalystScore(event, stock, themes);
    const alpha = calculateCombinedAlphaScore(event, stock, themes, regime);
    return {
      event,
      stock,
      catalyst,
      alpha,
      daysToEvent: daysBetween(todayTaipei(), event.eventDate),
      pricedInRisk: detectPricedInRisk(stock, event, themes),
      overheatRisk: detectOverheatRisk(stock, event, themes)
    };
  });
}

export function calculateThemeHeat(themes: Theme[], events: Event[], stocks: Stock[]): ThemeHeatResult[] {
  return themes.map((theme) => {
    const relatedStocks = stocks.filter((stock) => theme.relatedSymbols.includes(stock.symbol));
    const overheatedSymbols = relatedStocks.filter((stock) => detectOverheatRisk(stock, undefined, [theme]) !== "low").map((stock) => stock.symbol);
    const acceleration = theme.sevenDayNewsCount - theme.priorSevenDayNewsCount;
    const heatScore = clamp(45 + acceleration * 2.8 + theme.sevenDayEventCount * 4 + theme.institutionalFlowScore * 0.25 + theme.synchronizedBreakoutCount * 4 - theme.limitUpClusterCount * 9 - (theme.isOverheated ? 16 : 0));
    return {
      theme: theme.name,
      heatScore,
      momentum: clamp(50 + acceleration * 4 + theme.synchronizedBreakoutCount * 5),
      relatedSymbols: theme.relatedSymbols,
      upcomingEvents: events.filter((event) => event.relatedThemes.includes(theme.name) && daysBetween(todayTaipei(), event.eventDate) <= 7).length,
      overheatedSymbols,
      warnings: [theme.isOverheated ? "Theme appears crowded; avoid chasing the hottest names." : "", theme.dataSource === "Demo" ? "Demo theme data only." : ""].filter(Boolean),
      explanation: "Theme heat favors early acceleration with broad participation, while penalizing crowded limit-up clusters.",
      dataSource: theme.dataSource,
      sourceNote: theme.sourceNote
    };
  }).sort((a, b) => b.heatScore - a.heatScore);
}

function makeAlert(severity: RiskLevel, category: RiskAlert["category"], symbol: string | undefined, message: string, suggestedAction: string): RiskAlert {
  return { id: `generated-${category}-${symbol ?? message}`, severity, category, symbol, message, suggestedAction, createdAt: new Date().toISOString(), dataSource: "Estimated", sourceNote: "Generated from local portfolio inputs." };
}

export function analyzePortfolioExposure(portfolio: Portfolio): PortfolioExposureResult {
  const investedValue = portfolio.positions.reduce((sum, position) => sum + position.shares * position.currentPrice, 0);
  const totalAssetValue = portfolio.cash + investedValue;
  const pct = (value: number) => totalAssetValue > 0 ? round((value / totalAssetValue) * 100, 1) : 0;
  const groupBy = (positions: Position[], keyFn: (position: Position) => string[]) => {
    const grouped: Record<string, number> = {};
    positions.forEach((position) => keyFn(position).forEach((key) => {
      grouped[key] = round((grouped[key] ?? 0) + pct(position.shares * position.currentPrice), 1);
    }));
    return grouped;
  };
  const themeExposure = groupBy(portfolio.positions, (position) => position.tags);
  const strategyExposure = groupBy(portfolio.positions, (position) => [position.strategy]);
  const eventDateExposure = groupBy(portfolio.positions, (position) => [position.relatedEventId ?? "No Event"]);
  const marketBetaExposure = portfolio.positions.reduce((sum, position) => {
    const beta = position.tags.some((tag) => ["AI server", "CoWoS", "PCB", "Thermal", "Defense"].includes(tag)) ? 1.25 : position.tags.includes("Dividend ETF") ? 0.75 : 1;
    return sum + pct(position.shares * position.currentPrice) * beta;
  }, 0);
  const volatilityExposure = portfolio.positions.reduce((sum, position) => {
    const vol = position.tags.some((tag) => ["AI server", "CoWoS", "Thermal", "Defense"].includes(tag)) ? 38 : position.tags.includes("Dividend ETF") ? 12 : 24;
    return sum + pct(position.shares * position.currentPrice) * vol / 100;
  }, 0);
  const correlationGroups = groupBy(portfolio.positions, (position) => {
    if (position.tags.some((tag) => ["AI server", "CoWoS", "Thermal", "PCB"].includes(tag))) return ["AI supply chain"];
    if (position.tags.includes("Shipping")) return ["Shipping cycle"];
    if (position.tags.includes("Dividend ETF")) return ["Yield factor"];
    return ["Other"];
  });
  const alerts: RiskAlert[] = [];
  portfolio.positions.forEach((position) => {
    const exposure = pct(position.shares * position.currentPrice);
    if (exposure > 20) alerts.push(makeAlert("high", "Position Risk", position.symbol, `Single position exposure ${exposure}% exceeds 20%.`, "Reduce position or increase cash buffer."));
    if (!position.stopLoss) alerts.push(makeAlert("high", "Position Risk", position.symbol, "Position has no stop loss or invalidation rule.", "Add stop and event invalidation rule."));
    if (position.stopLoss && position.currentPrice <= position.stopLoss) alerts.push(makeAlert("critical", "Position Risk", position.symbol, "Price is below stop loss.", "Review exit discipline immediately."));
  });
  Object.entries(themeExposure).forEach(([theme, value]) => {
    if (value > 40) alerts.push(makeAlert("high", "Portfolio Risk", undefined, `${theme} exposure ${value}% exceeds 40%.`, "Pause new plans in the same theme."));
  });
  Object.entries(eventDateExposure).forEach(([eventKey, value]) => {
    if (eventKey !== "No Event" && value > 35) alerts.push(makeAlert("medium", "Portfolio Risk", undefined, `Same-event exposure ${value}% is elevated.`, "Diversify event dates or reduce event-day risk."));
  });
  Object.entries(strategyExposure).forEach(([strategy, value]) => {
    if (value > 45) alerts.push(makeAlert("medium", "Portfolio Risk", undefined, `${strategy} exposure ${value}% is elevated.`, "Review strategy concentration."));
  });
  Object.entries(correlationGroups).forEach(([group, value]) => {
    if (value > 45) alerts.push(makeAlert("high", "Portfolio Risk", undefined, `${group} correlation-like exposure ${value}% is elevated.`, "Treat different names as correlated risk."));
  });
  if (pct(portfolio.cash) < 10) alerts.push(makeAlert("medium", "Portfolio Risk", undefined, "Cash is below 10%.", "Keep a buffer for event volatility."));
  return {
    totalAssetValue,
    cash: portfolio.cash,
    investedValue,
    investedPct: pct(investedValue),
    maxSinglePositionPct: Math.max(0, ...portfolio.positions.map((position) => pct(position.shares * position.currentPrice))),
    themeExposure,
    strategyExposure,
    eventDateExposure,
    marketBetaExposure: round(marketBetaExposure, 2),
    volatilityExposure: round(volatilityExposure, 2),
    correlationGroups,
    alerts,
    warnings: alerts.map((alert) => alert.message)
  };
}

export function analyzeBehaviorRisk(journal: JournalEntry[]): BehaviorAnalyticsResult {
  const closed = journal.filter((entry) => typeof entry.pnlPct === "number");
  const wins = closed.filter((entry) => (entry.pnlPct ?? 0) > 0);
  const losses = closed.filter((entry) => (entry.pnlPct ?? 0) < 0);
  const avg = (items: JournalEntry[]) => items.length ? items.reduce((sum, entry) => sum + (entry.pnlPct ?? 0), 0) / items.length : 0;
  const averageWin = avg(wins);
  const averageLoss = avg(losses);
  const winRate = closed.length ? wins.length / closed.length : 0;
  const grossWin = wins.reduce((sum, entry) => sum + Math.abs(entry.pnl ?? 0), 0);
  const grossLoss = losses.reduce((sum, entry) => sum + Math.abs(entry.pnl ?? 0), 0);
  const mistakeCounts = closed.reduce<Record<string, number>>((acc, entry) => {
    if (entry.mistakeType) acc[entry.mistakeType] = (acc[entry.mistakeType] ?? 0) + 1;
    return acc;
  }, {});
  const byStrategy = summarizeBy(closed, (entry) => entry.strategy);
  const byEvent = summarizeBy(closed, (entry) => entry.eventType ?? "unknown");
  const chaseRate = closed.length ? closed.filter((entry) => entry.didChaseNews).length / closed.length : 0;
  const pricedInRate = closed.length ? closed.filter((entry) => entry.wasEventPricedIn).length / closed.length : 0;
  const planBreakRate = closed.length ? closed.filter((entry) => !entry.planFollowed).length / closed.length : 0;
  const fomoRate = closed.length ? closed.filter((entry) => entry.emotion === "fomo").length / closed.length : 0;
  const noStopRate = closed.length ? closed.filter((entry) => entry.mistakeType?.toLowerCase().includes("no stop")).length / closed.length : 0;
  const addLoserRate = closed.length ? closed.filter((entry) => entry.mistakeType?.toLowerCase().includes("add loser")).length / closed.length : 0;
  const concentrationRate = closed.length ? closed.filter((entry) => entry.mistakeType?.toLowerCase().includes("concentration")).length / closed.length : 0;
  const earlyExitRate = closed.length ? closed.filter((entry) => entry.mistakeType?.toLowerCase().includes("early exit")).length / closed.length : 0;
  const behaviorScore = clamp(100 - chaseRate * 22 - pricedInRate * 24 - planBreakRate * 28 - fomoRate * 18 - noStopRate * 18 - addLoserRate * 25 - concentrationRate * 16 - earlyExitRate * 12);
  const warnings = [
    chaseRate > 0.25 ? "Event-news chasing rate is elevated." : "",
    pricedInRate > 0.25 ? "Entries after priced-in events are frequent." : "",
    planBreakRate > 0.25 ? "Plan-following discipline is weak." : "",
    noStopRate > 0.15 ? "No-stop behavior appears in journal records." : "",
    addLoserRate > 0.1 ? "Adding to losers appears in journal records." : "",
    concentrationRate > 0.1 ? "Over-concentration behavior appears in journal records." : "",
    earlyExitRate > 0.2 ? "Early exits appear frequent; compare with planned exits." : ""
  ].filter(Boolean);
  return {
    behaviorScore,
    totalTrades: closed.length,
    winRate: round(winRate * 100),
    averageWin: round(averageWin),
    averageLoss: round(averageLoss),
    expectancy: round(winRate * averageWin + (1 - winRate) * averageLoss),
    profitFactor: grossLoss > 0 ? round(grossWin / grossLoss, 2) : grossWin > 0 ? 99 : 0,
    mostCommonMistake: Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None recorded",
    bestStrategy: byStrategy.best,
    worstStrategy: byStrategy.worst,
    disciplineScore: clamp(100 - planBreakRate * 60 - fomoRate * 25),
    bestEventType: byEvent.best,
    worstEventType: byEvent.worst,
    warnings,
    suggestions: ["Write invalidation before sizing.", "Wait for pullback if pre-event return and volume are extended.", "Review FOMO and priced-in entries every week."]
  };
}

function summarizeBy(entries: JournalEntry[], keyFn: (entry: JournalEntry) => string): { best: string; worst: string } {
  const grouped = entries.reduce<Record<string, { sum: number; count: number }>>((acc, entry) => {
    const key = keyFn(entry);
    acc[key] = acc[key] ?? { sum: 0, count: 0 };
    acc[key].sum += entry.pnlPct ?? 0;
    acc[key].count += 1;
    return acc;
  }, {});
  const ranked = Object.entries(grouped).map(([key, value]) => [key, value.sum / value.count] as const).sort((a, b) => b[1] - a[1]);
  return { best: ranked[0]?.[0] ?? "N/A", worst: ranked[ranked.length - 1]?.[0] ?? "N/A" };
}

export { calculateCatalystTimingScore };
export { calculateAdaptivePositionSize } from "./positionSizing";

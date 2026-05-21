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
    pricedInRisk === "high" || pricedInRisk === "critical" ? "事件可能已被市場部分反應，追高風險上升。" : "",
    overheatPenalty >= 15 ? "技術面或量能過熱，優先等待回測。" : "",
    liquidityPenalty > 0 ? "流動性低於偏好門檻，應下修部位。" : ""
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
    explanation: `綜合 Alpha 分數結合催化 ${round(catalyst.totalCatalystScore)}、趨勢 ${round(quantTrendScore)}、籌碼 ${round(flowConfirmationScore)}、題材 ${round(themeMomentumScore)}，再扣除過熱、流動性、資料品質與已反應風險。`,
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
      warnings: [theme.isOverheated ? "題材已偏擁擠，避免追最熱標的。" : "", theme.dataSource === "Demo" ? "示範題材資料，非即時市場資料。" : ""].filter(Boolean),
      explanation: "題材熱度偏重剛升溫且多檔同步轉強，並扣除過度擁擠與漲停群聚風險。",
      dataSource: theme.dataSource,
      sourceNote: theme.sourceNote
    };
  }).sort((a, b) => b.heatScore - a.heatScore);
}

function makeAlert(severity: RiskLevel, category: RiskAlert["category"], symbol: string | undefined, message: string, suggestedAction: string): RiskAlert {
  return { id: `generated-${category}-${symbol ?? message}`, severity, category, symbol, message, suggestedAction, createdAt: new Date().toISOString(), dataSource: "Estimated", sourceNote: "由本機投組資料估算產生。" };
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
  const eventDateExposure = groupBy(portfolio.positions, (position) => [position.relatedEventId ?? "未關聯事件"]);
  const marketBetaExposure = portfolio.positions.reduce((sum, position) => {
    const beta = position.tags.some((tag) => ["AI server", "CoWoS", "PCB", "Thermal", "Defense"].includes(tag)) ? 1.25 : position.tags.includes("Dividend ETF") ? 0.75 : 1;
    return sum + pct(position.shares * position.currentPrice) * beta;
  }, 0);
  const volatilityExposure = portfolio.positions.reduce((sum, position) => {
    const vol = position.tags.some((tag) => ["AI server", "CoWoS", "Thermal", "Defense"].includes(tag)) ? 38 : position.tags.includes("Dividend ETF") ? 12 : 24;
    return sum + pct(position.shares * position.currentPrice) * vol / 100;
  }, 0);
  const correlationGroups = groupBy(portfolio.positions, (position) => {
    if (position.tags.some((tag) => ["AI server", "CoWoS", "Thermal", "PCB"].includes(tag))) return ["AI 供應鏈"];
    if (position.tags.includes("Shipping")) return ["航運循環"];
    if (position.tags.includes("Dividend ETF")) return ["殖利率因子"];
    return ["其他"];
  });
  const alerts: RiskAlert[] = [];
  portfolio.positions.forEach((position) => {
    const exposure = pct(position.shares * position.currentPrice);
    if (exposure > 20) alerts.push(makeAlert("high", "Position Risk", position.symbol, `單一股票曝險 ${exposure}% 超過 20%。`, "降低部位或提高現金緩衝。"));
    if (!position.stopLoss) alerts.push(makeAlert("high", "Position Risk", position.symbol, "尚未設定停損或事件失效條件。", "補上停損與事件失效規則。"));
    if (position.stopLoss && position.currentPrice <= position.stopLoss) alerts.push(makeAlert("critical", "Position Risk", position.symbol, "已跌破停損價。", "立即檢查出場紀律。"));
  });
  Object.entries(themeExposure).forEach(([theme, value]) => {
    if (value > 40) alerts.push(makeAlert("high", "Portfolio Risk", undefined, `${theme} 題材曝險 ${value}% 超過 40%。`, "暫停新增同題材計畫，先檢查既有部位停損。"));
  });
  Object.entries(eventDateExposure).forEach(([eventKey, value]) => {
    if (eventKey !== "未關聯事件" && value > 35) alerts.push(makeAlert("medium", "Portfolio Risk", undefined, `同一事件曝險 ${value}% 偏高。`, "分散事件日期或降低事件日前後風險。"));
  });
  Object.entries(strategyExposure).forEach(([strategy, value]) => {
    if (value > 45) alerts.push(makeAlert("medium", "Portfolio Risk", undefined, `${strategy} 策略曝險 ${value}% 偏高。`, "檢查策略集中度，避免單一 playbook 失效時受傷過大。"));
  });
  Object.entries(correlationGroups).forEach(([group, value]) => {
    if (value > 45) alerts.push(makeAlert("high", "Portfolio Risk", undefined, `${group} 相關性曝險 ${value}% 偏高。`, "即使股票不同，也要視為相近風險來源。"));
  });
  if (pct(portfolio.cash) < 10) alerts.push(makeAlert("medium", "Portfolio Risk", undefined, "現金比例低於 10%。", "保留事件波動所需的現金緩衝。"));
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
    chaseRate > 0.25 ? "追事件新聞的比例偏高。" : "",
    pricedInRate > 0.25 ? "買在事件已反應後的比例偏高。" : "",
    planBreakRate > 0.25 ? "未遵守交易計畫的比例偏高。" : "",
    noStopRate > 0.15 ? "日誌中出現未設停損行為。" : "",
    addLoserRate > 0.1 ? "日誌中出現虧損加碼行為。" : "",
    concentrationRate > 0.1 ? "日誌中出現過度集中行為。" : "",
    earlyExitRate > 0.2 ? "太早賣出的比例偏高，請與原計畫出場規則比較。" : ""
  ].filter(Boolean);
  return {
    behaviorScore,
    totalTrades: closed.length,
    winRate: round(winRate * 100),
    averageWin: round(averageWin),
    averageLoss: round(averageLoss),
    expectancy: round(winRate * averageWin + (1 - winRate) * averageLoss),
    profitFactor: grossLoss > 0 ? round(grossWin / grossLoss, 2) : grossWin > 0 ? 99 : 0,
    mostCommonMistake: Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "尚無紀錄",
    bestStrategy: byStrategy.best,
    worstStrategy: byStrategy.worst,
    disciplineScore: clamp(100 - planBreakRate * 60 - fomoRate * 25),
    bestEventType: byEvent.best,
    worstEventType: byEvent.worst,
    warnings,
    suggestions: ["部位試算前先寫下事件失效條件。", "若事件前漲幅與量能已放大，等待回測後再評估。", "每週檢查 FOMO 與買在已反應後的交易。"]
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
  return { best: ranked[0]?.[0] ?? "無資料", worst: ranked[ranked.length - 1]?.[0] ?? "無資料" };
}

export { calculateCatalystTimingScore };
export { calculateAdaptivePositionSize } from "./positionSizing";

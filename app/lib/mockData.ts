import type { AppSettings, DataStatus, Event, EventType, JournalEntry, Portfolio, RiskAlert, Stock, Theme, TradePlan } from "./types";
import { APP_VERSION, DEMO_SOURCE_NOTE, addDays } from "./utils";

const demo = { dataSource: "Demo" as const, sourceNote: DEMO_SOURCE_NOTE };
const now = () => new Date().toISOString();

type StockSeed = [string, string, string, string[], number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, boolean, boolean, number, number];

const stockSeeds: StockSeed[] = [
  ["2330", "TSMC", "Semiconductor", ["AI server", "CoWoS", "Semiconductor Equipment"], 928, 920, 24000, 96, 61, 3.2, 1.2, 1.25, 4.1, 8.8, 94, 68, 45, 18, 0, false, false, 22, 1.1],
  ["2317", "Hon Hai", "EMS", ["AI server", "EV"], 178, 176, 5700, 92, 58, 2.1, 0.8, 1.12, 3.2, 6.9, 88, 42, 28, 8, 6, false, false, 25, 1.05],
  ["2382", "Quanta", "AI Server", ["AI server"], 262, 259, 1800, 88, 66, 7.4, 1.4, 1.45, 8.5, 18.2, 91, 55, 32, 12, 11, false, false, 31, 1.25],
  ["3231", "Wistron", "AI Server", ["AI server"], 118, 116, 760, 83, 63, 4.8, 1.0, 1.36, 6.8, 13.7, 85, 39, 24, 8, 7, false, false, 34, 1.35],
  ["3661", "Alchip-KY", "ASIC", ["AI server", "Semiconductor Equipment"], 3150, 3090, 620, 70, 72, 11.2, 1.8, 1.9, 14.1, 31.5, 93, 50, 18, 20, 12, true, false, 48, 1.65],
  ["3037", "Unimicron", "PCB", ["PCB", "AI server"], 168, 164, 640, 78, 55, 1.8, 0.5, 1.05, 1.9, 5.2, 74, 26, 18, 4, 1, false, false, 29, 1.18],
  ["8046", "Nan Ya PCB", "PCB", ["PCB"], 214, 211, 420, 72, 52, -0.4, 0.2, 0.98, 0.8, 2.6, 63, 12, 8, 2, 2, false, false, 32, 1.22],
  ["3017", "Auras", "Thermal", ["Thermal", "AI server"], 545, 536, 740, 82, 69, 9.1, 1.6, 1.62, 11.6, 24.4, 89, 44, 35, 6, 13, false, false, 41, 1.45],
  ["3324", "Aavid", "Thermal", ["Thermal"], 735, 718, 430, 77, 70, 10.5, 1.7, 1.72, 12.8, 26.9, 87, 31, 22, 7, 11, true, false, 45, 1.5],
  ["3443", "GUC", "ASIC", ["AI server", "Semiconductor Equipment"], 1480, 1455, 520, 74, 57, 1.2, 0.6, 1.08, 2.7, 7.1, 79, 18, 11, 4, 3, false, false, 38, 1.38],
  ["2454", "MediaTek", "IC Design", ["AI server", "Semiconductor Equipment"], 1280, 1275, 2050, 90, 49, -1.5, -0.1, 0.94, -0.6, 1.8, 68, 10, 8, -3, 0, false, false, 24, 1.02],
  ["2308", "Delta", "Power", ["AI server", "EV"], 388, 384, 1500, 86, 60, 2.8, 0.7, 1.18, 3.5, 8.2, 82, 34, 22, 8, 4, false, false, 26, 0.95],
  ["3008", "Largan", "Optics", ["EV", "Robot"], 2580, 2550, 590, 64, 48, -2.0, -0.4, 0.9, -1.2, -2.1, 45, -5, -4, 1, 0, false, false, 27, 0.88],
  ["2603", "Evergreen", "Shipping", ["Shipping", "Dividend ETF"], 198, 194, 720, 85, 59, 3.8, 0.8, 1.22, 5.8, 9.5, 76, 20, 14, 3, 5, false, false, 30, 1.1],
  ["2615", "Wan Hai", "Shipping", ["Shipping"], 77, 76, 230, 72, 64, 6.6, 1.1, 1.38, 8.1, 16.4, 78, 14, 8, 4, 7, false, false, 43, 1.5],
  ["6505", "Formosa Petrochemical", "Energy", ["Dividend ETF"], 64, 65, 440, 76, 39, -5.2, -0.9, 0.8, -4.6, -7.9, 24, -18, -9, -5, 0, false, false, 19, 0.72],
  ["006208", "Fubon Taiwan 50", "ETF", ["Dividend ETF"], 112, 111, 300, 98, 56, 1.1, 0.3, 1.02, 1.2, 3.1, 66, 0, 0, 0, 0, false, false, 14, 0.98],
  ["00878", "Cathay High Dividend", "ETF", ["Dividend ETF"], 23.1, 23, 210, 94, 54, 0.7, 0.2, 1.01, 0.9, 2.4, 60, 0, 0, 0, 0, false, false, 10, 0.65],
  ["9958", "Century Iron", "Defense", ["Defense"], 238, 232, 390, 69, 73, 13.6, 1.8, 2.1, 18.5, 35.4, 86, 16, 10, 5, 15, true, true, 58, 1.7],
  ["1795", "Lotus Pharma", "Biotech", ["Biotech"], 286, 284, 250, 66, 51, 0.8, 0.2, 1.04, 1.6, 4.0, 57, 6, 4, 1, 1, false, false, 28, 0.9]
];

export const mockStocks: Stock[] = stockSeeds.map(([symbol, name, sector, themes, price, previousClose, marketCapBillion, liquidityScore, rsi14, ma20DistancePct, ma20Slope, volumeRatio, sevenDayReturnPct, twentyDayReturnPct, relativeStrengthRank, institutionalFlow5d, foreignFlow5d, investmentTrustFlow5d, dealerFlow5d, isAttentionStock, isDispositionStock, volatility20d, beta]) => ({
  symbol,
  name,
  sector,
  themes,
  price,
  previousClose,
  marketCapBillion,
  liquidityScore,
  rsi14,
  ma20DistancePct,
  ma20Slope,
  volumeRatio,
  sevenDayReturnPct,
  twentyDayReturnPct,
  relativeStrengthRank,
  institutionalFlow5d,
  foreignFlow5d,
  investmentTrustFlow5d,
  dealerFlow5d,
  limitUpCount10d: Math.max(0, Math.round((volumeRatio - 1) * 2)),
  isAttentionStock,
  isDispositionStock,
  volatility20d,
  beta,
  ...demo
}));

export const mockThemes: Theme[] = [
  ["ai", "AI server", ["2330", "2317", "2382", "3231", "3661", "3017"], 36, 22, 11, 78, 5, 2, false],
  ["cowos", "CoWoS", ["2330", "3661", "3443"], 18, 13, 5, 66, 3, 1, false],
  ["hbm", "HBM", ["2330", "2454"], 11, 7, 3, 54, 2, 0, false],
  ["thermal", "Thermal", ["3017", "3324"], 24, 10, 6, 69, 4, 3, true],
  ["pcb", "PCB", ["3037", "8046"], 16, 12, 4, 50, 2, 0, false],
  ["silicon", "Silicon Photonics", ["3443", "3661"], 9, 4, 2, 42, 1, 0, false],
  ["semi", "Semiconductor Equipment", ["2330", "2454", "3443", "3661"], 22, 20, 6, 48, 1, 0, false],
  ["memory", "Memory", ["2330"], 14, 8, 2, 52, 1, 0, false],
  ["robot", "Robot", ["3008"], 12, 6, 2, 39, 1, 0, false],
  ["defense", "Defense", ["9958"], 21, 9, 3, 46, 2, 2, true],
  ["dividend", "Dividend ETF", ["00878", "006208", "2603", "6505"], 10, 11, 4, 22, 0, 0, false],
  ["ev", "EV", ["2317", "2308", "3008"], 8, 9, 2, 18, 0, 0, false],
  ["bio", "Biotech", ["1795"], 7, 5, 2, 25, 0, 0, false],
  ["shipping", "Shipping", ["2603", "2615"], 19, 8, 4, 45, 2, 1, false]
].map(([id, name, relatedSymbols, sevenDayNewsCount, priorSevenDayNewsCount, sevenDayEventCount, institutionalFlowScore, synchronizedBreakoutCount, limitUpClusterCount, isOverheated]) => ({
  id,
  name,
  relatedSymbols,
  sevenDayNewsCount,
  priorSevenDayNewsCount,
  sevenDayEventCount,
  institutionalFlowScore,
  synchronizedBreakoutCount,
  limitUpClusterCount,
  isOverheated,
  source: "Demo theme tape",
  ...demo
} as Theme));

const futureSpecs: Array<[string, string, EventType, string, number, number, number, string[]]> = [
  ["2330", "TSMC", "investorConference", "Quarterly investor conference and CoWoS update", 2, 92, 72, ["AI server", "CoWoS"]],
  ["2382", "Quanta", "monthlyRevenue", "Monthly revenue and AI server shipment check", 3, 84, 58, ["AI server"]],
  ["3231", "Wistron", "orderContract", "Server order progress update", 6, 78, 52, ["AI server"]],
  ["3037", "Unimicron", "industryConference", "PCB industry forum", 4, 70, 44, ["PCB"]],
  ["3017", "Auras", "productLaunch", "Thermal product update", 5, 82, 75, ["Thermal", "AI server"]],
  ["9958", "Century Iron", "policy", "Defense policy budget briefing", 1, 75, 88, ["Defense"]],
  ["2603", "Evergreen", "exDividend", "Ex-dividend date", 7, 58, 62, ["Shipping", "Dividend ETF"]],
  ["00878", "Cathay High Dividend", "etfRebalance", "ETF constituent review", 4, 63, 48, ["Dividend ETF"]],
  ["3661", "Alchip-KY", "earnings", "Earnings and ASIC outlook", 8, 88, 90, ["AI server"]],
  ["2308", "Delta", "aiServerNews", "AI power supply chain update", 2, 76, 50, ["AI server", "EV"]],
  ["3443", "GUC", "foreignBrokerReport", "Broker research meeting metadata", 9, 68, 46, ["AI server", "Semiconductor Equipment"]],
  ["8046", "Nan Ya PCB", "monthlyRevenue", "Low-base monthly revenue check", 5, 62, 38, ["PCB"]],
  ["2615", "Wan Hai", "monthlyRevenue", "Freight rate and revenue watch", 6, 67, 60, ["Shipping"]],
  ["1795", "Lotus Pharma", "productLaunch", "Drug licensing progress update", 3, 61, 35, ["Biotech"]],
  ["2454", "MediaTek", "industryConference", "IC design industry session", 10, 55, 40, ["Semiconductor Equipment"]],
  ["3324", "Aavid", "attentionStock", "Attention-stock risk check", 2, 74, 86, ["Thermal"]],
  ["2317", "Hon Hai", "investorConference", "EV and AI server business update", 11, 72, 50, ["AI server", "EV"]],
  ["006208", "Fubon Taiwan 50", "etfRebalance", "Index weight adjustment", 12, 44, 30, ["Dividend ETF"]],
  ["3008", "Largan", "earnings", "Earnings and product cycle", 13, 50, 34, ["Robot", "EV"]],
  ["6505", "Formosa Petrochemical", "buyback", "Buyback progress update", 14, 53, 28, ["Dividend ETF"]],
  ["2330", "TSMC", "semiconductorNews", "Advanced packaging supply-chain meeting", 6, 86, 70, ["CoWoS", "Semiconductor Equipment"]],
  ["3037", "Unimicron", "supplyChainNews", "ABF substrate supply-chain check", 9, 64, 42, ["PCB"]],
  ["2308", "Delta", "orderContract", "Data-center power order rumor validation", 5, 73, 47, ["AI server"]],
  ["2382", "Quanta", "aiServerNews", "AI server shipment news tracking", 1, 80, 76, ["AI server"]],
  ["3231", "Wistron", "etfRebalance", "ETF weight candidate", 15, 66, 53, ["AI server"]],
  ["9958", "Century Iron", "dispositionStock", "Disposition-stock trading restriction check", 4, 65, 92, ["Defense"]],
  ["3661", "Alchip-KY", "convertibleBond", "Convertible bond financing briefing", 16, 60, 72, ["AI server"]],
  ["2603", "Evergreen", "shareholderMeetingGift", "Shareholder gift theme tracking", 18, 40, 58, ["Shipping"]],
  ["2317", "Hon Hai", "majorHolderChange", "Director shareholding disclosure", 6, 57, 39, ["EV"]],
  ["1795", "Lotus Pharma", "foreignBrokerReport", "Broker pre-event metadata tracking", 20, 52, 32, ["Biotech"]]
];

export const mockEvents: Event[] = futureSpecs.map(([symbol, name, eventType, eventTitle, days, expectedImpact, marketAwareness, relatedThemes], index) => ({
  id: `evt-${index + 1}`,
  symbol,
  name,
  eventType,
  eventTitle,
  eventDate: addDays(days),
  eventTime: index % 3 === 0 ? "14:30" : undefined,
  source: "Demo event calendar",
  sourceUrl: "https://example.com/demo-event",
  confidence: Math.max(35, Math.min(95, expectedImpact - (index % 4) * 5)),
  expectedImpact,
  marketAwareness,
  relatedThemes,
  createdAt: now(),
  updatedAt: now(),
  ...demo
}));

export const mockHistoricalEvents: Event[] = Array.from({ length: 20 }, (_, index) => {
  const stock = mockStocks[index % mockStocks.length];
  return {
    id: `hist-${index + 1}`,
    symbol: stock.symbol,
    name: stock.name,
    eventType: ["earnings", "monthlyRevenue", "investorConference", "etfRebalance", "supplyChainNews"][index % 5] as EventType,
    eventTitle: `Historical event study sample ${index + 1}`,
    eventDate: addDays(-index - 2),
    eventTime: "14:00",
    source: "Demo historical event set",
    sourceUrl: "https://example.com/demo-history",
    confidence: 55 + (index % 5) * 8,
    expectedImpact: 50 + (index % 6) * 7,
    marketAwareness: 35 + (index % 7) * 8,
    relatedThemes: stock.themes,
    createdAt: now(),
    updatedAt: now(),
    ...demo
  };
});

export const mockTradePlans: TradePlan[] = [
  ["plan-1", "2330", "TSMC", "Low Base Catalyst", "evt-1", 1000000, 1, 18, 928, 884, 990, 1040],
  ["plan-2", "3037", "Unimicron", "Event Pullback", "evt-4", 800000, 0.8, 12, 168, 158, 184, 196],
  ["plan-3", "2308", "Delta", "AI Theme Rotation", "evt-10", 900000, 1, 15, 388, 369, 420, 448],
  ["plan-4", "00878", "Cathay High Dividend", "ETF Rebalance Flow", "evt-8", 600000, 0.5, 20, 23.1, 22.4, 24.2, 25.1],
  ["plan-5", "1795", "Lotus Pharma", "Manual Event Research", "evt-14", 500000, 0.8, 10, 286, 272, 310, 330]
].map(([id, symbol, name, strategy, relatedEventId, capital, riskPerTradePct, maxPositionPct, entryPrice, stopLoss, takeProfit1, takeProfit2]) => {
  const perShareRisk = Number(entryPrice) - Number(stopLoss);
  const maxRiskAmount = Number(capital) * (Number(riskPerTradePct) / 100);
  const suggestedShares = Math.floor(maxRiskAmount / perShareRisk);
  const estimatedCost = suggestedShares * Number(entryPrice);
  return {
    id: String(id),
    symbol: String(symbol),
    name: String(name),
    strategy: strategy as TradePlan["strategy"],
    relatedEventId: String(relatedEventId),
    eventDate: mockEvents.find((event) => event.id === relatedEventId)?.eventDate,
    capital: Number(capital),
    riskPerTradePct: Number(riskPerTradePct),
    maxPositionPct: Number(maxPositionPct),
    entryPrice: Number(entryPrice),
    stopLoss: Number(stopLoss),
    takeProfit1: Number(takeProfit1),
    takeProfit2: Number(takeProfit2),
    eventInvalidationRule: "Review if thesis fails or stop loss breaks.",
    timeStopRule: "Reduce risk if no follow-through within 3 trading days.",
    suggestedShares,
    estimatedCost,
    positionPct: estimatedCost / Number(capital) * 100,
    maxRiskAmount,
    riskReward1: (Number(takeProfit1) - Number(entryPrice)) / perShareRisk,
    riskReward2: (Number(takeProfit2) - Number(entryPrice)) / perShareRisk,
    warnings: ["Demo plan only; verify real prices manually."],
    createdAt: now(),
    updatedAt: now(),
    ...demo
  };
});

export const mockPortfolio: Portfolio = {
  cash: 320000,
  positions: [
    { id: "pos-1", symbol: "2330", name: "TSMC", shares: 300, averageCost: 880, currentPrice: 928, tags: ["AI server", "CoWoS"], strategy: "Low Base Catalyst", relatedEventId: "evt-1", stopLoss: 884, takeProfit1: 990, takeProfit2: 1040, notes: "Demo holding", ...demo },
    { id: "pos-2", symbol: "3037", name: "Unimicron", shares: 1000, averageCost: 160, currentPrice: 168, tags: ["PCB"], strategy: "Event Pullback", relatedEventId: "evt-4", stopLoss: 158, notes: "Demo holding", ...demo },
    { id: "pos-3", symbol: "2308", name: "Delta", shares: 500, averageCost: 372, currentPrice: 388, tags: ["AI server", "EV"], strategy: "AI Theme Rotation", relatedEventId: "evt-10", stopLoss: 369, notes: "Demo holding", ...demo },
    { id: "pos-4", symbol: "9958", name: "Century Iron", shares: 400, averageCost: 226, currentPrice: 238, tags: ["Defense"], strategy: "Manual Event Research", relatedEventId: "evt-6", notes: "No stop demo alert", ...demo }
  ],
  updatedAt: now(),
  ...demo
};

export const mockJournal: JournalEntry[] = Array.from({ length: 8 }, (_, index) => {
  const stock = mockStocks[index % mockStocks.length];
  const pnlPct = [6.2, -2.8, 3.1, -5.4, 1.7, 8.5, -1.9, 2.4][index];
  return {
    id: `journal-${index + 1}`,
    date: addDays(-index - 1),
    symbol: stock.symbol,
    name: stock.name,
    action: index % 3 === 0 ? "exited" : "review",
    strategy: ["Low Base Catalyst", "Event Pullback", "AI Theme Rotation", "ETF Rebalance Flow"][index % 4] as TradePlan["strategy"],
    relatedEventId: `hist-${index + 1}`,
    eventType: ["earnings", "monthlyRevenue", "investorConference", "etfRebalance"][index % 4] as EventType,
    price: stock.price,
    shares: 200 + index * 100,
    reason: "Demo journal entry for behavior analytics.",
    eventThesis: "Event catalyst with technical and flow confirmation.",
    eventOutcome: pnlPct > 0 ? "Event continued" : "Event was already priced in",
    wasEventPricedIn: index % 4 === 1,
    didChaseNews: index % 5 === 2,
    planFollowed: index % 4 !== 1,
    emotion: index % 5 === 2 ? "fomo" : "disciplined",
    mistakeType: index % 4 === 1 ? "entered after event was priced in" : undefined,
    pnl: Math.round(stock.price * (200 + index * 100) * pnlPct / 100),
    pnlPct,
    review: "Demo review. Not investment advice.",
    ...demo
  };
});

export const mockRiskAlerts: RiskAlert[] = [
  ["risk-1", "high", "Event Risk", "9958", "Disposition stock and pre-event return is elevated.", "Avoid chasing and check risk."],
  ["risk-2", "medium", "Portfolio Risk", undefined, "AI theme exposure is elevated.", "Review theme concentration before new plans."],
  ["risk-3", "medium", "Behavior Risk", undefined, "Recent journal has event-news chasing behavior.", "Require a trade plan before action."],
  ["risk-4", "high", "Position Risk", "9958", "Position has no stop loss.", "Add invalidation and stop rules."],
  ["risk-5", "medium", "Data Risk", "3443", "Broker report is metadata only, not full text.", "Do not treat metadata as a full conclusion."],
  ["risk-6", "low", "Event Risk", "00878", "ETF rebalance may fade after effective date.", "Watch post-event pullback."],
  ["risk-7", "high", "Event Risk", "3324", "Theme heat and RSI are elevated.", "Wait for pullback."],
  ["risk-8", "medium", "Portfolio Risk", undefined, "Event density is high this week.", "Reduce incremental risk."],
  ["risk-9", "low", "Data Risk", undefined, "All seeded data is demo.", "Import manual data before real research."],
  ["risk-10", "medium", "Position Risk", "2330", "Pre-event volatility may expand.", "Review position size and stop."]
].map(([id, severity, category, symbol, message, suggestedAction]) => ({
  id,
  severity,
  category,
  symbol,
  message,
  suggestedAction,
  createdAt: now(),
  ...demo
} as RiskAlert));

export const mockDataStatus: DataStatus[] = [
  "price data",
  "volume data",
  "institutional flow",
  "monthly revenue",
  "earnings",
  "dividend",
  "investor conference",
  "ETF rebalance",
  "broker report metadata",
  "shareholder gift",
  "major holder change",
  "attention / disposition",
  "theme news",
  "market regime",
  "benchmark"
].map((type, index) => ({
  id: `data-${index + 1}`,
  type,
  lastUpdated: now(),
  source: "Demo seed dataset",
  sourceUrl: "https://example.com/demo-data",
  missingFields: index % 3 === 0 ? ["real-time feed", "verified source"] : ["real-time feed"],
  warning: "Demo only. Replace with manual/imported data before real research.",
  confidence: 40 + (index % 5) * 8,
  ...demo
}));

export const mockSettings: AppSettings = {
  dataMode: "Demo",
  appVersion: APP_VERSION,
  enableDemoData: true,
  baseCapital: 1000000,
  defaultRiskPerTradePct: 1,
  timezone: "Asia/Taipei",
  ...demo
};

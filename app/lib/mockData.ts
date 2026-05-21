import type { AppSettings, DataStatus, Event, EventType, JournalEntry, Portfolio, RiskAlert, Stock, Theme, TradePlan } from "./types";
import { APP_VERSION, DEMO_SOURCE_NOTE, addDays } from "./utils";

const demo = { dataSource: "Demo" as const, sourceNote: DEMO_SOURCE_NOTE };
const now = () => new Date().toISOString();

type StockSeed = [string, string, string, string[], number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, boolean, boolean, number, number];

const stockSeeds: StockSeed[] = [
  ["2330", "台積電", "半導體", ["AI server", "CoWoS", "Semiconductor Equipment"], 928, 920, 24000, 96, 61, 3.2, 1.2, 1.25, 4.1, 8.8, 94, 68, 45, 18, 0, false, false, 22, 1.1],
  ["2317", "鴻海", "電子代工", ["AI server", "EV"], 178, 176, 5700, 92, 58, 2.1, 0.8, 1.12, 3.2, 6.9, 88, 42, 28, 8, 6, false, false, 25, 1.05],
  ["2382", "廣達", "AI 伺服器", ["AI server"], 262, 259, 1800, 88, 66, 7.4, 1.4, 1.45, 8.5, 18.2, 91, 55, 32, 12, 11, false, false, 31, 1.25],
  ["3231", "緯創", "AI 伺服器", ["AI server"], 118, 116, 760, 83, 63, 4.8, 1.0, 1.36, 6.8, 13.7, 85, 39, 24, 8, 7, false, false, 34, 1.35],
  ["3661", "世芯-KY", "ASIC", ["AI server", "Semiconductor Equipment"], 3150, 3090, 620, 70, 72, 11.2, 1.8, 1.9, 14.1, 31.5, 93, 50, 18, 20, 12, true, false, 48, 1.65],
  ["3037", "欣興", "PCB / 載板", ["PCB", "AI server"], 168, 164, 640, 78, 55, 1.8, 0.5, 1.05, 1.9, 5.2, 74, 26, 18, 4, 1, false, false, 29, 1.18],
  ["8046", "南電", "PCB / 載板", ["PCB"], 214, 211, 420, 72, 52, -0.4, 0.2, 0.98, 0.8, 2.6, 63, 12, 8, 2, 2, false, false, 32, 1.22],
  ["3017", "奇鋐", "散熱", ["Thermal", "AI server"], 545, 536, 740, 82, 69, 9.1, 1.6, 1.62, 11.6, 24.4, 89, 44, 35, 6, 13, false, false, 41, 1.45],
  ["3324", "雙鴻", "散熱", ["Thermal"], 735, 718, 430, 77, 70, 10.5, 1.7, 1.72, 12.8, 26.9, 87, 31, 22, 7, 11, true, false, 45, 1.5],
  ["3443", "創意", "IC 設計", ["AI server", "Semiconductor Equipment"], 1480, 1455, 520, 74, 57, 1.2, 0.6, 1.08, 2.7, 7.1, 79, 18, 11, 4, 3, false, false, 38, 1.38],
  ["2454", "聯發科", "IC 設計", ["AI server", "Semiconductor Equipment"], 1280, 1275, 2050, 90, 49, -1.5, -0.1, 0.94, -0.6, 1.8, 68, 10, 8, -3, 0, false, false, 24, 1.02],
  ["2308", "台達電", "電源供應", ["AI server", "EV"], 388, 384, 1500, 86, 60, 2.8, 0.7, 1.18, 3.5, 8.2, 82, 34, 22, 8, 4, false, false, 26, 0.95],
  ["3008", "大立光", "光學", ["EV", "Robot"], 2580, 2550, 590, 64, 48, -2.0, -0.4, 0.9, -1.2, -2.1, 45, -5, -4, 1, 0, false, false, 27, 0.88],
  ["2603", "長榮", "航運", ["Shipping", "Dividend ETF"], 198, 194, 720, 85, 59, 3.8, 0.8, 1.22, 5.8, 9.5, 76, 20, 14, 3, 5, false, false, 30, 1.1],
  ["2615", "萬海", "航運", ["Shipping"], 77, 76, 230, 72, 64, 6.6, 1.1, 1.38, 8.1, 16.4, 78, 14, 8, 4, 7, false, false, 43, 1.5],
  ["6505", "台塑化", "能源", ["Dividend ETF"], 64, 65, 440, 76, 39, -5.2, -0.9, 0.8, -4.6, -7.9, 24, -18, -9, -5, 0, false, false, 19, 0.72],
  ["006208", "富邦台50", "ETF", ["Dividend ETF"], 112, 111, 300, 98, 56, 1.1, 0.3, 1.02, 1.2, 3.1, 66, 0, 0, 0, 0, false, false, 14, 0.98],
  ["00878", "國泰永續高股息", "ETF", ["Dividend ETF"], 23.1, 23, 210, 94, 54, 0.7, 0.2, 1.01, 0.9, 2.4, 60, 0, 0, 0, 0, false, false, 10, 0.65],
  ["9958", "世紀鋼", "軍工", ["Defense"], 238, 232, 390, 69, 73, 13.6, 1.8, 2.1, 18.5, 35.4, 86, 16, 10, 5, 15, true, true, 58, 1.7],
  ["1795", "美時", "生技", ["Biotech"], 286, 284, 250, 66, 51, 0.8, 0.2, 1.04, 1.6, 4.0, 57, 6, 4, 1, 1, false, false, 28, 0.9]
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
  source: "示範題材資料",
  ...demo
} as Theme));

const futureSpecs: Array<[string, string, EventType, string, number, number, number, string[]]> = [
  ["2330", "台積電", "investorConference", "季度法說會與 CoWoS 產能更新", 2, 92, 72, ["AI server", "CoWoS"]],
  ["2382", "廣達", "monthlyRevenue", "AI 伺服器出貨與月營收檢查", 3, 84, 58, ["AI server"]],
  ["3231", "緯創", "orderContract", "伺服器訂單進度更新", 6, 78, 52, ["AI server"]],
  ["3037", "欣興", "industryConference", "PCB / 載板產業論壇", 4, 70, 44, ["PCB"]],
  ["3017", "奇鋐", "productLaunch", "散熱新品與水冷方案更新", 5, 82, 75, ["Thermal", "AI server"]],
  ["9958", "世紀鋼", "policy", "軍工政策與預算題材追蹤", 1, 75, 88, ["Defense"]],
  ["2603", "長榮", "exDividend", "除息日與高股息資金檢查", 7, 58, 62, ["Shipping", "Dividend ETF"]],
  ["00878", "國泰永續高股息", "etfRebalance", "ETF 成分與權重檢視", 4, 63, 48, ["Dividend ETF"]],
  ["3661", "世芯-KY", "earnings", "財報與 ASIC 展望檢查", 8, 88, 90, ["AI server"]],
  ["2308", "台達電", "aiServerNews", "AI 電源供應鏈題材更新", 2, 76, 50, ["AI server", "EV"]],
  ["3443", "創意", "foreignBrokerReport", "外資報告 metadata 與法人會議追蹤", 9, 68, 46, ["AI server", "Semiconductor Equipment"]],
  ["8046", "南電", "monthlyRevenue", "低基期月營收檢查", 5, 62, 38, ["PCB"]],
  ["2615", "萬海", "monthlyRevenue", "運價與月營收觀察", 6, 67, 60, ["Shipping"]],
  ["1795", "美時", "productLaunch", "授權與產品進度更新", 3, 61, 35, ["Biotech"]],
  ["2454", "聯發科", "industryConference", "IC 設計產業會議", 10, 55, 40, ["Semiconductor Equipment"]],
  ["3324", "雙鴻", "attentionStock", "注意股風險檢查", 2, 74, 86, ["Thermal"]],
  ["2317", "鴻海", "investorConference", "電動車與 AI 伺服器業務更新", 11, 72, 50, ["AI server", "EV"]],
  ["006208", "富邦台50", "etfRebalance", "指數權重調整檢查", 12, 44, 30, ["Dividend ETF"]],
  ["3008", "大立光", "earnings", "財報與產品週期檢查", 13, 50, 34, ["Robot", "EV"]],
  ["6505", "台塑化", "buyback", "庫藏股進度更新", 14, 53, 28, ["Dividend ETF"]],
  ["2330", "台積電", "semiconductorNews", "先進封裝供應鏈會議追蹤", 6, 86, 70, ["CoWoS", "Semiconductor Equipment"]],
  ["3037", "欣興", "supplyChainNews", "ABF 載板供應鏈檢查", 9, 64, 42, ["PCB"]],
  ["2308", "台達電", "orderContract", "資料中心電源訂單傳聞驗證", 5, 73, 47, ["AI server"]],
  ["2382", "廣達", "aiServerNews", "AI 伺服器出貨新聞追蹤", 1, 80, 76, ["AI server"]],
  ["3231", "緯創", "etfRebalance", "ETF 權重候選追蹤", 15, 66, 53, ["AI server"]],
  ["9958", "世紀鋼", "dispositionStock", "處置股交易限制檢查", 4, 65, 92, ["Defense"]],
  ["3661", "世芯-KY", "convertibleBond", "可轉債籌資說明會", 16, 60, 72, ["AI server"]],
  ["2603", "長榮", "shareholderMeetingGift", "股東會紀念品題材追蹤", 18, 40, 58, ["Shipping"]],
  ["2317", "鴻海", "majorHolderChange", "董監持股申報檢查", 6, 57, 39, ["EV"]],
  ["1795", "美時", "foreignBrokerReport", "外資報告 metadata 事件前追蹤", 20, 52, 32, ["Biotech"]]
];

export const mockEvents: Event[] = futureSpecs.map(([symbol, name, eventType, eventTitle, days, expectedImpact, marketAwareness, relatedThemes], index) => ({
  id: `evt-${index + 1}`,
  symbol,
  name,
  eventType,
  eventTitle,
  eventDate: addDays(days),
  eventTime: index % 3 === 0 ? "14:30" : undefined,
  source: "示範事件日曆",
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
    eventTitle: `歷史事件研究示範樣本 ${index + 1}`,
    eventDate: addDays(-index - 2),
    eventTime: "14:00",
    source: "示範歷史事件集",
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
  ["plan-1", "2330", "台積電", "Low Base Catalyst", "evt-1", 1000000, 1, 18, 928, 884, 990, 1040],
  ["plan-2", "3037", "欣興", "Event Pullback", "evt-4", 800000, 0.8, 12, 168, 158, 184, 196],
  ["plan-3", "2308", "台達電", "AI Theme Rotation", "evt-10", 900000, 1, 15, 388, 369, 420, 448],
  ["plan-4", "00878", "國泰永續高股息", "ETF Rebalance Flow", "evt-8", 600000, 0.5, 20, 23.1, 22.4, 24.2, 25.1],
  ["plan-5", "1795", "美時", "Manual Event Research", "evt-14", 500000, 0.8, 10, 286, 272, 310, 330]
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
    eventInvalidationRule: "若事件假設失效或跌破停損，必須重新檢查。",
    timeStopRule: "若 3 個交易日內沒有延續，降低風險或移出高優先研究。",
    suggestedShares,
    estimatedCost,
    positionPct: estimatedCost / Number(capital) * 100,
    maxRiskAmount,
    riskReward1: (Number(takeProfit1) - Number(entryPrice)) / perShareRisk,
    riskReward2: (Number(takeProfit2) - Number(entryPrice)) / perShareRisk,
    warnings: ["示範交易計畫，進入實際研究前請手動確認價格與資料來源。"],
    createdAt: now(),
    updatedAt: now(),
    ...demo
  };
});

export const mockPortfolio: Portfolio = {
  cash: 320000,
  positions: [
    { id: "pos-1", symbol: "2330", name: "台積電", shares: 300, averageCost: 880, currentPrice: 928, tags: ["AI server", "CoWoS"], strategy: "Low Base Catalyst", relatedEventId: "evt-1", stopLoss: 884, takeProfit1: 990, takeProfit2: 1040, notes: "示範持股", ...demo },
    { id: "pos-2", symbol: "3037", name: "欣興", shares: 1000, averageCost: 160, currentPrice: 168, tags: ["PCB"], strategy: "Event Pullback", relatedEventId: "evt-4", stopLoss: 158, notes: "示範持股", ...demo },
    { id: "pos-3", symbol: "2308", name: "台達電", shares: 500, averageCost: 372, currentPrice: 388, tags: ["AI server", "EV"], strategy: "AI Theme Rotation", relatedEventId: "evt-10", stopLoss: 369, notes: "示範持股", ...demo },
    { id: "pos-4", symbol: "9958", name: "世紀鋼", shares: 400, averageCost: 226, currentPrice: 238, tags: ["Defense"], strategy: "Manual Event Research", relatedEventId: "evt-6", notes: "示範警示：尚未設定停損", ...demo }
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
    reason: "示範日誌，用來測試行為分析與紀律統計。",
    eventThesis: "事件催化具備技術面與籌碼確認，但仍需檢查是否已反應。",
    eventOutcome: pnlPct > 0 ? "事件後仍有延續" : "事件可能已提前反應",
    wasEventPricedIn: index % 4 === 1,
    didChaseNews: index % 5 === 2,
    planFollowed: index % 4 !== 1,
    emotion: index % 5 === 2 ? "fomo" : "disciplined",
    mistakeType: index % 4 === 1 ? "買在已反應後" : undefined,
    pnl: Math.round(stock.price * (200 + index * 100) * pnlPct / 100),
    pnlPct,
    review: "示範檢討：此資料僅用於 MVP 測試，不構成投資建議。",
    ...demo
  };
});

export const mockRiskAlerts: RiskAlert[] = [
  ["risk-1", "high", "Event Risk", "9958", "處置股且事件前漲幅偏高，已反應風險上升。", "避免追高，先檢查風險與流動性。"],
  ["risk-2", "medium", "Portfolio Risk", undefined, "AI 題材曝險偏高。", "新增交易計畫前先檢查題材集中度。"],
  ["risk-3", "medium", "Behavior Risk", undefined, "近期日誌出現追事件新聞的行為。", "進一步研究前必須先建立交易計畫。"],
  ["risk-4", "high", "Position Risk", "9958", "部位尚未設定停損。", "補上事件失效條件與停損規則。"],
  ["risk-5", "medium", "Data Risk", "3443", "外資報告僅有 metadata，不包含報告全文。", "不要把 metadata 當成完整結論。"],
  ["risk-6", "low", "Event Risk", "00878", "ETF 調整生效後可能出現利多鈍化。", "觀察事件後第一次健康回檔。"],
  ["risk-7", "high", "Event Risk", "3324", "題材熱度與 RSI 偏高。", "等待回測，不追高。"],
  ["risk-8", "medium", "Portfolio Risk", undefined, "本週事件密度偏高。", "降低新增風險，避免同一天事件曝險集中。"],
  ["risk-9", "low", "Data Risk", undefined, "目前所有種子資料都是示範資料。", "進入實際研究前請匯入或手動建立資料。"],
  ["risk-10", "medium", "Position Risk", "2330", "事件前波動可能擴大。", "檢查部位大小與停損距離。"]
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
  "股價資料",
  "成交量資料",
  "法人籌碼",
  "月營收",
  "財報",
  "除權息",
  "法說會",
  "ETF 成分調整",
  "外資報告 metadata",
  "股東會紀念品",
  "大戶持股變化",
  "注意股 / 處置股",
  "題材新聞",
  "市場狀態",
  "Benchmark"
].map((type, index) => ({
  id: `data-${index + 1}`,
  type,
  lastUpdated: now(),
  source: "示範種子資料集",
  sourceUrl: "https://example.com/demo-data",
  missingFields: index % 3 === 0 ? ["即時資料源", "正式來源驗證"] : ["即時資料源"],
  warning: "僅為示範資料。進入實際研究前，請改用手動或匯入資料。",
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

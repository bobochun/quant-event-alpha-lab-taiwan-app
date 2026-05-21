import type { DataSource, EventType, MarketRegime, NextAction, RiskLevel, StrategyName } from "./types";

export const DEMO_SOURCE_NOTE = "示範資料，不是真實即時市場資料。";
export const APP_VERSION = "0.1.0-super-mvp";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayTaipei(): Date {
  const taipei = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  taipei.setHours(0, 0, 0, 0);
  return taipei;
}

export function addDays(days: number, base = todayTaipei()): string {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return formatDate(next);
}

export function daysBetween(from: string | Date, to: string | Date): number {
  const a = typeof from === "string" ? new Date(`${from}T00:00:00`) : from;
  const b = typeof to === "string" ? new Date(`${to}T00:00:00`) : to;
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

export function riskFromScore(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  investorConference: "法說會",
  exDividend: "除權息",
  monthlyRevenue: "月營收",
  earnings: "財報",
  foreignBrokerReport: "外資報告 metadata",
  majorHolderChange: "大戶持股變化",
  etfRebalance: "ETF 成分調整",
  attentionStock: "注意股",
  dispositionStock: "處置股",
  shareholderMeetingGift: "股東會紀念品",
  productLaunch: "產品發表",
  aiServerNews: "AI 伺服器消息",
  semiconductorNews: "半導體消息",
  industryConference: "產業論壇",
  policy: "政策事件",
  orderContract: "訂單合約",
  buyback: "庫藏股",
  capitalIncrease: "增資",
  convertibleBond: "可轉債",
  mergerAcquisition: "併購",
  supplyChainNews: "供應鏈消息",
  other: "其他"
};

export const NEXT_ACTION_LABELS: Record<NextAction, string> = {
  Observe: "觀察",
  WaitForConfirmation: "等待確認",
  CreateTradePlan: "建立交易計畫",
  WaitForPullback: "等回測買點",
  AvoidChasing: "避免追高",
  CheckRisk: "檢查風險",
  ThemeTrackingOnly: "僅列入題材追蹤",
  InsufficientData: "資料不足"
};

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  Real: "真實",
  Cached: "快取",
  Manual: "手動",
  Imported: "匯入",
  Estimated: "估算",
  Demo: "示範",
  Missing: "缺資料"
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "極高"
};

export const CONFIDENCE_LABELS = {
  low: "低",
  medium: "中",
  high: "高"
} as const;

export const MARKET_REGIME_LABELS: Record<MarketRegime, string> = {
  bullish: "偏多",
  sideways: "震盪",
  bearish: "偏空",
  highVolatility: "高波動",
  riskOff: "風險趨避",
  unknown: "未知"
};

export const VOLATILITY_LABELS = {
  low: "低波動",
  normal: "正常",
  elevated: "偏高",
  extreme: "極高"
} as const;

export const STRATEGY_LABELS: Record<StrategyName, string> = {
  "Pre-Earnings Drift": "財報前動能延伸",
  "ETF Rebalance Flow": "ETF 成分調整資金流",
  "AI Theme Rotation": "AI 題材輪動",
  "Low Base Catalyst": "低基期事件催化",
  "Event Pullback": "事件後健康回測",
  "Manual Event Research": "手動事件研究"
};

export const RISK_CATEGORY_LABELS = {
  "Event Risk": "事件風險",
  "Position Risk": "部位風險",
  "Portfolio Risk": "投組風險",
  "Behavior Risk": "行為風險",
  "Data Risk": "資料風險"
} as const;

export function sourceTag(dataSource: DataSource): string {
  return DATA_SOURCE_LABELS[dataSource] ?? dataSource;
}

export function formatNextAction(action: string): string {
  return NEXT_ACTION_LABELS[action as NextAction] ?? action;
}

export function formatDateTW(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function formatCurrencyNTD(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

export function formatSharesLots(shares: number): string {
  const rounded = Math.max(0, Math.round(shares));
  const lots = rounded / 1000;
  return `${rounded.toLocaleString("zh-TW")} 股 / 約 ${lots.toFixed(lots >= 1 ? 1 : 2)} 張`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${round(value, digits)}%`;
}

export function formatSymbolName(symbol: string, name: string): string {
  return `${symbol} / ${name}`;
}

export function formatRiskLevel(level: RiskLevel): string {
  return RISK_LEVEL_LABELS[level] ?? level;
}

export function formatDataSource(source: DataSource): string {
  return DATA_SOURCE_LABELS[source] ?? source;
}

export function formatStrategy(strategy: StrategyName | string): string {
  return STRATEGY_LABELS[strategy as StrategyName] ?? strategy;
}

export function localizeTheme(theme: string): string {
  const labels: Record<string, string> = {
    "AI server": "AI 伺服器",
    CoWoS: "CoWoS 先進封裝",
    HBM: "HBM 記憶體",
    Thermal: "散熱",
    cooling: "散熱",
    PCB: "PCB / 載板",
    "Silicon Photonics": "矽光子",
    "Semiconductor Equipment": "半導體設備",
    Memory: "記憶體",
    Robot: "機器人",
    Defense: "軍工",
    "Dividend ETF": "高股息 ETF",
    EV: "電動車",
    Biotech: "生技",
    Shipping: "航運",
    "Power supply": "電源供應"
  };
  return labels[theme] ?? theme;
}

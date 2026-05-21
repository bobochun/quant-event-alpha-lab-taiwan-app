import type { DataSource, EventType, NextAction, RiskLevel } from "./types";

export const DEMO_SOURCE_NOTE = "Demo data for MVP testing. Not real-time market data.";
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

export function sourceTag(dataSource: DataSource): string {
  return dataSource === "Demo" ? "DEMO" : dataSource.toUpperCase();
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  investorConference: "Investor Conf.",
  exDividend: "Ex-Dividend",
  monthlyRevenue: "Monthly Revenue",
  earnings: "Earnings",
  foreignBrokerReport: "Broker Metadata",
  majorHolderChange: "Major Holder",
  etfRebalance: "ETF Rebalance",
  attentionStock: "Attention",
  dispositionStock: "Disposition",
  shareholderMeetingGift: "Shareholder Gift",
  productLaunch: "Product Launch",
  aiServerNews: "AI Server",
  semiconductorNews: "Semiconductor",
  industryConference: "Industry Conf.",
  policy: "Policy",
  orderContract: "Order Contract",
  buyback: "Buyback",
  capitalIncrease: "Capital Increase",
  convertibleBond: "Convertible Bond",
  mergerAcquisition: "M&A",
  supplyChainNews: "Supply Chain",
  other: "Other"
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

export function formatNextAction(action: string): string {
  return NEXT_ACTION_LABELS[action as NextAction] ?? action;
}

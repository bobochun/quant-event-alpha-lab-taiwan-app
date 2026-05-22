import type { InstitutionalFlowRecord, MarketWarningRecord, PriceSnapshot, SecurityMasterRecord } from "../types";
import { OFFICIAL_SOURCE_NOTE } from "../utils";

type RawRow = Record<string, unknown>;

function text(row: RawRow, keys: string[], fallback?: string): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback ?? "";
}

function number(row: RawRow, keys: string[], fallback = 0): number {
  const raw = text(row, keys);
  if (!raw) return fallback;
  const parsed = Number(raw.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function meta(sourceName: string, sourceUrl?: string) {
  const now = new Date().toISOString();
  return { dataSource: "Official" as const, sourceName, sourceUrl, sourceNote: OFFICIAL_SOURCE_NOTE, lastUpdated: now, fetchedAt: now, confidence: 80 };
}

export function normalizeSecurityMaster(rows: RawRow[], sourceName: string, market: "TWSE" | "TPEx", sourceUrl?: string): SecurityMasterRecord[] {
  return rows.flatMap((row) => {
    const symbol = text(row, ["Code", "SecuritiesCompanyCode", "公司代號", "有價證券代號", "代號", "code"]);
    const name = text(row, ["Name", "CompanyName", "公司名稱", "有價證券名稱", "名稱", "name"]);
    if (!symbol || !name) return [];
    return [{
      symbol,
      name,
      market,
      assetType: name.includes("ETF") || symbol.startsWith("00") ? "ETF" : "stock",
      industry: text(row, ["Industry", "產業別", "industry"], "未分類"),
      isin: text(row, ["ISINCode", "ISIN", "isin"], undefined),
      listedDate: text(row, ["ListingDate", "上市日", "掛牌日", "listedDate"], undefined),
      ...meta(sourceName, sourceUrl)
    }];
  });
}

export function normalizePriceSnapshots(rows: RawRow[], sourceName: string, sourceUrl?: string): PriceSnapshot[] {
  return rows.flatMap((row) => {
    const symbol = text(row, ["Code", "證券代號", "代號", "symbol", "SecuritiesCompanyCode"]);
    const name = text(row, ["Name", "證券名稱", "名稱", "name"], symbol);
    const close = number(row, ["ClosingPrice", "收盤價", "Close", "close"]);
    const volume = number(row, ["TradeVolume", "成交股數", "成交量", "Volume", "volume"]);
    if (!symbol || !close) return [];
    return [{
      symbol,
      name,
      date: text(row, ["Date", "日期", "date"], today()),
      open: number(row, ["OpeningPrice", "開盤價", "Open", "open"], close),
      high: number(row, ["HighestPrice", "最高價", "High", "high"], close),
      low: number(row, ["LowestPrice", "最低價", "Low", "low"], close),
      close,
      volume,
      value: number(row, ["TradeValue", "成交金額", "value"], undefined as unknown as number),
      ...meta(sourceName, sourceUrl)
    }];
  });
}

export function normalizeInstitutionalFlows(rows: RawRow[], sourceName: string, sourceUrl?: string): InstitutionalFlowRecord[] {
  return rows.flatMap((row) => {
    const symbol = text(row, ["Code", "證券代號", "代號", "symbol"]);
    const name = text(row, ["Name", "證券名稱", "名稱", "name"], symbol);
    const foreignNetBuy = number(row, ["ForeignNetBuy", "外資買賣超股數", "外陸資買賣超股數", "foreignNetBuy"]);
    const investmentTrustNetBuy = number(row, ["InvestmentTrustNetBuy", "投信買賣超股數", "investmentTrustNetBuy"]);
    const dealerNetBuy = number(row, ["DealerNetBuy", "自營商買賣超股數", "dealerNetBuy"]);
    if (!symbol) return [];
    const totalInstitutionalNetBuy = foreignNetBuy + investmentTrustNetBuy + dealerNetBuy;
    return [{
      symbol,
      name,
      date: text(row, ["Date", "日期", "date"], today()),
      foreignNetBuy,
      investmentTrustNetBuy,
      dealerNetBuy,
      totalInstitutionalNetBuy,
      flowState: totalInstitutionalNetBuy > 0 ? "accumulation" : totalInstitutionalNetBuy < 0 ? "distribution" : "neutral",
      ...meta(sourceName, sourceUrl)
    }];
  });
}

export function normalizeMarketWarnings(rows: RawRow[], sourceName: string, sourceUrl?: string): MarketWarningRecord[] {
  return rows.flatMap((row) => {
    const symbol = text(row, ["Code", "證券代號", "代號", "symbol"]);
    const name = text(row, ["Name", "證券名稱", "名稱", "name"], symbol);
    const rawType = text(row, ["warningType", "處置種類", "注意處置", "type"], "attention");
    if (!symbol) return [];
    return [{
      symbol,
      name,
      warningType: rawType.toLowerCase().includes("disposition") || rawType.includes("處置") ? "disposition" : "attention",
      startDate: text(row, ["startDate", "開始日期", "Date", "日期"], today()),
      endDate: text(row, ["endDate", "結束日期"], undefined),
      reason: text(row, ["reason", "原因", "Notice", "說明"], "官方注意 / 處置資料"),
      ...meta(sourceName, sourceUrl)
    }];
  });
}

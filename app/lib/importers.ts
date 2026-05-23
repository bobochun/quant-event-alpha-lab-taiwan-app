import { importTemplates, type ImportTemplateId } from "./importTemplates";
import { canUseStorage, loadJson, saveJson } from "./storage";
import type {
  DividendRecord,
  EarningsRecord,
  Event,
  EventType,
  InstitutionalFlowRecord,
  MarketWarningRecord,
  MonthlyRevenueRecord,
  PriceSnapshot,
  Stock
} from "./types";
import { IMPORTED_SOURCE_NOTE } from "./utils";

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportSummary {
  id: string;
  templateId: ImportTemplateId;
  fileName: string;
  importedAt: string;
  successRows: number;
  errorRows: number;
  skippedRows: number;
  duplicateRows: number;
  generatedEvents: number;
  missingFields: string[];
  errors: ImportError[];
}

export interface ThemeNewsRecord {
  title: string;
  publishedAt: string;
  source: string;
  relatedThemes: string[];
  sourceUrl?: string;
  relatedSymbols?: string[];
  sentiment?: string;
  importance?: number;
  novelty?: number;
  summary?: string;
  dataSource: "Imported";
  sourceNote: string;
  importedAt: string;
  lastUpdated: string;
  confidence: number;
}

export interface EtfRebalanceRecord {
  etfSymbol: string;
  etfName: string;
  effectiveDate: string;
  symbol: string;
  name: string;
  action: "add" | "remove" | "weightIncrease" | "weightDecrease";
  estimatedImpact?: number;
  source?: string;
  sourceUrl?: string;
  note?: string;
  dataSource: "Imported";
  sourceNote: string;
  importedAt: string;
  lastUpdated: string;
  confidence: number;
}

export interface ImportedDataset {
  events: Event[];
  stocks: Partial<Stock>[];
  priceSnapshots: PriceSnapshot[];
  institutionalFlows: InstitutionalFlowRecord[];
  marketWarnings: MarketWarningRecord[];
  monthlyRevenues: MonthlyRevenueRecord[];
  earnings: EarningsRecord[];
  dividends: DividendRecord[];
  themeNews: ThemeNewsRecord[];
  etfRebalances: EtfRebalanceRecord[];
  summaries: ImportSummary[];
}

export interface ImportOptions {
  generateEvents?: boolean;
  apply?: boolean;
}

const key = "qealt.importedData";
const eventTypes: EventType[] = [
  "investorConference", "exDividend", "monthlyRevenue", "earnings", "foreignBrokerReport", "majorHolderChange", "etfRebalance", "attentionStock", "dispositionStock", "shareholderMeetingGift", "productLaunch", "aiServerNews", "semiconductorNews", "industryConference", "policy", "orderContract", "buyback", "capitalIncrease", "convertibleBond", "mergerAcquisition", "supplyChainNews", "other"
];

export const defaultImportedDataset: ImportedDataset = {
  events: [],
  stocks: [],
  priceSnapshots: [],
  institutionalFlows: [],
  marketWarnings: [],
  monthlyRevenues: [],
  earnings: [],
  dividends: [],
  themeNews: [],
  etfRebalances: [],
  summaries: []
};

export function loadImportedDataset(): ImportedDataset {
  return { ...defaultImportedDataset, ...loadJson<Partial<ImportedDataset>>(key, defaultImportedDataset) };
}

export function saveImportedDataset(dataset: ImportedDataset): void {
  saveJson(key, dataset);
}

export function resetImportedDataset(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(key);
}

export function previewCsvImport(templateId: ImportTemplateId, csvText: string, generateEvents = true) {
  return parseImport(templateId, csvText, "preview.csv", { generateEvents, apply: false });
}

export function importCsv(templateId: ImportTemplateId, csvText: string, fileName?: string, options: ImportOptions = {}): { dataset: ImportedDataset; summary: ImportSummary } {
  const parsed = parseImport(templateId, csvText, fileName, { generateEvents: options.generateEvents ?? true, apply: true });
  saveImportedDataset(parsed.dataset);
  return parsed;
}

function parseImport(templateId: ImportTemplateId, csvText: string, fileName = "import.csv", options: Required<ImportOptions>): { dataset: ImportedDataset; summary: ImportSummary } {
  const template = importTemplates.find((item) => item.id === templateId);
  if (!template) throw new Error("找不到匯入模板。");
  const rows = parseCsv(csvText);
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim()));
  const required = template.columns.filter((column) => column.required).map((column) => column.name);
  const errors: ImportError[] = [];
  const missingFields = required.filter((field) => !headers.includes(field));
  missingFields.forEach((field) => errors.push({ row: 1, field, message: `缺少必填欄位 ${field}` }));

  const current = options.apply ? loadImportedDataset() : defaultImportedDataset;
  const now = new Date().toISOString();
  const next: ImportedDataset = { ...current, summaries: [...current.summaries] };
  let generatedEvents = 0;

  if (!missingFields.length) {
    const records = dataRows.map((row) => record(headers, row));
    if (templateId === "events") next.events = mergeEvents([...current.events, ...parseEvents(records, errors, now)]);
    if (templateId === "price_snapshot") {
      const parsed = parsePriceSnapshots(records, errors, now);
      next.priceSnapshots = mergeBy([...current.priceSnapshots, ...parsed], (item) => `${item.symbol}|${item.date}`);
      next.stocks = mergeImportedStocks([...current.stocks, ...parsed.map(stockPatchFromPrice)]);
    }
    if (templateId === "institutional_flow") {
      const parsed = parseFlows(records, errors, now);
      next.institutionalFlows = mergeBy([...current.institutionalFlows, ...parsed], (item) => `${item.symbol}|${item.date}`);
      next.stocks = mergeImportedStocks([...current.stocks, ...parsed.map(stockPatchFromFlow)]);
    }
    if (templateId === "market_warnings") {
      const parsed = parseMarketWarnings(records, errors, now);
      next.marketWarnings = mergeBy([...current.marketWarnings, ...parsed], (item) => `${item.symbol}|${item.startDate}|${item.warningType}`);
      next.stocks = mergeImportedStocks([...current.stocks, ...parsed.map(stockPatchFromWarning)]);
      if (options.generateEvents) {
        const events = parsed.map(warningToEvent);
        generatedEvents += events.length;
        next.events = mergeEvents([...next.events, ...events]);
      }
    }
    if (templateId === "monthly_revenue") {
      const parsed = parseMonthlyRevenue(records, errors, now);
      next.monthlyRevenues = mergeBy([...current.monthlyRevenues, ...parsed], (item) => `${item.symbol}|${item.revenueMonth}`);
      if (options.generateEvents) {
        const events = parsed.map(monthlyRevenueToEvent);
        generatedEvents += events.length;
        next.events = mergeEvents([...next.events, ...events]);
      }
    }
    if (templateId === "earnings") {
      const parsed = parseEarnings(records, errors, now);
      next.earnings = mergeBy([...current.earnings, ...parsed], (item) => `${item.symbol}|${item.quarter}`);
      if (options.generateEvents) {
        const events = parsed.map(earningsToEvent);
        generatedEvents += events.length;
        next.events = mergeEvents([...next.events, ...events]);
      }
    }
    if (templateId === "dividends") {
      const parsed = parseDividends(records, errors, now);
      next.dividends = mergeBy([...current.dividends, ...parsed], (item) => `${item.symbol}|${item.exDividendDate}`);
      if (options.generateEvents) {
        const events = parsed.map(dividendToEvent);
        generatedEvents += events.length;
        next.events = mergeEvents([...next.events, ...events]);
      }
    }
    if (templateId === "theme_news") {
      const parsed = parseThemeNews(records, errors, now);
      next.themeNews = mergeBy([...current.themeNews, ...parsed], (item) => `${item.title}|${item.publishedAt}`);
      if (options.generateEvents) {
        const events = parsed.map(themeNewsToEvent).filter((event): event is Event => Boolean(event));
        generatedEvents += events.length;
        next.events = mergeEvents([...next.events, ...events]);
      }
    }
    if (templateId === "etf_rebalance") {
      const parsed = parseEtfRebalances(records, errors, now);
      next.etfRebalances = mergeBy([...current.etfRebalances, ...parsed], (item) => `${item.etfSymbol}|${item.symbol}|${item.effectiveDate}|${item.action}`);
      if (options.generateEvents) {
        const events = parsed.map(etfRebalanceToEvent);
        generatedEvents += events.length;
        next.events = mergeEvents([...next.events, ...events]);
      }
    }
    if (templateId === "major_holder_changes") validateGeneric(records, errors, templateId);
  }

  const errorRows = new Set(errors.map((error) => error.row).filter((row) => row > 1)).size;
  const summary: ImportSummary = {
    id: `import-${Date.now()}`,
    templateId,
    fileName,
    importedAt: now,
    successRows: Math.max(0, dataRows.length - errorRows),
    errorRows,
    skippedRows: missingFields.length ? dataRows.length : 0,
    duplicateRows: 0,
    generatedEvents,
    missingFields,
    errors
  };
  const dataset = { ...next, summaries: [summary, ...current.summaries].slice(0, 50) };
  return { dataset, summary };
}

export function mergeDemoImportedManualEvents(demoEvents: Event[], importedEvents: Event[], manualEvents: Event[]): Event[] {
  return mergeEvents([...demoEvents, ...importedEvents, ...manualEvents]);
}

export function mergeStocksWithImported(demoStocks: Stock[], importedStocks: Partial<Stock>[]): Stock[] {
  return mergeImportedStocks(importedStocks).reduce((stocks, patch) => stocks.map((stock) => stock.symbol === patch.symbol ? { ...stock, ...patch, dataSource: patch.dataSource ?? "Imported", sourceNote: patch.sourceNote ?? IMPORTED_SOURCE_NOTE } : stock), demoStocks);
}

function baseImported(now: string) {
  return { dataSource: "Imported" as const, sourceNote: IMPORTED_SOURCE_NOTE, importedAt: now, lastUpdated: now, confidence: 70 };
}

function parseEvents(rows: Array<Record<string, string>>, errors: ImportError[], now: string): Event[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.eventDate, rowNumber, "eventDate", errors);
    validateNumber(item.confidence, rowNumber, "confidence", errors, true);
    validateNumber(item.expectedImpact, rowNumber, "expectedImpact", errors, true);
    validateNumber(item.marketAwareness, rowNumber, "marketAwareness", errors, true);
    if (!eventTypes.includes(item.eventType as EventType)) errors.push({ row: rowNumber, field: "eventType", message: `eventType 不在支援清單內：${item.eventType}` });
    if (hasRowError(errors, rowNumber)) return [];
    return [{
      id: `imported-event-${item.symbol}-${item.eventDate}-${item.eventType}`,
      ...baseImported(now),
      symbol: item.symbol,
      name: item.name,
      eventType: item.eventType as EventType,
      eventTitle: item.eventTitle,
      eventDate: item.eventDate,
      eventTime: item.eventTime || undefined,
      source: item.source || "CSV 匯入",
      sourceUrl: item.sourceUrl || "",
      confidence: numberOr(item.confidence, 65),
      expectedImpact: numberOr(item.expectedImpact, 65),
      marketAwareness: numberOr(item.marketAwareness, 45),
      relatedThemes: splitList(item.relatedThemes),
      createdAt: now,
      updatedAt: now
    }];
  });
}

function parsePriceSnapshots(rows: Array<Record<string, string>>, errors: ImportError[], now: string): PriceSnapshot[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.date, rowNumber, "date", errors);
    ["close", "volume", "open", "high", "low", "ma20", "ma60", "rsi", "atr", "twentyDayReturn", "sixtyDayReturn", "relativeStrength"].forEach((field) => validateNumber(item[field], rowNumber, field, errors, !["close", "volume"].includes(field)));
    if (hasRowError(errors, rowNumber)) return [];
    return [{
      symbol: item.symbol,
      name: item.name,
      date: item.date,
      open: optionalNumber(item.open),
      high: optionalNumber(item.high),
      low: optionalNumber(item.low),
      close: numberOr(item.close, 0),
      volume: numberOr(item.volume, 0),
      ma20: optionalNumber(item.ma20),
      ma60: optionalNumber(item.ma60),
      rsi: optionalNumber(item.rsi),
      atr: optionalNumber(item.atr),
      twentyDayReturn: optionalNumber(item.twentyDayReturn),
      sixtyDayReturn: optionalNumber(item.sixtyDayReturn),
      relativeStrength: optionalNumber(item.relativeStrength),
      ...baseImported(now)
    }];
  });
}

function parseFlows(rows: Array<Record<string, string>>, errors: ImportError[], now: string): InstitutionalFlowRecord[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.date, rowNumber, "date", errors);
    ["foreignNetBuy", "investmentTrustNetBuy", "dealerNetBuy", "totalInstitutionalNetBuy", "buyDays"].forEach((field) => validateNumber(item[field], rowNumber, field, errors, field === "totalInstitutionalNetBuy" || field === "buyDays"));
    if (hasRowError(errors, rowNumber)) return [];
    const total = numberOr(item.totalInstitutionalNetBuy, numberOr(item.foreignNetBuy, 0) + numberOr(item.investmentTrustNetBuy, 0) + numberOr(item.dealerNetBuy, 0));
    return [{
      symbol: item.symbol,
      name: item.name,
      date: item.date,
      foreignNetBuy: numberOr(item.foreignNetBuy, 0),
      investmentTrustNetBuy: numberOr(item.investmentTrustNetBuy, 0),
      dealerNetBuy: numberOr(item.dealerNetBuy, 0),
      totalInstitutionalNetBuy: total,
      buyDays: optionalNumber(item.buyDays),
      flowState: (item.flowState as InstitutionalFlowRecord["flowState"]) || (total > 0 ? "accumulation" : total < 0 ? "distribution" : "neutral"),
      ...baseImported(now)
    }];
  });
}

function parseMarketWarnings(rows: Array<Record<string, string>>, errors: ImportError[], now: string): MarketWarningRecord[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.startDate, rowNumber, "startDate", errors);
    validateDate(item.endDate, rowNumber, "endDate", errors, true);
    if (!["attention", "disposition"].includes(item.warningType)) errors.push({ row: rowNumber, field: "warningType", message: "warningType 必須是 attention 或 disposition。" });
    if (hasRowError(errors, rowNumber)) return [];
    return [{ symbol: item.symbol, name: item.name, warningType: item.warningType as MarketWarningRecord["warningType"], startDate: item.startDate, endDate: item.endDate || undefined, reason: item.reason || item.source || "CSV 匯入注意 / 處置資料", ...baseImported(now) }];
  });
}

function parseMonthlyRevenue(rows: Array<Record<string, string>>, errors: ImportError[], now: string): MonthlyRevenueRecord[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.announceDate, rowNumber, "announceDate", errors);
    ["revenue", "yoyGrowth", "momGrowth", "cumulativeRevenue", "cumulativeYoyGrowth"].forEach((field) => validateNumber(item[field], rowNumber, field, errors, field.startsWith("cumulative")));
    if (hasRowError(errors, rowNumber)) return [];
    return [{ symbol: item.symbol, name: item.name, revenueMonth: item.revenueMonth, announceDate: item.announceDate, revenue: numberOr(item.revenue, 0), yoyGrowth: numberOr(item.yoyGrowth, 0), momGrowth: numberOr(item.momGrowth, 0), cumulativeRevenue: optionalNumber(item.cumulativeRevenue), cumulativeYoyGrowth: optionalNumber(item.cumulativeYoyGrowth), ...baseImported(now) }];
  });
}

function parseEarnings(rows: Array<Record<string, string>>, errors: ImportError[], now: string): EarningsRecord[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.announceDate, rowNumber, "announceDate", errors);
    ["eps", "grossMargin", "operatingMargin", "netMargin", "yoyGrowth", "qoqGrowth"].forEach((field) => validateNumber(item[field], rowNumber, field, errors, field !== "eps"));
    if (hasRowError(errors, rowNumber)) return [];
    return [{ symbol: item.symbol, name: item.name, quarter: item.quarter, announceDate: item.announceDate, eps: numberOr(item.eps, 0), grossMargin: optionalNumber(item.grossMargin), operatingMargin: optionalNumber(item.operatingMargin), netMargin: optionalNumber(item.netMargin), yoyGrowth: optionalNumber(item.yoyGrowth), qoqGrowth: optionalNumber(item.qoqGrowth), ...baseImported(now) }];
  });
}

function parseDividends(rows: Array<Record<string, string>>, errors: ImportError[], now: string): DividendRecord[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.exDividendDate, rowNumber, "exDividendDate", errors);
    validateDate(item.lastBuyDate, rowNumber, "lastBuyDate", errors, true);
    validateDate(item.paymentDate, rowNumber, "paymentDate", errors, true);
    ["cashDividend", "stockDividend", "yieldPct"].forEach((field) => validateNumber(item[field], rowNumber, field, errors, field !== "cashDividend"));
    if (hasRowError(errors, rowNumber)) return [];
    return [{ symbol: item.symbol, name: item.name, exDividendDate: item.exDividendDate, cashDividend: numberOr(item.cashDividend, 0), stockDividend: optionalNumber(item.stockDividend), yieldPct: optionalNumber(item.yieldPct), lastBuyDate: item.lastBuyDate || undefined, paymentDate: item.paymentDate || undefined, ...baseImported(now) }];
  });
}

function parseThemeNews(rows: Array<Record<string, string>>, errors: ImportError[], now: string): ThemeNewsRecord[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.publishedAt.slice(0, 10), rowNumber, "publishedAt", errors);
    validateNumber(item.importance, rowNumber, "importance", errors, true);
    validateNumber(item.novelty, rowNumber, "novelty", errors, true);
    if (hasRowError(errors, rowNumber)) return [];
    return [{ title: item.title, publishedAt: item.publishedAt, source: item.source, relatedThemes: splitList(item.relatedThemes), sourceUrl: item.sourceUrl || undefined, relatedSymbols: splitList(item.relatedSymbols), sentiment: item.sentiment, importance: optionalNumber(item.importance), novelty: optionalNumber(item.novelty), summary: item.summary, ...baseImported(now) }];
  });
}

function parseEtfRebalances(rows: Array<Record<string, string>>, errors: ImportError[], now: string): EtfRebalanceRecord[] {
  return rows.flatMap((item, index) => {
    const rowNumber = index + 2;
    validateDate(item.effectiveDate, rowNumber, "effectiveDate", errors);
    if (!["add", "remove", "weightIncrease", "weightDecrease"].includes(item.action)) errors.push({ row: rowNumber, field: "action", message: "action 必須是 add、remove、weightIncrease 或 weightDecrease。" });
    validateNumber(item.estimatedImpact, rowNumber, "estimatedImpact", errors, true);
    if (hasRowError(errors, rowNumber)) return [];
    return [{ etfSymbol: item.etfSymbol, etfName: item.etfName, effectiveDate: item.effectiveDate, symbol: item.symbol, name: item.name, action: item.action as EtfRebalanceRecord["action"], estimatedImpact: optionalNumber(item.estimatedImpact), source: item.source, sourceUrl: item.sourceUrl, note: item.note, ...baseImported(now) }];
  });
}

function validateGeneric(rows: Array<Record<string, string>>, errors: ImportError[], templateId: ImportTemplateId) {
  rows.forEach((item, index) => {
    const rowNumber = index + 2;
    Object.entries(item).forEach(([field, value]) => {
      if (field.toLowerCase().includes("date") || field === "publishedAt" || field === "announceDate") validateDate(value, rowNumber, field, errors, true);
    });
    if (templateId === "major_holder_changes" && !["400", "800", "1000", "5000", "10000"].includes(item.holderTier)) errors.push({ row: rowNumber, field: "holderTier", message: "holderTier 必須是 400、800、1000、5000 或 10000。" });
  });
}

function monthlyRevenueToEvent(item: MonthlyRevenueRecord): Event {
  return makeGeneratedEvent(item.symbol, item.name, "monthlyRevenue", `${item.revenueMonth} 月營收公告`, item.announceDate, Math.min(90, 55 + Math.max(0, item.yoyGrowth) * 0.7), ["monthly revenue"]);
}

function earningsToEvent(item: EarningsRecord): Event {
  return makeGeneratedEvent(item.symbol, item.name, "earnings", `${item.quarter} 財報公告`, item.announceDate, Math.min(90, 60 + Math.max(0, item.eps) * 1.5), ["earnings"]);
}

function dividendToEvent(item: DividendRecord): Event {
  return makeGeneratedEvent(item.symbol, item.name, "exDividend", `除權息：現金股利 ${item.cashDividend}`, item.exDividendDate, 55, ["Dividend ETF"]);
}

function warningToEvent(item: MarketWarningRecord): Event {
  return makeGeneratedEvent(item.symbol, item.name, item.warningType === "disposition" ? "dispositionStock" : "attentionStock", item.reason ?? "注意 / 處置股事件", item.startDate, 45, ["risk"]);
}

function etfRebalanceToEvent(item: EtfRebalanceRecord): Event {
  return makeGeneratedEvent(item.symbol, item.name, "etfRebalance", `${item.etfName} ${item.action} 成分調整`, item.effectiveDate, item.estimatedImpact ?? 65, ["Dividend ETF"]);
}

function themeNewsToEvent(item: ThemeNewsRecord): Event | null {
  const symbol = item.relatedSymbols?.[0];
  if (!symbol) return null;
  const eventType: EventType = item.relatedThemes.some((theme) => theme.toLowerCase().includes("ai")) ? "aiServerNews" : item.relatedThemes.some((theme) => theme.toLowerCase().includes("semi") || theme.includes("半導體")) ? "semiconductorNews" : "supplyChainNews";
  return makeGeneratedEvent(symbol, symbol, eventType, item.title, item.publishedAt.slice(0, 10), item.importance ?? 55, item.relatedThemes);
}

function makeGeneratedEvent(symbol: string, name: string, eventType: EventType, title: string, date: string, expectedImpact: number, themes: string[]): Event {
  const now = new Date().toISOString();
  return { id: `generated-${eventType}-${symbol}-${date}`, ...baseImported(now), symbol, name, eventType, eventTitle: title, eventDate: date, source: "CSV 自動生成", confidence: 65, expectedImpact, marketAwareness: 45, relatedThemes: themes, createdAt: now, updatedAt: now };
}

function stockPatchFromPrice(item: PriceSnapshot): Partial<Stock> {
  const ma20DistancePct = item.ma20 && item.ma20 > 0 ? ((item.close - item.ma20) / item.ma20) * 100 : 0;
  return { symbol: item.symbol, name: item.name, price: item.close, previousClose: item.close, rsi14: item.rsi ?? 50, ma20DistancePct, twentyDayReturnPct: item.twentyDayReturn ?? 0, relativeStrengthRank: item.relativeStrength ?? 50, dataSource: item.dataSource, sourceNote: item.sourceNote };
}

function stockPatchFromFlow(item: InstitutionalFlowRecord): Partial<Stock> {
  return { symbol: item.symbol, name: item.name, institutionalFlow5d: item.totalInstitutionalNetBuy, foreignFlow5d: item.foreignNetBuy, investmentTrustFlow5d: item.investmentTrustNetBuy, dealerFlow5d: item.dealerNetBuy, dataSource: item.dataSource, sourceNote: item.sourceNote };
}

function stockPatchFromWarning(item: MarketWarningRecord): Partial<Stock> {
  return { symbol: item.symbol, name: item.name, isAttentionStock: item.warningType === "attention", isDispositionStock: item.warningType === "disposition", dataSource: item.dataSource, sourceNote: item.sourceNote };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.map((items) => items.map((item) => item.trim()));
}

function record(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[header] = row[index] ?? "";
    return acc;
  }, {});
}

function validateDate(value: string, row: number, field: string, errors: ImportError[], optional = false) {
  if (!value && optional) return;
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) errors.push({ row, field, message: `${field} 格式必須是 YYYY-MM-DD。` });
}

function validateNumber(value: string | undefined, row: number, field: string, errors: ImportError[], optional = false) {
  if (!value && optional) return;
  if (Number.isNaN(Number(String(value).replaceAll(",", "")))) errors.push({ row, field, message: `${field} 必須是數字。` });
}

function numberOr(value: string | undefined, fallback: number): number {
  const parsed = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitList(value: string | undefined): string[] {
  return (value || "").split("|").map((item) => item.trim()).filter(Boolean);
}

function hasRowError(errors: ImportError[], row: number): boolean {
  return errors.some((error) => error.row === row);
}

function mergeEvents(events: Event[]): Event[] {
  return mergeBy(events, (event) => `${event.symbol}|${event.eventDate}|${event.eventType}`);
}

function mergeImportedStocks(stocks: Partial<Stock>[]): Partial<Stock>[] {
  return mergeBy(stocks.filter((stock) => stock.symbol), (stock) => stock.symbol ?? "");
}

function mergeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(keyFn(item), { ...(map.get(keyFn(item)) as object | undefined), ...(item as object) } as T));
  return Array.from(map.values());
}

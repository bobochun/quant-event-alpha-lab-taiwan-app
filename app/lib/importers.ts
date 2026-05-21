"use client";

import { importTemplates, type ImportTemplateId } from "./importTemplates";
import { canUseStorage, loadJson, saveJson } from "./storage";
import type { Event, EventType, Stock } from "./types";

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
  missingFields: string[];
  errors: ImportError[];
}

export interface ImportedDataset {
  events: Event[];
  stocks: Partial<Stock>[];
  summaries: ImportSummary[];
}

const key = "qealt.importedData";
const importedNote = "使用者匯入 CSV 資料，請自行確認來源與正確性。";
const eventTypes: EventType[] = [
  "investorConference", "exDividend", "monthlyRevenue", "earnings", "foreignBrokerReport", "majorHolderChange", "etfRebalance", "attentionStock", "dispositionStock", "shareholderMeetingGift", "productLaunch", "aiServerNews", "semiconductorNews", "industryConference", "policy", "orderContract", "buyback", "capitalIncrease", "convertibleBond", "mergerAcquisition", "supplyChainNews", "other"
];

export const defaultImportedDataset: ImportedDataset = { events: [], stocks: [], summaries: [] };

export function loadImportedDataset(): ImportedDataset {
  return loadJson<ImportedDataset>(key, defaultImportedDataset);
}

export function saveImportedDataset(dataset: ImportedDataset): void {
  saveJson(key, dataset);
}

export function resetImportedDataset(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(key);
}

export function importCsv(templateId: ImportTemplateId, csvText: string, fileName?: string): { dataset: ImportedDataset; summary: ImportSummary } {
  const template = importTemplates.find((item) => item.id === templateId);
  if (!template) throw new Error("找不到匯入模板。");
  const rows = parseCsv(csvText);
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim()));
  const required = template.columns.filter((column) => column.required).map((column) => column.name);
  const errors: ImportError[] = [];
  const missingFields = required.filter((field) => !headers.includes(field));
  missingFields.forEach((field) => errors.push({ row: 1, field, message: `缺少必填欄位 ${field}` }));

  const current = loadImportedDataset();
  let importedEvents: Event[] = [];
  let importedStocks: Partial<Stock>[] = [];

  if (!missingFields.length) {
    if (templateId === "events") importedEvents = parseEvents(headers, dataRows, errors);
    if (templateId === "price_snapshot") importedStocks = parsePriceSnapshot(headers, dataRows, errors);
    if (templateId === "institutional_flow") importedStocks = parseFlow(headers, dataRows, errors);
    if (templateId === "market_warnings") importedStocks = parseMarketWarnings(headers, dataRows, errors);
    if (!["events", "price_snapshot", "institutional_flow", "market_warnings"].includes(templateId)) {
      validateGeneric(headers, dataRows, errors, templateId);
    }
  }

  const errorRows = new Set(errors.map((error) => error.row)).size;
  const summary: ImportSummary = {
    id: `import-${Date.now()}`,
    templateId,
    fileName: fileName ?? template.fileName,
    importedAt: new Date().toISOString(),
    successRows: Math.max(0, dataRows.length - errorRows),
    errorRows,
    missingFields,
    errors
  };
  const dataset: ImportedDataset = {
    events: mergeImportedEvents([...current.events, ...importedEvents]),
    stocks: mergeImportedStocks([...current.stocks, ...importedStocks]),
    summaries: [summary, ...current.summaries].slice(0, 50)
  };
  saveImportedDataset(dataset);
  return { dataset, summary };
}

export function mergeDemoImportedManualEvents(demoEvents: Event[], importedEvents: Event[], manualEvents: Event[]): Event[] {
  const priority = { Demo: 0, Imported: 1, Manual: 2, Real: 3, Cached: 1, Estimated: 1, Missing: 0 } as const;
  const map = new Map<string, Event>();
  [...demoEvents, ...importedEvents, ...manualEvents].forEach((event) => {
    const keyValue = `${event.symbol}|${event.eventDate}|${event.eventType}`;
    const existing = map.get(keyValue);
    if (!existing || priority[event.dataSource] >= priority[existing.dataSource]) map.set(keyValue, event);
  });
  return Array.from(map.values());
}

export function mergeStocksWithImported(demoStocks: Stock[], importedStocks: Partial<Stock>[]): Stock[] {
  return demoStocks.map((stock) => {
    const patch = importedStocks.find((item) => item.symbol === stock.symbol);
    return patch ? { ...stock, ...patch, dataSource: "Imported", sourceNote: importedNote } : stock;
  });
}

function parseEvents(headers: string[], rows: string[][], errors: ImportError[]): Event[] {
  return rows.flatMap((row, index) => {
    const item = record(headers, row);
    const rowNumber = index + 2;
    validateDate(item.eventDate, rowNumber, "eventDate", errors);
    validateNumber(item.confidence, rowNumber, "confidence", errors, true);
    validateNumber(item.expectedImpact, rowNumber, "expectedImpact", errors, true);
    validateNumber(item.marketAwareness, rowNumber, "marketAwareness", errors, true);
    if (!eventTypes.includes(item.eventType as EventType)) errors.push({ row: rowNumber, field: "eventType", message: `eventType 不支援：${item.eventType}` });
    if (errors.some((error) => error.row === rowNumber)) return [];
    const now = new Date().toISOString();
    return [{
      id: `imported-event-${item.symbol}-${item.eventDate}-${item.eventType}`,
      symbol: item.symbol,
      name: item.name,
      eventType: item.eventType as EventType,
      eventTitle: item.eventTitle,
      eventDate: item.eventDate,
      eventTime: item.eventTime || undefined,
      source: item.source || "使用者匯入",
      sourceUrl: item.sourceUrl || "",
      confidence: numberOr(item.confidence, 65),
      expectedImpact: numberOr(item.expectedImpact, 65),
      marketAwareness: numberOr(item.marketAwareness, 45),
      relatedThemes: splitThemes(item.relatedThemes),
      createdAt: now,
      updatedAt: now,
      dataSource: "Imported" as const,
      sourceNote: importedNote
    }];
  });
}

function parsePriceSnapshot(headers: string[], rows: string[][], errors: ImportError[]): Partial<Stock>[] {
  return rows.map((row, index) => {
    const item = record(headers, row);
    const rowNumber = index + 2;
    validateDate(item.date, rowNumber, "date", errors);
    ["close", "volume", "rsi", "twentyDayReturn", "relativeStrength"].forEach((field) => validateNumber(item[field], rowNumber, field, errors, true));
    return {
      symbol: item.symbol,
      name: item.name,
      price: numberOr(item.close, 0),
      previousClose: numberOr(item.close, 0),
      rsi14: numberOr(item.rsi, 50),
      twentyDayReturnPct: numberOr(item.twentyDayReturn, 0),
      relativeStrengthRank: numberOr(item.relativeStrength, 50),
      dataSource: "Imported" as const,
      sourceNote: importedNote
    };
  });
}

function parseFlow(headers: string[], rows: string[][], errors: ImportError[]): Partial<Stock>[] {
  return rows.map((row, index) => {
    const item = record(headers, row);
    const rowNumber = index + 2;
    validateDate(item.date, rowNumber, "date", errors);
    ["foreignNetBuy", "investmentTrustNetBuy", "dealerNetBuy"].forEach((field) => validateNumber(item[field], rowNumber, field, errors));
    return {
      symbol: item.symbol,
      name: item.name,
      institutionalFlow5d: numberOr(item.totalInstitutionalNetBuy, numberOr(item.foreignNetBuy, 0) + numberOr(item.investmentTrustNetBuy, 0) + numberOr(item.dealerNetBuy, 0)),
      foreignFlow5d: numberOr(item.foreignNetBuy, 0),
      investmentTrustFlow5d: numberOr(item.investmentTrustNetBuy, 0),
      dealerFlow5d: numberOr(item.dealerNetBuy, 0),
      dataSource: "Imported" as const,
      sourceNote: importedNote
    };
  });
}

function parseMarketWarnings(headers: string[], rows: string[][], errors: ImportError[]): Partial<Stock>[] {
  return rows.map((row, index) => {
    const item = record(headers, row);
    const rowNumber = index + 2;
    validateDate(item.startDate, rowNumber, "startDate", errors);
    if (!["attention", "disposition"].includes(item.warningType)) errors.push({ row: rowNumber, field: "warningType", message: "warningType 只能是 attention 或 disposition。" });
    return {
      symbol: item.symbol,
      name: item.name,
      isAttentionStock: item.warningType === "attention",
      isDispositionStock: item.warningType === "disposition",
      dataSource: "Imported" as const,
      sourceNote: importedNote
    };
  });
}

function validateGeneric(headers: string[], rows: string[][], errors: ImportError[], templateId: ImportTemplateId) {
  rows.forEach((row, index) => {
    const item = record(headers, row);
    const rowNumber = index + 2;
    Object.entries(item).forEach(([field, value]) => {
      if (field.toLowerCase().includes("date") || field === "publishedAt" || field === "announceDate") validateDate(value, rowNumber, field, errors, true);
    });
    if (templateId === "etf_rebalance" && !["add", "remove", "weightIncrease", "weightDecrease"].includes(item.action)) errors.push({ row: rowNumber, field: "action", message: "action 只能是 add、remove、weightIncrease、weightDecrease。" });
    if (templateId === "major_holder_changes" && !["400", "800", "1000", "5000", "10000"].includes(item.holderTier)) errors.push({ row: rowNumber, field: "holderTier", message: "holderTier 只能是 400、800、1000、5000、10000。" });
  });
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push({ row, field, message: `${field} 日期格式必須是 YYYY-MM-DD。` });
}

function validateNumber(value: string, row: number, field: string, errors: ImportError[], optional = false) {
  if (!value && optional) return;
  if (Number.isNaN(Number(value))) errors.push({ row, field, message: `${field} 必須是數字。` });
}

function numberOr(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitThemes(value: string | undefined): string[] {
  return (value || "Manual Event Research").split("|").map((item) => item.trim()).filter(Boolean);
}

function mergeImportedEvents(events: Event[]): Event[] {
  const map = new Map<string, Event>();
  events.forEach((event) => map.set(`${event.symbol}|${event.eventDate}|${event.eventType}`, event));
  return Array.from(map.values());
}

function mergeImportedStocks(stocks: Partial<Stock>[]): Partial<Stock>[] {
  const map = new Map<string, Partial<Stock>>();
  stocks.forEach((stock) => {
    if (!stock.symbol) return;
    map.set(stock.symbol, { ...(map.get(stock.symbol) ?? {}), ...stock });
  });
  return Array.from(map.values());
}

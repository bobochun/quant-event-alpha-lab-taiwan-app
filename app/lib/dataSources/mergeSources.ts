import type { AppDataMode, Event, PriceSnapshot, SecurityMasterRecord, Stock } from "../types";
import type { ImportedDataset } from "../importers";
import { applyMarketDataToStocks } from "../recomputeScores";

const priority = {
  Demo: 0,
  Official: 1,
  Cached: 1,
  Imported: 2,
  Manual: 3,
  Real: 2,
  Estimated: 1,
  Missing: -1,
  Error: -1
} as const;

export function mergeEventsByPriority(demo: Event[], official: Event[], imported: Event[], manual: Event[], mode: AppDataMode): Event[] {
  const sources = mode === "DemoOnly" ? [demo] : mode === "RealImportedOnly" ? [official, imported, manual] : [demo, official, imported, manual];
  const map = new Map<string, Event>();
  sources.flat().forEach((event) => {
    const key = `${event.symbol}|${event.eventDate}|${event.eventType}`;
    const existing = map.get(key);
    if (!existing || priority[event.dataSource] >= priority[existing.dataSource]) map.set(key, event);
  });
  return Array.from(map.values());
}

export function mergeSecurityMaster(demo: SecurityMasterRecord[], official: SecurityMasterRecord[], imported: SecurityMasterRecord[] = []): SecurityMasterRecord[] {
  const map = new Map<string, SecurityMasterRecord>();
  [...demo, ...official, ...imported].forEach((record) => {
    const existing = map.get(record.symbol);
    if (!existing || priority[record.dataSource] >= priority[existing.dataSource]) map.set(record.symbol, record);
  });
  return Array.from(map.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function mergePriceSnapshots(demo: PriceSnapshot[], official: PriceSnapshot[], imported: PriceSnapshot[]): PriceSnapshot[] {
  const map = new Map<string, PriceSnapshot>();
  [...demo, ...official, ...imported].forEach((record) => {
    const key = `${record.symbol}|${record.date}`;
    const existing = map.get(key);
    if (!existing || priority[record.dataSource] >= priority[existing.dataSource]) map.set(key, record);
  });
  return Array.from(map.values());
}

export function buildEffectiveStocks(base: Stock[], imported: ImportedDataset, official: { priceSnapshots?: PriceSnapshot[] } = {}): Stock[] {
  return applyMarketDataToStocks(base, {
    priceSnapshots: [...(official.priceSnapshots ?? []), ...imported.priceSnapshots],
    institutionalFlows: imported.institutionalFlows,
    marketWarnings: imported.marketWarnings,
    stockPatches: imported.stocks
  });
}

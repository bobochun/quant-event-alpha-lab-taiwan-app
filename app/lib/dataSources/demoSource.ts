import { mockEvents, mockStocks } from "../mockData";
import type { PriceSnapshot, SecurityMasterRecord, SourceHealth } from "../types";
import { DEMO_SOURCE_NOTE } from "../utils";
import { makeSourceHealth } from "./sourceHealth";

export function getDemoSecurityMaster(): SecurityMasterRecord[] {
  return mockStocks.map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    market: stock.symbol.startsWith("00") ? "TWSE" : "Unknown",
    assetType: stock.symbol.startsWith("00") ? "ETF" : "stock",
    industry: stock.sector,
    dataSource: "Demo",
    sourceNote: DEMO_SOURCE_NOTE,
    lastUpdated: new Date().toISOString(),
    confidence: 40
  }));
}

export function getDemoPriceSnapshots(): PriceSnapshot[] {
  return mockStocks.map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    date: new Date().toISOString().slice(0, 10),
    close: stock.price,
    volume: Math.round(stock.liquidityScore * 1000),
    rsi: stock.rsi14,
    twentyDayReturn: stock.twentyDayReturnPct,
    relativeStrength: stock.relativeStrengthRank,
    dataSource: "Demo",
    sourceNote: DEMO_SOURCE_NOTE,
    lastUpdated: new Date().toISOString(),
    confidence: 40
  }));
}

export function getDemoSourceHealth(): SourceHealth {
  return makeSourceHealth({ sourceId: "demo", sourceName: "Demo Data", status: "ok", recordsFetched: mockEvents.length + mockStocks.length });
}

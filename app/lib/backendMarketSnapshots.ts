"use client";

import { fetchKLine, fetchLatestQuote, type KLineBar, type QuoteData } from "./marketApi";
import type { DataSource, PriceSnapshot } from "./types";

const knownDataSources: DataSource[] = ["Real", "Official", "Cached", "Manual", "Imported", "Estimated", "Demo", "Missing", "Error"];

export interface BackendMarketSnapshotResult {
  priceSnapshots: PriceSnapshot[];
  sourceNote: string;
  failedSymbols: string[];
}

export async function fetchBackendPriceSnapshots(symbols: string[], options: { includeKLine?: boolean } = {}): Promise<BackendMarketSnapshotResult> {
  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean)));
  const results = await Promise.allSettled(uniqueSymbols.map((symbol) => fetchBackendPriceSnapshot(symbol, options.includeKLine ?? true)));
  const priceSnapshots: PriceSnapshot[] = [];
  const failedSymbols: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      priceSnapshots.push(result.value);
    } else {
      failedSymbols.push(uniqueSymbols[index]);
    }
  });

  const demoCount = priceSnapshots.filter((snapshot) => snapshot.dataSource === "Demo").length;
  const backendCount = priceSnapshots.length - demoCount;
  const sourceNote = backendCount
    ? `已由後端行情 API 取得 ${backendCount} 檔報價 / K 線資料${demoCount ? `；${demoCount} 檔使用示範 fallback` : ""}。`
    : "後端行情 API 尚未取得可用資料，目前仍使用示範 fallback。";

  return { priceSnapshots, sourceNote, failedSymbols };
}

async function fetchBackendPriceSnapshot(symbol: string, includeKLine: boolean): Promise<PriceSnapshot | null> {
  const quote = await fetchLatestQuote(symbol);
  const kline = includeKLine ? await fetchKLine(symbol, "1d", "1y") : null;
  const latestBar = latestUsableBar(kline?.bars ?? []);
  const close = latestBar?.close ?? quote.price;
  if (!Number.isFinite(close)) return null;
  const twentyDayReturn = calculateReturnPct(kline?.bars ?? [], 20);
  const sixtyDayReturn = calculateReturnPct(kline?.bars ?? [], 60);

  return {
    symbol: quote.symbol,
    name: quote.name,
    date: normalizeDate(latestBar?.time ?? quote.quoteTime),
    open: latestBar?.open ?? quote.open ?? undefined,
    high: latestBar?.high ?? quote.high ?? undefined,
    low: latestBar?.low ?? quote.low ?? undefined,
    close,
    volume: latestBar?.volume ?? quote.volume ?? 0,
    value: quote.value ?? undefined,
    ma20: latestBar?.ma20 ?? undefined,
    ma60: latestBar?.ma60 ?? undefined,
    rsi: latestBar?.rsi14 ?? undefined,
    twentyDayReturn: twentyDayReturn ?? undefined,
    sixtyDayReturn: sixtyDayReturn ?? undefined,
    relativeStrength: estimateRelativeStrength(twentyDayReturn, sixtyDayReturn),
    dataSource: normalizeDataSource(quote),
    sourceName: quote.provider,
    sourceNote: buildSourceNote(quote),
    fetchedAt: quote.fetchedAt,
    lastUpdated: quote.fetchedAt,
    confidence: quote.dataSource === "Demo" ? 35 : quote.isRealtime ? 85 : 65
  };
}

function latestUsableBar(bars: KLineBar[]): KLineBar | undefined {
  return bars.slice().reverse().find((bar) => Number.isFinite(bar.close));
}

function calculateReturnPct(bars: KLineBar[], days: number): number | null {
  if (bars.length <= days) return null;
  const latest = latestUsableBar(bars);
  const past = bars[bars.length - 1 - days];
  if (!latest || !past || !past.close) return null;
  return Number((((latest.close - past.close) / past.close) * 100).toFixed(2));
}

function estimateRelativeStrength(twentyDayReturn: number | null, sixtyDayReturn: number | null): number | undefined {
  if (twentyDayReturn === null && sixtyDayReturn === null) return undefined;
  const score = 50 + (twentyDayReturn ?? 0) * 1.5 + (sixtyDayReturn ?? 0) * 0.5;
  return Math.max(1, Math.min(99, Math.round(score)));
}

function normalizeDataSource(quote: QuoteData): DataSource {
  if (knownDataSources.includes(quote.dataSource as DataSource)) return quote.dataSource as DataSource;
  if (quote.dataSource === "DelayedFallback") return "Cached";
  return "Estimated";
}

function buildSourceNote(quote: QuoteData): string {
  const realtime = quote.isRealtime ? "即時或近即時" : quote.delayMinutes ? `延遲約 ${quote.delayMinutes} 分鐘` : "非即時 / 延遲 / 盤後資料";
  return `${quote.provider} / ${quote.dataSource}：${realtime}。${quote.licenseNote} ${quote.sourceNote}`;
}

function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

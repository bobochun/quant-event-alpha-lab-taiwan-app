import { buildAlphaEngineResults } from "./alphaEngine";
import type { AlphaEngineResult, Event, InstitutionalFlowRecord, MarketWarningRecord, PriceSnapshot, Stock, Theme } from "./types";
import { ESTIMATED_SOURCE_NOTE } from "./utils";

export interface ScoreChange {
  eventId: string;
  symbol: string;
  oldScore: number;
  newScore: number;
  changedBy: number;
  reason: string;
}

export interface RecomputeInput {
  events: Event[];
  stocks: Stock[];
  themes: Theme[];
  priceSnapshots: PriceSnapshot[];
  institutionalFlows: InstitutionalFlowRecord[];
  marketWarnings: MarketWarningRecord[];
  sourcePreference?: string[];
}

export interface RecomputeOutput {
  enrichedEvents: AlphaEngineResult[];
  scoreChanges: ScoreChange[];
  warnings: string[];
  dataQualitySummary: {
    priceRecords: number;
    flowRecords: number;
    warningRecords: number;
    estimatedFields: number;
    lowConfidenceSymbols: string[];
  };
}

export function recomputeEventScores(input: RecomputeInput): RecomputeOutput {
  const baseline = buildAlphaEngineResults(input.events, input.stocks, input.themes);
  const enrichedStocks = applyMarketDataToStocks(input.stocks, input);
  const enriched = buildAlphaEngineResults(input.events, enrichedStocks, input.themes).map((row) => withDiagnostics(row, input));
  const scoreChanges = enriched.flatMap((row) => {
    const oldRow = baseline.find((item) => item.event.id === row.event.id);
    if (!oldRow) return [];
    const oldScore = Math.round(oldRow.alpha.combinedAlphaScore);
    const newScore = Math.round(row.alpha.combinedAlphaScore);
    if (oldScore === newScore) return [];
    const reasons = [];
    if (input.priceSnapshots.some((item) => item.symbol === row.event.symbol)) reasons.push("price_snapshot");
    if (input.institutionalFlows.some((item) => item.symbol === row.event.symbol)) reasons.push("institutional_flow");
    if (input.marketWarnings.some((item) => item.symbol === row.event.symbol)) reasons.push("market_warnings");
    return [{ eventId: row.event.id, symbol: row.event.symbol, oldScore, newScore, changedBy: newScore - oldScore, reason: `已根據 ${reasons.join(" / ") || "匯入資料"} 重新計分。` }];
  });
  const lowConfidenceSymbols = enriched.filter((row) => row.dataQualityWarnings?.length).map((row) => row.event.symbol);
  return {
    enrichedEvents: enriched,
    scoreChanges,
    warnings: lowConfidenceSymbols.length ? ["部分事件缺少完整技術或籌碼欄位，已降低資料信心並保留估算提示。"] : [],
    dataQualitySummary: {
      priceRecords: input.priceSnapshots.length,
      flowRecords: input.institutionalFlows.length,
      warningRecords: input.marketWarnings.length,
      estimatedFields: enriched.reduce((sum, row) => sum + (row.sourceDiagnostics?.estimatedFields.length ?? 0), 0),
      lowConfidenceSymbols: Array.from(new Set(lowConfidenceSymbols))
    }
  };
}

export function applyMarketDataToStocks(base: Stock[], input: { priceSnapshots?: PriceSnapshot[]; institutionalFlows?: InstitutionalFlowRecord[]; marketWarnings?: MarketWarningRecord[]; stockPatches?: Partial<Stock>[] }): Stock[] {
  return base.map((stock) => {
    const latestPrice = latestByDate(input.priceSnapshots?.filter((item) => item.symbol === stock.symbol) ?? [], "date");
    const latestFlow = latestByDate(input.institutionalFlows?.filter((item) => item.symbol === stock.symbol) ?? [], "date");
    const warning = latestByDate(input.marketWarnings?.filter((item) => item.symbol === stock.symbol) ?? [], "startDate");
    const patch = input.stockPatches?.find((item) => item.symbol === stock.symbol);
    const estimatedFields: string[] = [];
    const next: Stock = { ...stock, ...patch };
    if (latestPrice) {
      next.price = latestPrice.close;
      next.previousClose = latestPrice.close;
      next.rsi14 = latestPrice.rsi ?? estimateRsi(latestPrice);
      next.twentyDayReturnPct = latestPrice.twentyDayReturn ?? next.twentyDayReturnPct;
      next.relativeStrengthRank = latestPrice.relativeStrength ?? next.relativeStrengthRank;
      next.ma20DistancePct = latestPrice.ma20 ? ((latestPrice.close - latestPrice.ma20) / latestPrice.ma20) * 100 : next.ma20DistancePct;
      next.volatility20d = latestPrice.atr && latestPrice.close ? Math.min(80, (latestPrice.atr / latestPrice.close) * 100 * 6) : next.volatility20d;
      next.dataSource = latestPrice.dataSource;
      next.sourceNote = latestPrice.sourceNote;
      if (!latestPrice.ma20) estimatedFields.push("ma20DistancePct");
      if (!latestPrice.rsi) estimatedFields.push("rsi14");
    }
    if (latestFlow) {
      const scale = Math.max(1, Math.abs(latestFlow.totalInstitutionalNetBuy) / 1000);
      next.institutionalFlow5d = latestFlow.totalInstitutionalNetBuy > 0 ? Math.min(90, scale) : -Math.min(90, scale);
      next.foreignFlow5d = latestFlow.foreignNetBuy / 1000;
      next.investmentTrustFlow5d = latestFlow.investmentTrustNetBuy / 1000;
      next.dealerFlow5d = latestFlow.dealerNetBuy / 1000;
      next.dataSource = latestFlow.dataSource;
      next.sourceNote = latestFlow.sourceNote;
    }
    if (warning) {
      next.isAttentionStock = warning.warningType === "attention" || next.isAttentionStock;
      next.isDispositionStock = warning.warningType === "disposition" || next.isDispositionStock;
      next.dataSource = warning.dataSource;
      next.sourceNote = warning.sourceNote;
    }
    if (estimatedFields.length) next.sourceNote = `${next.sourceNote} ${ESTIMATED_SOURCE_NOTE}`;
    return next;
  });
}

function withDiagnostics(row: AlphaEngineResult, input: RecomputeInput): AlphaEngineResult {
  const price = input.priceSnapshots.find((item) => item.symbol === row.event.symbol);
  const flow = input.institutionalFlows.find((item) => item.symbol === row.event.symbol);
  const warning = input.marketWarnings.find((item) => item.symbol === row.event.symbol);
  const estimatedFields = [
    price && !price.ma20 ? "ma20DistancePct" : "",
    price && !price.rsi ? "rsi14" : "",
    price && !price.relativeStrength ? "relativeStrength" : ""
  ].filter(Boolean);
  const dataQualityWarnings = [
    !price ? "缺少匯入或官方 price_snapshot，技術分數使用 fallback。" : "",
    !flow ? "缺少匯入或官方 institutional_flow，籌碼分數使用 fallback。" : "",
    estimatedFields.length ? "部分技術指標由有限資料估算。" : ""
  ].filter(Boolean);
  return {
    ...row,
    scoreRecomputed: Boolean(price || flow || warning),
    dataQualityWarnings,
    sourceDiagnostics: {
      eventSource: row.event.dataSource,
      priceSource: price?.dataSource ?? row.stock?.dataSource ?? "Demo",
      flowSource: flow?.dataSource ?? row.stock?.dataSource ?? "Demo",
      warningSource: warning?.dataSource ?? (row.stock?.isAttentionStock || row.stock?.isDispositionStock ? row.stock.dataSource : "Missing"),
      estimatedFields
    }
  };
}

function latestByDate<T>(items: T[], key: keyof T): T | undefined {
  return items.slice().sort((a, b) => String(b[key]).localeCompare(String(a[key])))[0];
}

function estimateRsi(price: PriceSnapshot): number {
  if (price.twentyDayReturn === undefined) return 50;
  return Math.max(20, Math.min(80, 50 + price.twentyDayReturn * 1.2));
}

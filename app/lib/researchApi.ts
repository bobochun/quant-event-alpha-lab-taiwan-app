"use client";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export type CrossSectionRank = {
  symbol: string;
  name: string;
  quantScore: number;
  rank: number;
  percentile: number;
  trendState: string;
  momentumState: string;
  overheatRisk: string;
  dataQuality: string;
  provider: string;
  dataSource: string;
  warnings: string[];
};

export type CrossSectionPayload = { asOf: string; universeSize: number; ranks: CrossSectionRank[]; warnings: string[] };
export type EventStudyInput = { eventId: string; symbol: string; eventType: string; eventDate: string; benchmarkSymbol?: string; preDays?: number; postDays?: number };
export type EventStudyResult = { eventId: string; symbol: string; eventType: string; eventDate: string; benchmarkSymbol: string; preReturn?: number | null; postReturn?: number | null; benchmarkPreReturn?: number | null; benchmarkPostReturn?: number | null; abnormalPreReturn?: number | null; abnormalPostReturn?: number | null; maxDrawdown?: number | null; hit?: boolean | null; sampleSize: number; sourceNote: string; warnings: string[] };
export type ThemeStrengthRow = { theme: string; symbols: string[]; averageScore: number; averageReturn20d?: number | null; averageReturn60d?: number | null; hotCount: number; overheatedCount: number; rank: number; note: string };
export type TradingCostResult = { notional: number; fee: number; tax: number; slippage: number; totalCost: number; costPct: number; note: string };
export type PortfolioOptimizeResult = { capital: number; weights: Array<{ symbol: string; weightPct: number; suggestedValue: number; reason: string }>; themeExposure: Record<string, number>; warnings: string[]; sourceNote: string };
export type WalkForwardResult = { modelVersion: string; trainStart: string; trainEnd: string; testStart: string; testEnd: string; sampleSize: number; hitRate?: number | null; averageForwardReturn?: number | null; maxDrawdown?: number | null; warnings: string[]; sourceNote: string };
export type DataQualityReport = { dataset: string; provider: string; recordsChecked: number; missingRate: number; staleRate: number; errorRate: number; score: number; warning?: string | null; checkedAt: string };

export async function fetchCrossSection(symbols: string[], persist = false): Promise<CrossSectionPayload> {
  const params = new URLSearchParams({ symbols: unique(symbols).join(","), persist: String(persist) });
  const body = await apiGet(`/research/cross-section?${params.toString()}`, "Cross-section failed");
  return body.data as CrossSectionPayload;
}

export async function fetchThemeStrength(symbols: string[]): Promise<ThemeStrengthRow[]> {
  const params = new URLSearchParams({ symbols: unique(symbols).join(",") });
  const body = await apiGet(`/research/theme-strength?${params.toString()}`, "Theme strength failed");
  return body.data as ThemeStrengthRow[];
}

export async function runEventStudy(input: EventStudyInput): Promise<EventStudyResult> {
  const body = await apiPost("/research/event-study", { eventId: input.eventId, symbol: input.symbol, eventType: input.eventType, eventDate: input.eventDate, benchmarkSymbol: input.benchmarkSymbol ?? "^TWII", preDays: input.preDays ?? 10, postDays: input.postDays ?? 10 }, "Event study failed");
  return body.data as EventStudyResult;
}

export async function fetchWalkForward(symbols: string[]): Promise<WalkForwardResult> {
  const params = new URLSearchParams({ symbols: unique(symbols).join(",") });
  const body = await apiGet(`/research/walk-forward?${params.toString()}`, "Walk-forward failed");
  return body.data as WalkForwardResult;
}

export async function fetchDataQuality(): Promise<DataQualityReport[]> {
  const body = await apiGet("/research/data-quality", "Data quality failed");
  return body.data as DataQualityReport[];
}

export async function runTradingCost(input: { price: number; shares: number; side?: "buy" | "sell" | "roundTrip"; feeRate?: number; taxRate?: number; slippageBps?: number }): Promise<TradingCostResult> {
  const body = await apiPost("/research/trading-cost", input, "Trading cost failed");
  return body.data as TradingCostResult;
}

export async function optimizePortfolio(input: { capital: number; maxPositionPct: number; maxThemePct: number; symbols: string[]; themeMap?: Record<string, string[]> }): Promise<PortfolioOptimizeResult> {
  const body = await apiPost("/research/portfolio-optimize", input, "Portfolio optimize failed");
  return body.data as PortfolioOptimizeResult;
}

function unique(symbols: string[]): string[] { return Array.from(new Set(symbols.map((item) => item.trim()).filter(Boolean))); }
async function apiGet(path: string, errorMessage: string) { const response = await fetchWithTimeout(`${backendUrl}${path}`, 18000); const body = await response.json().catch(() => null); if (!response.ok || !body?.ok) throw new Error(body?.error ?? errorMessage); return body; }
async function apiPost(path: string, payload: unknown, errorMessage: string) { const response = await fetchWithTimeout(`${backendUrl}${path}`, 22000, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const body = await response.json().catch(() => null); if (!response.ok || !body?.ok) throw new Error(body?.error ?? errorMessage); return body; }
async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> { const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), timeoutMs); try { return await fetch(url, { cache: "no-store", signal: controller.signal, ...init }); } finally { window.clearTimeout(timer); } }

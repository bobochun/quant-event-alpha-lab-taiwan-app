"use client";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export type QuantRiskLevel = "low" | "medium" | "high" | "critical";
export type QuantTrendState = "bullish" | "sideways" | "bearish" | "unknown";
export type QuantMomentumState = "warming" | "hot" | "cooling" | "weak" | "unknown";
export type QuantMode = "balanced" | "lowBase" | "momentumRotation" | "pullback" | "overheatAvoidance" | "riskFirst";

export type QuantScoreBreakdown = {
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  rsiScore: number;
  maStructureScore: number;
  volumeScore: number;
  overheatPenalty: number;
  dataQualityPenalty: number;
};

export type QuantAnalysisResult = {
  symbol: string;
  name: string;
  interval: string;
  range: string;
  quantScore: number;
  trendState: QuantTrendState;
  momentumState: QuantMomentumState;
  overheatRisk: QuantRiskLevel;
  dataQuality: "high" | "medium" | "low";
  latestClose?: number | null;
  ma5?: number | null;
  ma20?: number | null;
  ma60?: number | null;
  rsi14?: number | null;
  return20d?: number | null;
  return60d?: number | null;
  volatility20d?: number | null;
  volumeRatio20d?: number | null;
  breakdown: QuantScoreBreakdown;
  warnings: string[];
  explanation: string;
  nextAction: string;
  provider: string;
  dataSource: string;
  isRealtime: boolean;
  delayMinutes?: number | null;
  fetchedAt: string;
};

export type QuantBatchPayload = {
  results: QuantAnalysisResult[];
  warnings: string[];
  generatedAt: string;
};

export type QuantModeConfig = {
  mode: QuantMode;
  label: string;
  description: string;
  bestFor: string;
  weights: Record<string, number>;
  hardFilters: string[];
  warnings: string[];
};

export type SystematicQuantResult = {
  symbol: string;
  name: string;
  mode: QuantMode;
  modeLabel: string;
  systematicScore: number;
  baseQuantScore: number;
  rank: number;
  percentile: number;
  passedFilters: boolean;
  rejectReasons: string[];
  keyDrivers: string[];
  warnings: string[];
  nextAction: string;
  latestClose?: number | null;
  trendState: QuantTrendState;
  momentumState: QuantMomentumState;
  overheatRisk: QuantRiskLevel;
  dataQuality: "high" | "medium" | "low";
  provider: string;
  dataSource: string;
  explanation: string;
};

export type SystematicScanPayload = {
  mode: QuantMode;
  modeConfig: QuantModeConfig;
  universeSize: number;
  passedCount: number;
  results: SystematicQuantResult[];
  warnings: string[];
  generatedAt: string;
};

export async function fetchQuantAnalysis(symbol: string, interval = "1d", range = "1y"): Promise<QuantAnalysisResult> {
  const params = new URLSearchParams({ interval, range });
  const response = await fetchWithTimeout(`${backendUrl}/quant/analyze/${encodeURIComponent(symbol)}?${params.toString()}`, 12000);
  if (!response.ok) throw new Error(`Quant API HTTP ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(body.error ?? "Quant API error");
  return body.data as QuantAnalysisResult;
}

export async function fetchQuantBatch(symbols: string[], interval = "1d", range = "1y"): Promise<QuantBatchPayload> {
  const params = new URLSearchParams({ symbols: Array.from(new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean))).join(","), interval, range });
  const response = await fetchWithTimeout(`${backendUrl}/quant/analyze?${params.toString()}`, 20000);
  if (!response.ok) throw new Error(`Quant batch API HTTP ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(body.error ?? "Quant batch API error");
  return body.data as QuantBatchPayload;
}

export async function fetchQuantModes(): Promise<QuantModeConfig[]> {
  const response = await fetchWithTimeout(`${backendUrl}/quant/modes`, 8000);
  if (!response.ok) throw new Error(`Quant modes API HTTP ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(body.error ?? "Quant modes API error");
  return body.data as QuantModeConfig[];
}

export async function fetchSystematicScan(symbols: string[], mode: QuantMode, interval = "1d", range = "1y"): Promise<SystematicScanPayload> {
  const params = new URLSearchParams({
    mode,
    symbols: Array.from(new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean))).join(","),
    interval,
    range
  });
  const response = await fetchWithTimeout(`${backendUrl}/quant/systematic-scan?${params.toString()}`, 25000);
  if (!response.ok) throw new Error(`Systematic scan API HTTP ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(body.error ?? "Systematic scan API error");
  return body.data as SystematicScanPayload;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

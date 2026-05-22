"use client";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export type AutoRefreshJobName =
  | "refresh_latest_quotes"
  | "refresh_daily_kline"
  | "refresh_institutional_flow"
  | "quant_scan_daily"
  | "source_digest_collect"
  | "ai_source_digest_analysis";

export type AutoRefreshJobResult = {
  jobName: AutoRefreshJobName;
  ok: boolean;
  recordsProcessed: number;
  message: string;
  dataSource?: string;
  error?: string | null;
  completedAt: string;
};

export type AutoRefreshState = {
  running: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  results: AutoRefreshJobResult[];
  warnings: string[];
};

const DEFAULT_SYMBOLS = ["2330", "2382", "2317", "2308", "3017", "3037", "3231", "2603", "2615", "2454"];
const LIGHT_JOBS: AutoRefreshJobName[] = ["refresh_latest_quotes", "refresh_institutional_flow", "quant_scan_daily"];
const HEAVY_JOBS: AutoRefreshJobName[] = ["refresh_daily_kline", "source_digest_collect", "ai_source_digest_analysis"];

export function getDefaultRefreshSymbols(): string[] {
  const env = process.env.NEXT_PUBLIC_AUTO_REFRESH_SYMBOLS;
  if (!env) return DEFAULT_SYMBOLS;
  const parsed = env.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean);
  return parsed.length ? parsed : DEFAULT_SYMBOLS;
}

export function getAutoRefreshIntervalMs(): number {
  const value = Number(process.env.NEXT_PUBLIC_AUTO_REFRESH_INTERVAL_SECONDS ?? "300");
  return Math.max(60, Number.isFinite(value) ? value : 300) * 1000;
}

export function isFrontendAutoRefreshEnabled(): boolean {
  return (process.env.NEXT_PUBLIC_ENABLE_AUTO_REFRESH ?? "true").toLowerCase() !== "false";
}

export async function runAutoRefreshCycle(options?: { symbols?: string[]; includeHeavyJobs?: boolean }): Promise<AutoRefreshJobResult[]> {
  const symbols = options?.symbols?.length ? options.symbols : getDefaultRefreshSymbols();
  const jobs = options?.includeHeavyJobs ? [...LIGHT_JOBS, ...HEAVY_JOBS] : LIGHT_JOBS;
  const results: AutoRefreshJobResult[] = [];
  for (const jobName of jobs) {
    results.push(await runJob(jobName, symbols));
  }
  return results;
}

export async function runJob(jobName: AutoRefreshJobName, symbols: string[]): Promise<AutoRefreshJobResult> {
  const completedAt = new Date().toISOString();
  try {
    const response = await fetchWithTimeout(`${backendUrl}/jobs/run`, 20000, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobName, symbols })
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      return { jobName, ok: false, recordsProcessed: 0, message: body?.error ?? `HTTP ${response.status}`, dataSource: body?.dataSource, error: body?.error ?? `HTTP ${response.status}`, completedAt };
    }
    return {
      jobName,
      ok: true,
      recordsProcessed: Number(body.data?.recordsProcessed ?? 0),
      message: body.sourceNote ?? "Auto refresh job completed.",
      dataSource: body.dataSource,
      error: null,
      completedAt
    };
  } catch (error) {
    return { jobName, ok: false, recordsProcessed: 0, message: error instanceof Error ? error.message : "Auto refresh job failed.", error: error instanceof Error ? error.message : "Auto refresh job failed.", completedAt };
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal, ...init });
  } finally {
    window.clearTimeout(timer);
  }
}

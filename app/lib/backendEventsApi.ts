"use client";

import type { DataSource, Event, EventType } from "./types";

export type BackendEventProviderStatus = {
  provider: string;
  status: "ok" | "degraded" | "error" | "disabled";
  supportsEvents: boolean;
  supportsMonthlyRevenue: boolean;
  supportsDividends: boolean;
  supportsInvestorConference: boolean;
  supportsAttentionDisposition: boolean;
  tokenConfigured: boolean;
  recordsFetched: number;
  errorMessage?: string | null;
  sourceNote: string;
  checkedAt: string;
};

export type BackendEventsResult = {
  events: Event[];
  providers: BackendEventProviderStatus[];
  sourceNote: string;
  generatedAt: string;
  dataSource: DataSource;
  error?: string;
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const validEventTypes: EventType[] = [
  "investorConference", "exDividend", "monthlyRevenue", "earnings", "foreignBrokerReport", "majorHolderChange", "etfRebalance", "attentionStock", "dispositionStock", "shareholderMeetingGift", "productLaunch", "aiServerNews", "semiconductorNews", "industryConference", "policy", "orderContract", "buyback", "capitalIncrease", "convertibleBond", "mergerAcquisition", "supplyChainNews", "other"
];
const validDataSources: DataSource[] = ["Real", "Official", "Cached", "Manual", "Imported", "Estimated", "Demo", "Missing", "Error"];

export async function fetchBackendEvents(options: { days?: number; symbols?: string[]; provider?: "auto" | "finmind" | "official" | "mops" } = {}): Promise<BackendEventsResult> {
  const params = new URLSearchParams();
  params.set("days", String(options.days ?? 30));
  params.set("provider", options.provider ?? "auto");
  if (options.symbols?.length) params.set("symbols", Array.from(new Set(options.symbols)).join(","));

  try {
    const response = await fetchWithTimeout(`${backendUrl}/events/upcoming?${params.toString()}`, 5000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body.ok || !body.data) throw new Error(body.error ?? "後端沒有回傳事件資料。");
    const payload = body.data as { events?: unknown[]; providers?: BackendEventProviderStatus[]; sourceNote?: string; generatedAt?: string };
    return {
      events: (payload.events ?? []).map(normalizeBackendEvent).filter((event): event is Event => Boolean(event)),
      providers: payload.providers ?? [],
      sourceNote: payload.sourceNote ?? body.sourceNote ?? "後端事件 API 已回應。",
      generatedAt: payload.generatedAt ?? new Date().toISOString(),
      dataSource: normalizeDataSource(body.dataSource),
    };
  } catch (error) {
    return {
      events: [],
      providers: [],
      sourceNote: "後端事件 API 暫時不可用；保留 Imported / Manual / Demo fallback，且不會假裝 demo 為真實事件。",
      generatedAt: new Date().toISOString(),
      dataSource: "Error",
      error: error instanceof Error ? error.message : "後端事件 API 連線失敗",
    };
  }
}

function normalizeBackendEvent(raw: unknown): Event | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const symbol = text(item.symbol);
  const eventDate = text(item.eventDate);
  const eventType = validEventTypes.includes(item.eventType as EventType) ? item.eventType as EventType : "other";
  if (!symbol || !eventDate) return null;
  const now = new Date().toISOString();
  return {
    id: text(item.id) || `backend-event-${symbol}-${eventType}-${eventDate}`,
    symbol,
    name: text(item.name) || `${symbol} 台股標的`,
    eventType,
    eventTitle: text(item.eventTitle) || "後端事件 metadata",
    eventDate,
    eventTime: optionalText(item.eventTime),
    source: text(item.source) || "Backend event provider",
    sourceUrl: optionalText(item.sourceUrl),
    dataSource: normalizeDataSource(item.dataSource),
    sourceNote: text(item.sourceNote) || "後端事件 provider 回傳的 metadata，請自行確認來源與交易適用性。",
    confidence: numberInRange(item.confidence, 0, 100, 55),
    expectedImpact: numberInRange(item.expectedImpact, 0, 100, 50),
    marketAwareness: numberInRange(item.marketAwareness, 0, 100, 50),
    relatedThemes: Array.isArray(item.relatedThemes) ? item.relatedThemes.map(String).filter(Boolean) : ["Market Event"],
    createdAt: text(item.createdAt) || now,
    updatedAt: text(item.updatedAt) || now,
  };
}

function normalizeDataSource(value: unknown): DataSource {
  return validDataSources.includes(value as DataSource) ? value as DataSource : "Estimated";
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);
}

function optionalText(value: unknown): string | undefined {
  const result = text(value);
  return result || undefined;
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numberValue)));
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

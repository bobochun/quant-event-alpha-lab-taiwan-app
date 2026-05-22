"use client";

export type MarketRange = "1d" | "5d" | "1m" | "3m" | "6m" | "ytd" | "1y" | "3y" | "5y" | "custom";
export type MarketInterval = "1m" | "5m" | "15m" | "1d" | "1w" | "1mo";

export type QuoteData = {
  symbol: string;
  name: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  value: number | null;
  quoteTime: string;
  provider: string;
  dataSource: string;
  isRealtime: boolean;
  delayMinutes: number | null;
  licenseNote: string;
  sourceNote: string;
  fetchedAt: string;
};

export type KLineBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5?: number | null;
  ma20?: number | null;
  ma60?: number | null;
  rsi14?: number | null;
};

export type KLinePayload = {
  symbol: string;
  name: string;
  interval: MarketInterval;
  range: MarketRange;
  bars: KLineBar[];
  provider: string;
  dataSource: string;
  isRealtime: boolean;
  delayMinutes: number | null;
  licenseNote: string;
  fetchedAt: string;
  indicatorSource: string;
};

export type InstitutionalFlowData = {
  symbol: string;
  name: string;
  tradeDate: string;
  foreignNetBuyShares: number;
  investmentTrustNetBuyShares: number;
  dealerNetBuyShares: number;
  totalInstitutionalNetBuyShares: number;
  foreignConsecutiveDays: number;
  investmentTrustConsecutiveDays: number;
  dealerConsecutiveDays: number;
  flowConfirmationScore: number;
  flowBias: "accumulation" | "distribution" | "mixed" | "neutral" | "unknown";
  warnings: string[];
  provider: string;
  dataSource: string;
  sourceNote: string;
  fetchedAt: string;
};

export type StockProfile = {
  symbol: string;
  name: string;
  market: string;
  industry?: string | null;
  assetType: string;
  themes: string[];
  marketCapNote?: string | null;
  liquidityNote?: string | null;
  sourceNote: string;
  dataSource: string;
};

export type TechnicalSummary = {
  trendState: string;
  momentumState: string;
  overheatRisk: "low" | "medium" | "high" | "critical";
  latestClose?: number | null;
  ma5?: number | null;
  ma20?: number | null;
  ma60?: number | null;
  rsi14?: number | null;
  return20d?: number | null;
  return60d?: number | null;
  volatility20d?: number | null;
  volumeRatio20d?: number | null;
  warnings: string[];
};

export type MarketSummaryPayload = {
  symbol: string;
  name: string;
  profile: StockProfile;
  quote?: QuoteData | null;
  technical?: TechnicalSummary | null;
  institutionalFlow?: InstitutionalFlowData | null;
  keyPoints: string[];
  riskFlags: string[];
  sourceNote: string;
  generatedAt: string;
};

export type MarketProviderStatus = {
  provider: string;
  datasetType: string;
  status: "ok" | "degraded" | "error" | "disabled";
  errorMessage?: string | null;
  supportsLatestQuote: boolean;
  supportsIntraday: boolean;
  supportsDaily: boolean;
  isRealtime: boolean;
  tokenConfigured: boolean;
};

const names: Record<string, string> = {
  "2330": "台積電",
  "2317": "鴻海",
  "2382": "廣達",
  "3231": "緯創",
  "6669": "緯穎",
  "2308": "台達電",
  "3017": "奇鋐",
  "2454": "聯發科"
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function fetchLatestQuote(symbol: string): Promise<QuoteData> {
  try {
    const response = await fetchWithTimeout(`${backendUrl}/quotes/latest/${encodeURIComponent(symbol)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body.ok || !body.data) throw new Error(body.error ?? "後端沒有回傳報價資料。");
    return body.data as QuoteData;
  } catch (error) {
    return demoQuote(symbol, error instanceof Error ? error.message : "後端連線失敗");
  }
}

export async function fetchKLine(symbol: string, interval: MarketInterval, range: MarketRange): Promise<KLinePayload> {
  try {
    const response = await fetchWithTimeout(`${backendUrl}/kline/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body.ok || !body.data) throw new Error(body.error ?? "後端沒有回傳 K 線資料。");
    return body.data as KLinePayload;
  } catch (error) {
    return demoKLine(symbol, interval, range, error instanceof Error ? error.message : "後端連線失敗");
  }
}

export async function fetchMarketSummary(symbol: string): Promise<MarketSummaryPayload> {
  try {
    const response = await fetchWithTimeout(`${backendUrl}/market-data/summary/${encodeURIComponent(symbol)}`, 7000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body.ok || !body.data) throw new Error(body.error ?? "後端沒有回傳個股摘要。");
    return body.data as MarketSummaryPayload;
  } catch (error) {
    return demoMarketSummary(symbol, error instanceof Error ? error.message : "後端連線失敗");
  }
}

export async function fetchInstitutionalFlow(symbol: string): Promise<InstitutionalFlowData> {
  try {
    const response = await fetchWithTimeout(`${backendUrl}/market-data/institutional-flow/${encodeURIComponent(symbol)}`, 5000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body.ok || !body.data) throw new Error(body.error ?? "後端沒有回傳法人籌碼。");
    return body.data as InstitutionalFlowData;
  } catch (error) {
    return demoInstitutionalFlow(symbol, error instanceof Error ? error.message : "後端連線失敗");
  }
}

export async function fetchMarketProviders(): Promise<MarketProviderStatus[]> {
  try {
    const response = await fetchWithTimeout(`${backendUrl}/market-data/providers`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body.ok || !Array.isArray(body.data)) throw new Error(body.error ?? "後端沒有回傳 provider 狀態。");
    return body.data as MarketProviderStatus[];
  } catch {
    return [
      { provider: "licensed-realtime-placeholder", datasetType: "quotes_latest", status: "disabled", errorMessage: "合法即時報價 provider 尚未設定。", supportsLatestQuote: true, supportsIntraday: true, supportsDaily: true, isRealtime: true, tokenConfigured: false },
      { provider: "finmind", datasetType: "quotes_latest,kline", status: "disabled", errorMessage: "未設定 FINMIND_API_TOKEN 時使用 fallback。", supportsLatestQuote: true, supportsIntraday: false, supportsDaily: true, isRealtime: false, tokenConfigured: false },
      { provider: "twse-official", datasetType: "official_market_data", status: "disabled", errorMessage: "官方公開資料不標示為即時。", supportsLatestQuote: false, supportsIntraday: false, supportsDaily: true, isRealtime: false, tokenConfigured: false },
      { provider: "tpex-official", datasetType: "official_market_data", status: "disabled", errorMessage: "官方公開資料不標示為即時。", supportsLatestQuote: false, supportsIntraday: false, supportsDaily: true, isRealtime: false, tokenConfigured: false },
      { provider: "yfinance", datasetType: "quotes_latest,kline", status: "degraded", errorMessage: "非官方研究 fallback，可能延遲或不穩定。", supportsLatestQuote: true, supportsIntraday: true, supportsDaily: true, isRealtime: false, tokenConfigured: false }
    ];
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export function supportsRealtimePolling(quote: QuoteData | null): boolean {
  return Boolean(quote?.isRealtime);
}

function demoQuote(symbol: string, reason: string): QuoteData {
  const now = new Date();
  const base = basePrice(symbol);
  const price = Number((base * (1 + Math.sin(Date.now() / 86400000) * 0.012)).toFixed(2));
  const previousClose = Number((base * 0.991).toFixed(2));
  const change = Number((price - previousClose).toFixed(2));
  return {
    symbol,
    name: names[symbol] ?? `${symbol} 台股標的`,
    price,
    previousClose,
    change,
    changePercent: Number(((change / previousClose) * 100).toFixed(2)),
    open: Number((previousClose * 1.002).toFixed(2)),
    high: Number((Math.max(price, previousClose) * 1.015).toFixed(2)),
    low: Number((Math.min(price, previousClose) * 0.985).toFixed(2)),
    volume: Math.round((1800 + base * 38) * 1000),
    value: Math.round((1800 + base * 38) * 1000 * price),
    quoteTime: now.toISOString(),
    provider: "frontend-demo-fallback",
    dataSource: "Demo",
    isRealtime: false,
    delayMinutes: null,
    licenseNote: "前端示範 fallback，不是真實即時行情。",
    sourceNote: `後端不可用時的示範報價：${reason}`,
    fetchedAt: now.toISOString()
  };
}

function demoInstitutionalFlow(symbol: string, reason: string): InstitutionalFlowData {
  const base = basePrice(symbol);
  const foreign = Math.round(((base % 7) - 3) * 650000);
  const trust = Math.round(((base % 5) - 2) * 280000);
  const dealer = Math.round(((base % 3) - 1) * 150000);
  const total = foreign + trust + dealer;
  return {
    symbol,
    name: names[symbol] ?? `${symbol} 台股標的`,
    tradeDate: new Date().toISOString().slice(0, 10),
    foreignNetBuyShares: foreign,
    investmentTrustNetBuyShares: trust,
    dealerNetBuyShares: dealer,
    totalInstitutionalNetBuyShares: total,
    foreignConsecutiveDays: foreign > 0 ? 2 : foreign < 0 ? -2 : 0,
    investmentTrustConsecutiveDays: trust > 0 ? 3 : trust < 0 ? -1 : 0,
    dealerConsecutiveDays: dealer > 0 ? 1 : dealer < 0 ? -1 : 0,
    flowConfirmationScore: Math.max(0, Math.min(100, 50 + (foreign > 0 ? 15 : -10) + (trust > 0 ? 20 : -12) + (total > 0 ? 10 : -8))),
    flowBias: total > 0 && foreign > 0 && trust > 0 ? "accumulation" : total < 0 ? "distribution" : "mixed",
    warnings: [`前端 Demo 法人籌碼 fallback，不是真實外資/投信資料：${reason}`],
    provider: "frontend-demo-flow",
    dataSource: "Demo",
    sourceNote: "Demo institutional flow fallback.",
    fetchedAt: new Date().toISOString()
  };
}

function demoMarketSummary(symbol: string, reason: string): MarketSummaryPayload {
  const flow = demoInstitutionalFlow(symbol, reason);
  return {
    symbol,
    name: names[symbol] ?? `${symbol} 台股標的`,
    profile: {
      symbol,
      name: names[symbol] ?? `${symbol} 台股標的`,
      market: "TWSE/TPEx/ETF",
      industry: "Unknown",
      assetType: symbol.startsWith("00") ? "ETF" : "stock",
      themes: ["Market Watch"],
      marketCapNote: "前端 fallback，尚未接官方市值資料。",
      liquidityNote: "請用成交量與成交值確認流動性。",
      sourceNote: `前端 fallback profile：${reason}`,
      dataSource: "Demo"
    },
    quote: demoQuote(symbol, reason),
    technical: null,
    institutionalFlow: flow,
    keyPoints: ["後端 summary 不可用，目前使用前端 fallback。", `法人籌碼 fallback 分數 ${flow.flowConfirmationScore}。`],
    riskFlags: ["fallback 資料不可視為真實行情或法人買賣超。"],
    sourceNote: `Frontend market summary fallback: ${reason}`,
    generatedAt: new Date().toISOString()
  };
}

function demoKLine(symbol: string, interval: MarketInterval, range: MarketRange, reason: string): KLinePayload {
  const end = new Date();
  const days = rangeDays(range);
  const bars: KLineBar[] = [];
  let price = basePrice(symbol);
  for (let index = days; index >= 0; index -= interval === "1w" ? 7 : interval === "1mo" ? 30 : 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - index);
    if (interval === "1d" && (date.getDay() === 0 || date.getDay() === 6)) continue;
    const wave = Math.sin((days - index) / 7) * 0.012;
    const open = price;
    const close = Number((price * (1 + wave + ((days - index) % 5 - 2) * 0.002)).toFixed(2));
    const high = Number((Math.max(open, close) * 1.016).toFixed(2));
    const low = Number((Math.min(open, close) * 0.986).toFixed(2));
    const volume = Math.round((1700 + Math.abs(wave) * 90000 + basePrice(symbol) * 16) * 1000);
    bars.push({ time: date.toISOString().slice(0, 10), open: Number(open.toFixed(2)), high, low, close, volume });
    price = close;
  }
  const enriched = attachClientIndicators(bars);
  return {
    symbol,
    name: names[symbol] ?? `${symbol} 台股標的`,
    interval,
    range,
    bars: enriched,
    provider: "frontend-demo-fallback",
    dataSource: "Demo",
    isRealtime: false,
    delayMinutes: null,
    licenseNote: "前端示範 fallback，不是真實即時行情。",
    fetchedAt: new Date().toISOString(),
    indicatorSource: `前端示範資料計算；後端不可用原因：${reason}`
  };
}

function attachClientIndicators(bars: KLineBar[]): KLineBar[] {
  return bars.map((bar, index) => ({
    ...bar,
    ma5: average(bars, index, 5),
    ma20: average(bars, index, 20),
    ma60: average(bars, index, 60)
  }));
}

function average(bars: KLineBar[], index: number, window: number): number | null {
  if (index + 1 < window) return null;
  const slice = bars.slice(index + 1 - window, index + 1);
  return Number((slice.reduce((sum, bar) => sum + bar.close, 0) / window).toFixed(2));
}

function basePrice(symbol: string): number {
  return 40 + Array.from(symbol).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 900;
}

function rangeDays(range: MarketRange): number {
  return ({ "1d": 1, "5d": 8, "1m": 31, "3m": 93, "6m": 186, ytd: Math.max(1, Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000)), "1y": 366, "3y": 1098, "5y": 1830, custom: 366 } as Record<MarketRange, number>)[range];
}

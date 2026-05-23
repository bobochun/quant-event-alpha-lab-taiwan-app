"use client";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export type AIEvidence = {
  sourceUrl: string;
  sourceTitle: string;
  publishedAt?: string | null;
  evidenceSnippet: string;
  sourceType: string;
};

export type AIEventFactor = {
  symbol: string;
  eventType: string;
  eventDate?: string | null;
  relatedThemes: string[];
  eventNoveltyScore: number;
  surprisePotentialScore: number;
  marketAwarenessScore: number;
  sourceCredibilityScore: number;
  themeRelevanceScore: number;
  riskFlagPenalty: number;
  aiInformationScore: number;
  confidence: number;
  riskFlags: string[];
  warnings: string[];
  evidence: AIEvidence[];
  extractionMethod: "openai" | "ruleFallback";
  schemaVersion: string;
  shouldIncludeInAlpha: boolean;
  explanation: string;
};

export type AIAnalysisResult = {
  ok: boolean;
  enabled: boolean;
  model: string;
  factors: AIEventFactor[];
  warnings: string[];
  generatedAt: string;
};

export type AIStatus = {
  enabled: boolean;
  hasApiKey: boolean;
  model: string;
  scoreInAlpha: boolean;
  schemaVersion: string;
  fallbackAvailable: boolean;
  note: string;
};

export async function fetchAIStatus(): Promise<AIStatus> {
  const response = await fetchWithTimeout(`${backendUrl}/ai/status`, 5000);
  if (!response.ok) throw new Error(`AI status HTTP ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(body.error ?? "AI status error");
  return body.data as AIStatus;
}

export async function analyzeSourceDigest(symbols: string[], themes: string[], maxItems = 8): Promise<AIAnalysisResult> {
  const response = await fetchWithTimeout(`${backendUrl}/ai/analyze-source-digest`, 20000, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbols, themes, maxItems })
  });
  if (!response.ok) throw new Error(`AI source digest HTTP ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(body.error ?? "AI source digest error");
  return body.data as AIAnalysisResult;
}

export async function extractEventFactors(input: { text: string; sourceUrl?: string; sourceTitle?: string; publishedAt?: string | null; symbols?: string[]; themes?: string[] }): Promise<AIAnalysisResult> {
  const response = await fetchWithTimeout(`${backendUrl}/ai/extract-event-factors`, 20000, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: input.text,
      sourceUrl: input.sourceUrl ?? "manual://frontend",
      sourceTitle: input.sourceTitle ?? "Manual frontend input",
      publishedAt: input.publishedAt ?? null,
      symbols: input.symbols ?? [],
      themes: input.themes ?? []
    })
  });
  if (!response.ok) throw new Error(`AI extraction HTTP ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(body.error ?? "AI extraction error");
  return body.data as AIAnalysisResult;
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

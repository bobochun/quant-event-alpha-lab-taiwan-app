"use client";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export type DeployCheckStatus = "ok" | "warning" | "error";

export type DeployReadinessCheck = {
  id: string;
  label: string;
  status: DeployCheckStatus;
  value: string;
  detail: string;
};

export type DeployReadinessPayload = {
  backendUrl: string;
  generatedAt: string;
  checks: DeployReadinessCheck[];
  rawDiagnostics?: unknown;
};

export async function fetchDeployReadiness(): Promise<DeployReadinessPayload> {
  const checks: DeployReadinessCheck[] = [
    {
      id: "backend-url",
      label: "NEXT_PUBLIC_BACKEND_URL",
      status: backendUrl ? "ok" : "error",
      value: backendUrl || "missing",
      detail: "前端會使用這個 URL 呼叫 FastAPI 後端。"
    }
  ];

  let diagnostics: any = null;
  try {
    const health = await getJson(`${backendUrl}/health`, 5000);
    checks.push({
      id: "backend-health",
      label: "Backend /health",
      status: health?.ok ? "ok" : "error",
      value: health?.data?.status ?? "unknown",
      detail: health?.sourceNote ?? "後端健康檢查回應。"
    });
  } catch (error) {
    checks.push({ id: "backend-health", label: "Backend /health", status: "error", value: "failed", detail: error instanceof Error ? error.message : "Backend health check failed." });
  }

  try {
    const payload = await getJson(`${backendUrl}/diagnostics`, 7000);
    diagnostics = payload?.data;
    const features = diagnostics?.features ?? {};
    const scheduler = diagnostics?.scheduler ?? {};
    const cache = diagnostics?.cache ?? {};
    checks.push({ id: "diagnostics", label: "Backend /diagnostics", status: payload?.ok ? "ok" : "error", value: payload?.ok ? "ok" : "failed", detail: "診斷端點可讀取。" });
    checks.push({ id: "finmind", label: "FINMIND_API_TOKEN", status: features.finmind ? "ok" : "warning", value: features.finmind ? "enabled" : "not configured", detail: features.finmind ? "FinMind provider 已啟用。" : "未設定時會使用 official / yfinance / demo fallback。" });
    checks.push({ id: "openai", label: "OPENAI_API_KEY", status: features.aiHasApiKey ? "ok" : "warning", value: features.aiHasApiKey ? "configured" : "not configured", detail: features.aiHasApiKey ? "AI Quant 可使用 OpenAI API。" : "未設定時 AI Intelligence 使用 rule-based fallback。" });
    checks.push({ id: "ai-alpha", label: "AI score in Alpha", status: features.aiScoreInAlpha ? "warning" : "ok", value: features.aiScoreInAlpha ? "enabled" : "disabled", detail: features.aiScoreInAlpha ? "建議累積足夠回測前保持關閉。" : "目前 AI factor 僅顯示，不納入最終分數，較安全。" });
    checks.push({ id: "scheduler", label: "Backend scheduler", status: scheduler.enabled ? "ok" : "warning", value: scheduler.enabled ? `${scheduler.jobs?.length ?? 0} jobs` : "disabled", detail: scheduler.enabled ? "後端會定時刷新報價、K線、量化與來源摘要。" : "若使用 serverless 或外部 cron，關閉 scheduler 是合理設定。" });
    checks.push({ id: "quote-cache", label: "Quote cache", status: Number(cache.quoteCacheSeconds ?? 0) >= 5 ? "ok" : "warning", value: `${cache.quoteCacheSeconds ?? "?"}s`, detail: "避免前端自動刷新時重複打外部 API。" });
    checks.push({ id: "demo-fallback", label: "Demo fallback", status: features.demoFallback ? "warning" : "ok", value: features.demoFallback ? "enabled" : "disabled", detail: features.demoFallback ? "缺資料時仍可操作，但報告要標示 Demo。" : "正式模式較適合關閉 demo fallback。" });
  } catch (error) {
    checks.push({ id: "diagnostics", label: "Backend /diagnostics", status: "error", value: "failed", detail: error instanceof Error ? error.message : "Diagnostics failed." });
  }

  return { backendUrl, generatedAt: new Date().toISOString(), checks, rawDiagnostics: diagnostics };
}

async function getJson(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return body;
  } finally {
    window.clearTimeout(timer);
  }
}

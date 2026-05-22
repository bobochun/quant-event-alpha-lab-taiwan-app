export interface SafeFetchOptions {
  timeoutMs?: number;
  revalidateSeconds?: number;
}

export async function safeJsonFetch<T>(url: string, options: SafeFetchOptions = {}): Promise<{ ok: true; data: T; latencyMs: number } | { ok: false; error: string; latencyMs: number }> {
  const timeoutMs = options.timeoutMs ?? Number(process.env.OFFICIAL_DATA_TIMEOUT_MS ?? 8000);
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: options.revalidateSeconds ?? Number(process.env.OFFICIAL_DATA_REVALIDATE_SECONDS ?? 3600) },
      headers: { accept: "application/json,text/plain,*/*" }
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}`, latencyMs };
    return { ok: true, data: (await response.json()) as T, latencyMs };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "官方資料讀取失敗", latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

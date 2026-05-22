import { dataSourceRegistry } from "../../lib/dataSources/registry";
import { ok } from "../_response";

export function GET() {
  const now = new Date().toISOString();
  return ok({
    sources: dataSourceRegistry,
    health: dataSourceRegistry.map((source) => ({
      sourceId: source.id,
      sourceName: source.name,
      status: source.enabled ? (source.id === "mops" ? "degraded" : "ok") : "disabled",
      recordsFetched: 0,
      lastSuccessAt: source.id === "demo" ? now : undefined,
      errorMessage: source.id === "mops" ? "MOPS 第一版為 placeholder；請使用 CSV 匯入或 metadata link。" : undefined,
      nextRecommendedRefreshAt: new Date(Date.now() + 3600_000).toISOString()
    }))
  }, "Official", "資料源設定已載入；按下手動刷新才會呼叫外部官方 API。");
}

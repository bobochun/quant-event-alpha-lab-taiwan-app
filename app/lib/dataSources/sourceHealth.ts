import type { SourceHealth } from "../types";

export function makeSourceHealth(input: Partial<SourceHealth> & { sourceId: string; sourceName: string }): SourceHealth {
  const now = new Date().toISOString();
  return {
    status: "degraded",
    recordsFetched: 0,
    nextRecommendedRefreshAt: new Date(Date.now() + 3600_000).toISOString(),
    ...input,
    lastSuccessAt: input.status === "ok" ? (input.lastSuccessAt ?? now) : input.lastSuccessAt,
    lastFailureAt: input.status === "error" || input.status === "degraded" ? (input.lastFailureAt ?? now) : input.lastFailureAt
  };
}

export function disabledHealth(sourceId: string, sourceName: string, reason = "資料源已停用"): SourceHealth {
  return makeSourceHealth({ sourceId, sourceName, status: "disabled", errorMessage: reason, recordsFetched: 0 });
}

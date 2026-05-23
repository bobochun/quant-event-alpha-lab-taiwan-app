import type { InstitutionalFlowRecord, MarketWarningRecord, PriceSnapshot, SecurityMasterRecord, SourceHealth } from "../types";
import { endpoint, safeJsonFetch } from "./fetchUtils";
import { getDataSourceConfig } from "./registry";
import { cached } from "./cache";
import { normalizeInstitutionalFlows, normalizeMarketWarnings, normalizePriceSnapshots, normalizeSecurityMaster } from "./normalizers";
import { disabledHealth, makeSourceHealth } from "./sourceHealth";
import type { OfficialFetchResult } from "./types";

const sourceId = "tpex";

const fallbackPaths = {
  securityMaster: "v1/tpex_mainboard_company",
  priceSnapshot: "v1/tpex_mainboard_quotes",
  institutionalFlow: "v1/tpex_mainboard_institutional_investors",
  marketWarnings: "v1/tpex_attention_stock"
};

function config() {
  return getDataSourceConfig(sourceId);
}

async function fetchRows<T>(dataset: keyof typeof fallbackPaths, path = fallbackPaths[dataset]): Promise<OfficialFetchResult<T>> {
  const source = config();
  if (!source?.enabled || !source.baseUrl) {
    return { ok: false, data: [], dataSource: "Official", sourceNote: source?.sourceNote ?? "TPEx 已停用", health: disabledHealth(sourceId, "TPEx OpenAPI") };
  }
  const url = endpoint(source.baseUrl, path);
  return cached(`official:${sourceId}:${dataset}:${url}`, Number(process.env.OFFICIAL_DATA_REVALIDATE_SECONDS ?? 3600), async () => {
    const result = await safeJsonFetch<unknown[]>(url);
    if (!result.ok) {
      return {
        ok: false,
        data: [],
        dataSource: "Error" as const,
        sourceNote: `TPEx OpenAPI 讀取失敗：${result.error}`,
        health: makeSourceHealth({ sourceId, sourceName: source.name, status: "degraded", latencyMs: result.latencyMs, errorMessage: result.error, recordsFetched: 0 })
      };
    }
    const data = Array.isArray(result.data) ? (result.data as T[]) : [];
    return {
      ok: true,
      data,
      dataSource: "Official" as const,
      sourceNote: source.sourceNote,
      health: makeSourceHealth({ sourceId, sourceName: source.name, status: data.length ? "ok" : "degraded", latencyMs: result.latencyMs, recordsFetched: data.length })
    };
  });
}

export async function fetchTpexSecurityMaster(): Promise<OfficialFetchResult<SecurityMasterRecord>> {
  const raw = await fetchRows<Record<string, unknown>>("securityMaster");
  return { ...raw, data: normalizeSecurityMaster(raw.data, "TPEx OpenAPI", "TPEx", endpoint(config()?.baseUrl ?? "", fallbackPaths.securityMaster)) };
}

export async function fetchTpexPriceSnapshot(): Promise<OfficialFetchResult<PriceSnapshot>> {
  const raw = await fetchRows<Record<string, unknown>>("priceSnapshot");
  return { ...raw, data: normalizePriceSnapshots(raw.data, "TPEx OpenAPI", endpoint(config()?.baseUrl ?? "", fallbackPaths.priceSnapshot)) };
}

export async function fetchTpexInstitutionalFlow(): Promise<OfficialFetchResult<InstitutionalFlowRecord>> {
  const raw = await fetchRows<Record<string, unknown>>("institutionalFlow");
  return { ...raw, data: normalizeInstitutionalFlows(raw.data, "TPEx OpenAPI", endpoint(config()?.baseUrl ?? "", fallbackPaths.institutionalFlow)) };
}

export async function fetchTpexMarketWarnings(): Promise<OfficialFetchResult<MarketWarningRecord>> {
  const raw = await fetchRows<Record<string, unknown>>("marketWarnings");
  return { ...raw, data: normalizeMarketWarnings(raw.data, "TPEx OpenAPI", endpoint(config()?.baseUrl ?? "", fallbackPaths.marketWarnings)) };
}

export async function fetchTpexDataStatus(): Promise<SourceHealth> {
  return (await fetchTpexSecurityMaster()).health;
}

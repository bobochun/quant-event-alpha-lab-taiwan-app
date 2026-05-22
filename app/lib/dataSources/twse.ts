import type { InstitutionalFlowRecord, MarketWarningRecord, PriceSnapshot, SecurityMasterRecord, SourceHealth } from "../types";
import { getDataSourceConfig } from "./registry";
import { endpoint, safeJsonFetch } from "./fetchUtils";
import { cached } from "./cache";
import { normalizeInstitutionalFlows, normalizeMarketWarnings, normalizePriceSnapshots, normalizeSecurityMaster } from "./normalizers";
import { disabledHealth, makeSourceHealth } from "./sourceHealth";
import type { OfficialFetchResult } from "./types";

const sourceId = "twse";
const fallbackPaths = {
  securityMaster: "opendata/t187ap03_L",
  priceSnapshot: "exchangeReport/STOCK_DAY_ALL",
  institutionalFlow: "fund/T86",
  marketWarnings: "announcement/notice"
};

function config() {
  return getDataSourceConfig(sourceId);
}

async function fetchRows<T>(dataset: keyof typeof fallbackPaths, path = fallbackPaths[dataset]): Promise<OfficialFetchResult<T>> {
  const source = config();
  if (!source?.enabled || !source.baseUrl) {
    return { ok: false, data: [], dataSource: "Official", sourceNote: source?.sourceNote ?? "TWSE 已停用", health: disabledHealth(sourceId, "TWSE OpenAPI") };
  }
  const url = endpoint(source.baseUrl, path);
  return cached(`official:${sourceId}:${dataset}:${url}`, Number(process.env.OFFICIAL_DATA_REVALIDATE_SECONDS ?? 3600), async () => {
    const result = await safeJsonFetch<unknown[]>(url);
    if (!result.ok) {
      return {
        ok: false,
        data: [],
        dataSource: "Error" as const,
        sourceNote: `TWSE OpenAPI 讀取失敗：${result.error}`,
        health: makeSourceHealth({ sourceId, sourceName: source.name, status: "error", latencyMs: result.latencyMs, errorMessage: result.error, recordsFetched: 0 })
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

export async function fetchTwseSecurityMaster(): Promise<OfficialFetchResult<SecurityMasterRecord>> {
  const raw = await fetchRows<Record<string, unknown>>("securityMaster");
  return { ...raw, data: normalizeSecurityMaster(raw.data, "TWSE OpenAPI", "TWSE", endpoint(config()?.baseUrl ?? "", fallbackPaths.securityMaster)) };
}

export async function fetchTwsePriceSnapshot(): Promise<OfficialFetchResult<PriceSnapshot>> {
  const raw = await fetchRows<Record<string, unknown>>("priceSnapshot");
  return { ...raw, data: normalizePriceSnapshots(raw.data, "TWSE OpenAPI", endpoint(config()?.baseUrl ?? "", fallbackPaths.priceSnapshot)) };
}

export async function fetchTwseInstitutionalFlow(): Promise<OfficialFetchResult<InstitutionalFlowRecord>> {
  const raw = await fetchRows<Record<string, unknown>>("institutionalFlow");
  return { ...raw, data: normalizeInstitutionalFlows(raw.data, "TWSE OpenAPI", endpoint(config()?.baseUrl ?? "", fallbackPaths.institutionalFlow)) };
}

export async function fetchTwseMarketWarnings(): Promise<OfficialFetchResult<MarketWarningRecord>> {
  const raw = await fetchRows<Record<string, unknown>>("marketWarnings");
  return { ...raw, data: normalizeMarketWarnings(raw.data, "TWSE OpenAPI", endpoint(config()?.baseUrl ?? "", fallbackPaths.marketWarnings)) };
}

export async function fetchTwseDataStatus(): Promise<SourceHealth> {
  return (await fetchTwseSecurityMaster()).health;
}

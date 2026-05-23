import type { DataSourceConfig } from "./types";

const officialEnabled = process.env.ENABLE_OFFICIAL_DATA !== "false";

export const dataSourceRegistry: DataSourceConfig[] = [
  {
    id: "twse",
    name: "TWSE OpenAPI",
    type: "Official",
    enabled: officialEnabled,
    baseUrl: process.env.TWSE_OPENAPI_BASE_URL ?? "https://openapi.twse.com.tw/v1",
    documentationUrl: "https://openapi.twse.com.tw/",
    supportedDatasets: ["securityMaster", "priceSnapshot", "institutionalFlow", "marketWarnings"],
    sourceNote: "臺灣證券交易所公開 OpenAPI。若端點異動或逾時，系統會保留 fallback 並標示錯誤。"
  },
  {
    id: "tpex",
    name: "TPEx OpenAPI",
    type: "Official",
    enabled: officialEnabled,
    baseUrl: process.env.TPEX_OPENAPI_BASE_URL ?? "https://www.tpex.org.tw/openapi",
    documentationUrl: "https://www.tpex.org.tw/",
    supportedDatasets: ["securityMaster", "priceSnapshot", "institutionalFlow", "marketWarnings"],
    sourceNote: "櫃買中心公開資料端點。不同資料集路徑可能調整，adapter 採可設定端點與安全 fallback。"
  },
  {
    id: "mops",
    name: "MOPS 公開資訊觀測站",
    type: "Official",
    enabled: process.env.ENABLE_MOPS_PLACEHOLDER !== "false",
    documentationUrl: "https://mops.twse.com.tw/",
    supportedDatasets: ["monthlyRevenue", "earnings", "dividends", "events"],
    sourceNote: "第一版僅提供 metadata / 匯入映射 / 未來 connector 位置，不做激進爬蟲。"
  },
  {
    id: "csv-import",
    name: "CSV 匯入",
    type: "Imported",
    enabled: true,
    supportedDatasets: ["events", "priceSnapshot", "institutionalFlow", "marketWarnings", "monthlyRevenue", "earnings", "dividends", "themeNews"],
    sourceNote: "使用者匯入 CSV 資料，請自行確認來源與正確性。"
  },
  {
    id: "demo",
    name: "Demo Data",
    type: "Demo",
    enabled: true,
    supportedDatasets: ["events", "priceSnapshot", "institutionalFlow", "marketWarnings"],
    sourceNote: "示範資料，不是真實即時市場資料。"
  }
];

export function getDataSourceConfig(id: string): DataSourceConfig | undefined {
  return dataSourceRegistry.find((source) => source.id === id);
}

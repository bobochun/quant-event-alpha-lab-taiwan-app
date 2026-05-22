import type { SourceHealth } from "../types";
import { getDataSourceConfig } from "./registry";
import { makeSourceHealth } from "./sourceHealth";

export const mopsMetadataLinks = [
  { dataset: "monthlyRevenue", label: "月營收", url: "https://mops.twse.com.tw/mops/web/t21sc04_ifrs" },
  { dataset: "earnings", label: "財報摘要", url: "https://mops.twse.com.tw/mops/web/t163sb04" },
  { dataset: "dividends", label: "除權息 / 股利", url: "https://mops.twse.com.tw/mops/web/t108sb19_q1" },
  { dataset: "investorConference", label: "法說會公告", url: "https://mops.twse.com.tw/mops/web/t100sb02_1" },
  { dataset: "materialInfo", label: "重大訊息 metadata", url: "https://mops.twse.com.tw/mops/web/t05sr01_1" },
  { dataset: "shareholderMeeting", label: "股東會資訊", url: "https://mops.twse.com.tw/mops/web/t108sb16" },
  { dataset: "companyProfile", label: "公司基本資料", url: "https://mops.twse.com.tw/mops/web/t05st03" }
];

export function fetchMopsDataStatus(): SourceHealth {
  const source = getDataSourceConfig("mops");
  return makeSourceHealth({
    sourceId: "mops",
    sourceName: source?.name ?? "MOPS 公開資訊觀測站",
    status: source?.enabled ? "degraded" : "disabled",
    recordsFetched: 0,
    errorMessage: "第一版不做激進爬蟲；請使用 CSV 匯入或 metadata link，未來可接官方開放資料 connector。"
  });
}

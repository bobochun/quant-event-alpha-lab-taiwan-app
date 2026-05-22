import { getDemoPriceSnapshots } from "../../lib/dataSources/demoSource";
import { mergePriceSnapshots } from "../../lib/dataSources/mergeSources";
import { fetchTpexPriceSnapshot } from "../../lib/dataSources/tpex";
import { fetchTwsePriceSnapshot } from "../../lib/dataSources/twse";
import { ok } from "../_response";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  const [twse, tpex] = await Promise.allSettled([fetchTwsePriceSnapshot(), fetchTpexPriceSnapshot()]);
  const official = [
    ...(twse.status === "fulfilled" ? twse.value.data : []),
    ...(tpex.status === "fulfilled" ? tpex.value.data : [])
  ];
  const data = mergePriceSnapshots(getDemoPriceSnapshots(), official, []).filter((row) => !symbol || row.symbol === symbol);
  return ok({ records: data, officialRecords: official.length }, official.length ? "Official" : "Demo", official.length ? "官方 price snapshot 已載入；缺漏項目使用 fallback。" : "官方 price snapshot 讀取失敗或無資料，使用示範資料 fallback。");
}

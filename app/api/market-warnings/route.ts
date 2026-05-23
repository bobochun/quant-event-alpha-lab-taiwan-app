import { fetchTpexMarketWarnings } from "../../lib/dataSources/tpex";
import { fetchTwseMarketWarnings } from "../../lib/dataSources/twse";
import { ok } from "../_response";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  const warningType = url.searchParams.get("warningType");
  const [twse, tpex] = await Promise.allSettled([fetchTwseMarketWarnings(), fetchTpexMarketWarnings()]);
  const records = [
    ...(twse.status === "fulfilled" ? twse.value.data : []),
    ...(tpex.status === "fulfilled" ? tpex.value.data : [])
  ].filter((row) => (!symbol || row.symbol === symbol) && (!warningType || row.warningType === warningType));
  return ok({ records, officialRecords: records.length }, records.length ? "Official" : "Missing", records.length ? "官方注意 / 處置資料已載入。" : "官方注意 / 處置資料暫不可用，前端會使用匯入或示範 fallback。");
}

import { fetchTpexInstitutionalFlow } from "../../lib/dataSources/tpex";
import { fetchTwseInstitutionalFlow } from "../../lib/dataSources/twse";
import { ok } from "../_response";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  const [twse, tpex] = await Promise.allSettled([fetchTwseInstitutionalFlow(), fetchTpexInstitutionalFlow()]);
  const records = [
    ...(twse.status === "fulfilled" ? twse.value.data : []),
    ...(tpex.status === "fulfilled" ? tpex.value.data : [])
  ].filter((row) => !symbol || row.symbol === symbol);
  return ok({ records, officialRecords: records.length }, records.length ? "Official" : "Missing", records.length ? "官方法人資料已載入。" : "官方法人資料暫不可用，前端會使用匯入或示範 fallback。");
}

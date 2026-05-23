import { getDemoSecurityMaster } from "../../lib/dataSources/demoSource";
import { mergeSecurityMaster } from "../../lib/dataSources/mergeSources";
import { fetchTpexSecurityMaster } from "../../lib/dataSources/tpex";
import { fetchTwseSecurityMaster } from "../../lib/dataSources/twse";
import { ok } from "../_response";

export async function GET() {
  const [twse, tpex] = await Promise.allSettled([fetchTwseSecurityMaster(), fetchTpexSecurityMaster()]);
  const official = [
    ...(twse.status === "fulfilled" ? twse.value.data : []),
    ...(tpex.status === "fulfilled" ? tpex.value.data : [])
  ];
  const data = mergeSecurityMaster(getDemoSecurityMaster(), official);
  return ok({ records: data, officialRecords: official.length, demoFallbackRecords: getDemoSecurityMaster().length }, official.length ? "Official" : "Demo", official.length ? "已合併官方股票基本資料；缺漏項目以示範資料補齊。" : "官方資料暫不可用，使用示範資料 fallback。");
}

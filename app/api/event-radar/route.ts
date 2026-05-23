import { mockEvents, mockStocks, mockThemes } from "../../lib/mockData";
import { fetchTpexPriceSnapshot } from "../../lib/dataSources/tpex";
import { fetchTwsePriceSnapshot } from "../../lib/dataSources/twse";
import { recomputeEventScores } from "../../lib/recomputeScores";
import { ok } from "../_response";

export async function GET() {
  const [twsePrice, tpexPrice] = await Promise.allSettled([fetchTwsePriceSnapshot(), fetchTpexPriceSnapshot()]);
  const priceSnapshots = [
    ...(twsePrice.status === "fulfilled" ? twsePrice.value.data : []),
    ...(tpexPrice.status === "fulfilled" ? tpexPrice.value.data : [])
  ];
  const result = recomputeEventScores({
    events: mockEvents,
    stocks: mockStocks,
    themes: mockThemes,
    priceSnapshots,
    institutionalFlows: [],
    marketWarnings: []
  });
  return ok(result, priceSnapshots.length ? "Official" : "Demo", priceSnapshots.length ? "Event Radar 已使用官方 price snapshot 重新計分；localStorage 匯入資料由前端再合併。" : "官方資料暫不可用，使用示範資料 fallback。");
}

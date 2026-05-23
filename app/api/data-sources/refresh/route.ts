import { clearMemoryCache } from "../../../lib/dataSources/cache";
import { fetchMopsDataStatus } from "../../../lib/dataSources/mops";
import { fetchTpexDataStatus } from "../../../lib/dataSources/tpex";
import { fetchTwseDataStatus } from "../../../lib/dataSources/twse";
import { ok } from "../../_response";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sourceIds?: string[] };
  const sourceIds = body.sourceIds?.length ? body.sourceIds : ["twse", "tpex", "mops"];
  sourceIds.forEach((sourceId) => clearMemoryCache(`official:${sourceId}`));
  const tasks = sourceIds.map(async (sourceId) => {
    if (sourceId === "twse") return fetchTwseDataStatus();
    if (sourceId === "tpex") return fetchTpexDataStatus();
    if (sourceId === "mops") return fetchMopsDataStatus();
    return { sourceId, sourceName: sourceId, status: "error", recordsFetched: 0, errorMessage: "不支援的資料源" };
  });
  const settled = await Promise.allSettled(tasks);
  return ok({
    refreshedAt: new Date().toISOString(),
    health: settled.map((item) => item.status === "fulfilled" ? item.value : {
      sourceId: "unknown",
      sourceName: "未知資料源",
      status: "error",
      recordsFetched: 0,
      errorMessage: item.reason instanceof Error ? item.reason.message : "刷新失敗"
    })
  }, "Official", "手動刷新已執行；若官方端點失敗，結果會以 error/degraded 顯示。");
}

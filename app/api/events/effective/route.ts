import { mockEvents } from "../../../lib/mockData";
import { ok } from "../../_response";

export function GET() {
  return ok({ events: mockEvents, note: "Server route 無法讀取瀏覽器 localStorage；前端會再合併 Manual / Imported 資料。" }, "Demo", "有效事件在前端依 Manual > Imported > Official > Demo 合併。此 API 提供 server fallback。");
}

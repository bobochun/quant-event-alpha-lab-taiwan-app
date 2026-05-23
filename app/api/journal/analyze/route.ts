import { analyzeBehaviorRisk } from "../../../lib/alphaEngine";
import { mockJournal } from "../../../lib/mockData";
import { ok } from "../../_response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => mockJournal);
  return ok(analyzeBehaviorRisk(Array.isArray(body) ? body : body.journal ?? mockJournal), "Estimated", "由交易日誌資料估算產生。");
}

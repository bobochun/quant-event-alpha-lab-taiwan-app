import { generateTradePlan } from "../../../lib/tradePlan";
import { fail, ok } from "../../_response";

export async function POST(request: Request) {
  try {
    return ok(generateTradePlan(await request.json()), "Manual", "由請求資料產生交易計畫。");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "無法產生交易計畫。");
  }
}

import { generateTradePlan } from "../../../lib/tradePlan";
import { fail, ok } from "../../_response";

export async function POST(request: Request) {
  try {
    return ok(generateTradePlan(await request.json()), "Manual", "Generated from request payload.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to generate trade plan.");
  }
}

import { buildAlphaEngineResults } from "../../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../../lib/mockData";
import { ok } from "../_response";

export function GET() {
  return ok(buildAlphaEngineResults(mockEvents, mockStocks, mockThemes));
}

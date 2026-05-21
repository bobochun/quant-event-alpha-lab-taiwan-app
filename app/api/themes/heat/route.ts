import { calculateThemeHeat } from "../../../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../../../lib/mockData";
import { ok } from "../../_response";

export function GET() {
  return ok(calculateThemeHeat(mockThemes, mockEvents, mockStocks));
}

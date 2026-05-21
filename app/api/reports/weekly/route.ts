import { buildAlphaEngineResults, calculateThemeHeat } from "../../../lib/alphaEngine";
import { exportWeeklyReportMarkdown } from "../../../lib/exporters";
import { mockEvents, mockPortfolio, mockStocks, mockThemes, mockTradePlans } from "../../../lib/mockData";
import { ok } from "../../_response";

export async function POST() {
  return ok(exportWeeklyReportMarkdown({ themeHeat: calculateThemeHeat(mockThemes, mockEvents, mockStocks), events: mockEvents, plans: mockTradePlans, portfolio: mockPortfolio, alphaRows: buildAlphaEngineResults(mockEvents, mockStocks, mockThemes), dataQualityNote: "示範資料，不是真實即時市場資料。" }));
}

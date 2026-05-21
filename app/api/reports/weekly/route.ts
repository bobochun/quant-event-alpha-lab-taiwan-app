import { buildAlphaEngineResults, calculateThemeHeat } from "../../../lib/alphaEngine";
import { exportWeeklyReportMarkdown } from "../../../lib/exporters";
import { mockEvents, mockPortfolio, mockStocks, mockThemes, mockTradePlans } from "../../../lib/mockData";
import { ok } from "../../_response";

export async function POST() {
  return ok(exportWeeklyReportMarkdown({ themeHeat: calculateThemeHeat(mockThemes, mockEvents, mockStocks), events: mockEvents, plans: mockTradePlans, portfolio: mockPortfolio, alphaRows: buildAlphaEngineResults(mockEvents, mockStocks, mockThemes), dataQualityNote: "Demo data for MVP testing. Not real-time market data." }));
}

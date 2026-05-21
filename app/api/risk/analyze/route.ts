import { analyzeBehaviorRisk, analyzePortfolioExposure, buildAlphaEngineResults } from "../../../lib/alphaEngine";
import { mockEvents, mockJournal, mockPortfolio, mockStocks, mockThemes } from "../../../lib/mockData";
import { ok } from "../../_response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const portfolio = analyzePortfolioExposure(body.portfolio ?? mockPortfolio);
  const behavior = analyzeBehaviorRisk(body.journal ?? mockJournal);
  const events = buildAlphaEngineResults(body.events ?? mockEvents, mockStocks, mockThemes);
  return ok({ portfolio, behavior, events }, "Estimated", "由傳入資料或示範資料估算產生。");
}

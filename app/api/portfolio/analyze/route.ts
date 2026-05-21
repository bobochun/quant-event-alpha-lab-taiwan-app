import { analyzePortfolioExposure } from "../../../lib/alphaEngine";
import { mockPortfolio } from "../../../lib/mockData";
import { ok } from "../../_response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => mockPortfolio);
  return ok(analyzePortfolioExposure(body ?? mockPortfolio), "Estimated", "Generated from portfolio payload.");
}

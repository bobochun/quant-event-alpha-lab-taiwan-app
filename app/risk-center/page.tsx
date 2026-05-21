import { analyzeBehaviorRisk, analyzePortfolioExposure, buildAlphaEngineResults } from "../lib/alphaEngine";
import { mockEvents, mockJournal, mockPortfolio, mockRiskAlerts, mockStocks, mockThemes } from "../lib/mockData";
import { RiskAlertPanel, SectionCard } from "../components/ui";

export default function RiskCenterPage() {
  const portfolio = analyzePortfolioExposure(mockPortfolio);
  const behavior = analyzeBehaviorRisk(mockJournal);

  const eventAlerts = buildAlphaEngineResults(mockEvents, mockStocks, mockThemes)
    .filter((row) => row.pricedInRisk === "high" || row.pricedInRisk === "critical")
    .slice(0, 8)
    .map((row) => ({
      id: `event-risk-${row.event.id}`,
      severity: row.pricedInRisk,
      category: "Event Risk" as const,
      symbol: row.event.symbol,
      message: `${row.event.eventTitle} may already be partially reflected in price action.`,
      suggestedAction: row.alpha.nextAction,
      createdAt: new Date().toISOString(),
      dataSource: "Estimated" as const,
      sourceNote: "Generated from demo event scoring."
    }));

  const behaviorAlerts = behavior.warnings.map((message, index) => ({
    id: `behavior-${index}`,
    severity: "medium" as const,
    category: "Behavior Risk" as const,
    message,
    suggestedAction: "Review the trade plan and journal before taking new event risk.",
    createdAt: new Date().toISOString(),
    dataSource: "Estimated" as const,
    sourceNote: "Generated from local journal."
  }));

  const alerts = [...eventAlerts, ...portfolio.alerts, ...behaviorAlerts, ...mockRiskAlerts];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard title="A. Event Risk">
        <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Event Risk")} />
      </SectionCard>
      <SectionCard title="B. Position Risk">
        <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Position Risk")} />
      </SectionCard>
      <SectionCard title="C. Portfolio Risk">
        <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Portfolio Risk")} />
      </SectionCard>
      <SectionCard title="D. Behavior Risk">
        <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Behavior Risk")} />
      </SectionCard>
    </div>
  );
}

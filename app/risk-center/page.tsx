import { analyzeBehaviorRisk, analyzePortfolioExposure, buildAlphaEngineResults } from "../lib/alphaEngine";
import { mockEvents, mockJournal, mockPortfolio, mockRiskAlerts, mockStocks, mockThemes } from "../lib/mockData";
import { RiskAlertPanel, SectionCard } from "../components/ui";
import { formatNextAction } from "../lib/utils";

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
      message: `${row.event.eventTitle} 可能已被市場部分反應，事件前漲幅或過熱風險偏高。`,
      suggestedAction: formatNextAction(row.alpha.nextAction),
      createdAt: new Date().toISOString(),
      dataSource: "Estimated" as const,
      sourceNote: "由示範事件評分產生。"
    }));

  const behaviorAlerts = behavior.warnings.map((message, index) => ({
    id: `behavior-${index}`,
    severity: "medium" as const,
    category: "Behavior Risk" as const,
    message,
    suggestedAction: "新增事件風險前，先回到交易計畫與日誌檢查紀律。",
    createdAt: new Date().toISOString(),
    dataSource: "Estimated" as const,
    sourceNote: "由本機交易日誌產生。"
  }));

  const alerts = [...eventAlerts, ...portfolio.alerts, ...behaviorAlerts, ...mockRiskAlerts];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">風控中心</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">風控中心</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">這裡不是找機會，而是防止大虧。每個警示都要有下一步。</p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="事件風險">
          <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Event Risk")} />
        </SectionCard>
        <SectionCard title="部位風險">
          <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Position Risk")} />
        </SectionCard>
        <SectionCard title="投組風險">
          <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Portfolio Risk")} />
        </SectionCard>
        <SectionCard title="行為風險">
          <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Behavior Risk")} />
        </SectionCard>
        <SectionCard title="資料風險">
          <RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Data Risk")} />
        </SectionCard>
      </div>
    </div>
  );
}

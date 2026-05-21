import { MiniMetricGrid, RiskBadge, SectionCard } from "../components/ui";
import { analyzeBehaviorRisk } from "../lib/alphaEngine";
import { mockJournal, mockTradePlans } from "../lib/mockData";
import type { RiskLevel } from "../lib/types";

type StrategyRow = {
  strategy: string;
  trades: number;
  winRate: number;
  avgReturn: number;
  best: number;
  worst: number;
  profitFactor: number;
  planCount: number;
  quality: RiskLevel;
};

export default function BacktestLabPage() {
  const analytics = analyzeBehaviorRisk(mockJournal);
  const rows = summarizeStrategies();
  const totalPlans = mockTradePlans.length;
  const avgPlannedRr = mockTradePlans.reduce((sum, plan) => sum + plan.riskReward2, 0) / Math.max(1, totalPlans);
  const openRisk = mockTradePlans.reduce((sum, plan) => sum + plan.maxRiskAmount, 0);

  return (
    <div className="space-y-4">
      <SectionCard title="Backtest Lab Summary">
        <MiniMetricGrid
          items={[
            { label: "Journal Trades", value: analytics.totalTrades },
            { label: "Win Rate", value: `${analytics.winRate}%` },
            { label: "Expectancy", value: `${analytics.expectancy}%` },
            { label: "Profit Factor", value: analytics.profitFactor },
            { label: "Saved Plans", value: totalPlans },
            { label: "Avg Planned RR2", value: avgPlannedRr.toFixed(2) },
            { label: "Open Plan Risk", value: Math.round(openRisk).toLocaleString() },
            { label: "Discipline", value: analytics.disciplineScore }
          ]}
        />
      </SectionCard>

      <SectionCard title="Strategy Scorecard">
        <div className="table-scroll border border-slate-800 bg-[#08101a]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-500">
              <tr>
                {["Strategy", "Trades", "Plans", "Win Rate", "Avg Return", "Best", "Worst", "Profit Factor", "Quality"].map((head) => (
                  <th key={head} className="px-3 py-2">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.strategy} className="border-t border-slate-800 text-slate-300">
                  <td className="px-3 py-2 font-semibold text-white">{row.strategy}</td>
                  <td className="px-3 py-2 tabular-nums">{row.trades}</td>
                  <td className="px-3 py-2 tabular-nums">{row.planCount}</td>
                  <td className="px-3 py-2 tabular-nums">{row.winRate}%</td>
                  <td className="px-3 py-2 tabular-nums">{row.avgReturn}%</td>
                  <td className="px-3 py-2 tabular-nums text-emerald-200">{row.best}%</td>
                  <td className="px-3 py-2 tabular-nums text-rose-200">{row.worst}%</td>
                  <td className="px-3 py-2 tabular-nums">{row.profitFactor}</td>
                  <td className="px-3 py-2"><RiskBadge level={row.quality} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Validation Rules">
        <div className="grid gap-3 lg:grid-cols-3">
          <Rule title="Sample size" value={analytics.totalTrades < 30 ? "Weak" : "Usable"} text="Require more journal records before trusting strategy-level expectancy." />
          <Rule title="Plan coverage" value={`${totalPlans} saved`} text="Compare generated plans with journal outcomes before raising default position size." />
          <Rule title="Behavior filter" value={analytics.behaviorScore >= 75 ? "Pass" : "Review"} text="Stop backtest promotion when chase, FOMO, or plan-break rates rise." />
        </div>
      </SectionCard>
    </div>
  );
}

function summarizeStrategies(): StrategyRow[] {
  const strategies = Array.from(new Set([...mockJournal.map((entry) => entry.strategy), ...mockTradePlans.map((plan) => plan.strategy)]));
  return strategies.map((strategy) => {
    const trades = mockJournal.filter((entry) => entry.strategy === strategy && typeof entry.pnlPct === "number");
    const plans = mockTradePlans.filter((plan) => plan.strategy === strategy);
    const wins = trades.filter((entry) => (entry.pnlPct ?? 0) > 0);
    const losses = trades.filter((entry) => (entry.pnlPct ?? 0) < 0);
    const avgReturn = trades.reduce((sum, entry) => sum + (entry.pnlPct ?? 0), 0) / Math.max(1, trades.length);
    const grossWin = wins.reduce((sum, entry) => sum + Math.abs(entry.pnlPct ?? 0), 0);
    const grossLoss = losses.reduce((sum, entry) => sum + Math.abs(entry.pnlPct ?? 0), 0);
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
    const quality: RiskLevel = trades.length < 3 ? "medium" : avgReturn < 0 ? "high" : profitFactor >= 1.5 ? "low" : "medium";
    return {
      strategy,
      trades: trades.length,
      winRate: Math.round((wins.length / Math.max(1, trades.length)) * 100),
      avgReturn: Number(avgReturn.toFixed(1)),
      best: Number(Math.max(0, ...trades.map((entry) => entry.pnlPct ?? 0)).toFixed(1)),
      worst: Number(Math.min(0, ...trades.map((entry) => entry.pnlPct ?? 0)).toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      planCount: plans.length,
      quality
    };
  }).sort((a, b) => b.avgReturn - a.avgReturn);
}

function Rule({ title, value, text }: { title: string; value: string; text: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{text}</p>
    </div>
  );
}

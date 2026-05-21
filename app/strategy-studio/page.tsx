import Link from "next/link";
import { MiniMetricGrid, ScoreBadge, SectionCard, WarningList } from "../components/ui";
import { buildAlphaEngineResults } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes, mockTradePlans } from "../lib/mockData";
import { evaluateStrategyModules } from "../lib/strategyModules";

const strategyWeights = [
  ["Catalyst", 30],
  ["Trend", 20],
  ["Flow", 15],
  ["Theme", 15],
  ["Risk Momentum", 10],
  ["Regime", 5],
  ["Relative Strength", 5]
] as const;

export default function StrategyStudioPage() {
  const rows = buildAlphaEngineResults(mockEvents, mockStocks, mockThemes);
  const signals = evaluateStrategyModules(rows);
  const plannedStrategies = new Set(mockTradePlans.map((plan) => plan.strategy));
  const uncoveredSignals = signals.filter((signal) => !mockTradePlans.some((plan) => plan.symbol === signal.symbol && plan.strategy === signal.strategy));

  return (
    <div className="space-y-4">
      <SectionCard title="Strategy Studio Overview">
        <MiniMetricGrid
          items={[
            { label: "Active Modules", value: strategyWeights.length },
            { label: "Matched Signals", value: signals.length },
            { label: "Saved Strategies", value: plannedStrategies.size },
            { label: "Unplanned Signals", value: uncoveredSignals.length }
          ]}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Alpha Engine Weights">
          <div className="space-y-3">
            {strategyWeights.map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{label}</span>
                  <span>{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${value * 2.5}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Matched Strategy Playbooks">
          <div className="grid gap-3">
            {signals.map((signal) => (
              <div key={`${signal.strategy}-${signal.symbol}`} className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{signal.strategy}</div>
                    <div className="text-xs text-slate-500">{signal.symbol} {signal.name}</div>
                  </div>
                  <ScoreBadge score={signal.score} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{signal.thesis}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{signal.exitRule}</p>
                <div className="mt-3">
                  <WarningList warnings={signal.risks} />
                </div>
                <Link className="mt-3 inline-flex rounded-md border border-cyan-400/60 px-3 py-2 text-xs font-semibold text-cyan-200" href={`/trade-plan?symbol=${signal.symbol}`}>
                  Create plan
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

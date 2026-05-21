import { MiniMetricGrid, RiskBadge, ScoreBadge, SectionCard } from "../components/ui";
import { buildAlphaEngineResults, calculateFlowConfirmationScore, calculateQuantTrendScore, calculateRiskAdjustedMomentum, calculateThemeMomentumScore } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { formatNextAction } from "../lib/utils";

export default function SignalRadarPage() {
  const rows = buildAlphaEngineResults(mockEvents, mockStocks, mockThemes)
    .filter((row) => row.daysToEvent >= 0 && row.daysToEvent <= 14)
    .sort((a, b) => b.alpha.combinedAlphaScore - a.alpha.combinedAlphaScore);
  const leaders = rows.slice(0, 5);
  const avoid = rows.filter((row) => row.alpha.nextAction === "AvoidChasing").length;
  const planReady = rows.filter((row) => row.alpha.nextAction === "CreateTradePlan").length;

  return (
    <div className="space-y-4">
      <SectionCard title="Signal Radar Summary">
        <MiniMetricGrid
          items={[
            { label: "14-Day Signals", value: rows.length },
            { label: "Plan Ready", value: planReady },
            { label: "Avoid Chasing", value: avoid },
            { label: "Top Signal", value: leaders[0] ? `${leaders[0].event.symbol} ${Math.round(leaders[0].alpha.combinedAlphaScore)}` : "N/A" }
          ]}
        />
      </SectionCard>

      <SectionCard title="Factor Radar">
        <div className="grid gap-3 xl:grid-cols-5">
          {leaders.map((row) => (
            <div key={row.event.id} className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{row.event.symbol}</div>
                  <div className="text-xs text-slate-500">{row.event.name}</div>
                </div>
                <ScoreBadge score={row.alpha.combinedAlphaScore} />
              </div>
              <div className="mt-3 space-y-2">
                <Factor label="Catalyst" value={row.catalyst.totalCatalystScore} />
                <Factor label="Trend" value={calculateQuantTrendScore(row.stock)} />
                <Factor label="Flow" value={calculateFlowConfirmationScore(row.stock)} />
                <Factor label="Theme" value={calculateThemeMomentumScore(mockThemes, row.event, row.stock)} />
                <Factor label="Risk Adj." value={calculateRiskAdjustedMomentum(row.stock)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Signal Queue">
        <div className="table-scroll border border-slate-800 bg-[#08101a]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-500">
              <tr>
                {["D", "Symbol", "Event", "Alpha", "Catalyst", "Trend", "Flow", "Theme", "Priced-In", "Overheat", "Action"].map((head) => (
                  <th key={head} className="px-3 py-2">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.event.id} className="border-t border-slate-800 text-slate-300">
                  <td className="px-3 py-2 tabular-nums">{row.daysToEvent}</td>
                  <td className="px-3 py-2 font-semibold text-white">{row.event.symbol}</td>
                  <td className="max-w-[360px] px-3 py-2">{row.event.eventTitle}</td>
                  <td className="px-3 py-2"><ScoreBadge score={row.alpha.combinedAlphaScore} /></td>
                  <td className="px-3 py-2"><ScoreBadge score={row.catalyst.totalCatalystScore} /></td>
                  <td className="px-3 py-2"><ScoreBadge score={row.alpha.quantTrendScore} /></td>
                  <td className="px-3 py-2"><ScoreBadge score={row.alpha.flowConfirmationScore} /></td>
                  <td className="px-3 py-2"><ScoreBadge score={row.alpha.themeMomentumScore} /></td>
                  <td className="px-3 py-2"><RiskBadge level={row.pricedInRisk} /></td>
                  <td className="px-3 py-2"><RiskBadge level={row.overheatRisk} /></td>
                  <td className="px-3 py-2 text-slate-200">{formatNextAction(row.alpha.nextAction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function Factor({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800">
        <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

import { MiniMetricGrid, RiskBadge, ScoreBadge, SectionCard } from "../components/ui";
import { buildAlphaEngineResults } from "../lib/alphaEngine";
import { mockHistoricalEvents, mockStocks, mockThemes } from "../lib/mockData";

export default function EventStudyPage() {
  const rows = buildAlphaEngineResults(mockHistoricalEvents, mockStocks, mockThemes)
    .map((row, index) => {
      const stock = row.stock;
      const preMove = stock ? stock.sevenDayReturnPct - index * 0.35 : 0;
      const postDrift = Number(((row.alpha.combinedAlphaScore - 50) * 0.08 - row.alpha.pricedInPenalty * 0.06 - row.alpha.overheatPenalty * 0.05).toFixed(1));
      const abnormalVolume = stock ? Number((stock.volumeRatio + index * 0.03).toFixed(2)) : 1;
      const reaction = postDrift > 2 ? "Positive Drift" : postDrift < -1 ? "Fade" : "Neutral";
      return { ...row, preMove: Number(preMove.toFixed(1)), postDrift, abnormalVolume, reaction };
    })
    .sort((a, b) => b.alpha.combinedAlphaScore - a.alpha.combinedAlphaScore);

  const avgPostDrift = rows.reduce((sum, row) => sum + row.postDrift, 0) / Math.max(1, rows.length);
  const fadeRate = rows.filter((row) => row.reaction === "Fade").length / Math.max(1, rows.length);
  const positiveRate = rows.filter((row) => row.reaction === "Positive Drift").length / Math.max(1, rows.length);
  const crowdedCount = rows.filter((row) => row.pricedInRisk === "high" || row.pricedInRisk === "critical").length;

  return (
    <div className="space-y-4">
      <SectionCard title="Event Study Snapshot">
        <MiniMetricGrid
          items={[
            { label: "Historical Events", value: rows.length },
            { label: "Avg T+ Drift", value: `${avgPostDrift.toFixed(1)}%` },
            { label: "Positive Drift", value: `${Math.round(positiveRate * 100)}%` },
            { label: "Fade Rate", value: `${Math.round(fadeRate * 100)}%` },
            { label: "Crowded Events", value: crowdedCount },
            { label: "Best Sample", value: rows[0]?.event.symbol ?? "N/A" }
          ]}
        />
      </SectionCard>

      <SectionCard title="T-10 / T+10 Reaction Table">
        <div className="table-scroll border border-slate-800 bg-[#08101a]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-500">
              <tr>
                {["Date", "Symbol", "Event", "Alpha", "Pre Move", "T+ Drift", "Volume", "Priced-In", "Reaction"].map((head) => (
                  <th key={head} className="px-3 py-2">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.event.id} className="border-t border-slate-800 text-slate-300">
                  <td className="px-3 py-2 tabular-nums">{row.event.eventDate}</td>
                  <td className="px-3 py-2 font-semibold text-white">{row.event.symbol}</td>
                  <td className="max-w-[420px] px-3 py-2">{row.event.eventTitle}</td>
                  <td className="px-3 py-2"><ScoreBadge score={row.alpha.combinedAlphaScore} /></td>
                  <td className="px-3 py-2 tabular-nums">{row.preMove}%</td>
                  <td className={`px-3 py-2 tabular-nums ${row.postDrift >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{row.postDrift}%</td>
                  <td className="px-3 py-2 tabular-nums">{row.abnormalVolume}x</td>
                  <td className="px-3 py-2"><RiskBadge level={row.pricedInRisk} /></td>
                  <td className="px-3 py-2 text-slate-200">{row.reaction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Study Notes">
        <div className="grid gap-3 md:grid-cols-3">
          <Note title="Avoid late entries" text="High pre-event move plus high priced-in risk should push the idea into pullback-only review." />
          <Note title="Prefer drift samples" text="Positive T+ drift with moderate volume suggests the event thesis was not fully discounted." />
          <Note title="Data caution" text="This MVP uses seeded demo events; replace with imported historical event and OHLCV data for real validation." />
        </div>
      </SectionCard>
    </div>
  );
}

function Note({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{text}</p>
    </div>
  );
}

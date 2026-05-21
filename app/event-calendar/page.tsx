import Link from "next/link";
import { EventTypeBadge, MiniMetricGrid, RiskBadge, ScoreBadge, SectionCard } from "../components/ui";
import { buildAlphaEngineResults } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";

export default function EventCalendarPage() {
  const rows = buildAlphaEngineResults(mockEvents, mockStocks, mockThemes)
    .filter((row) => row.daysToEvent >= 0 && row.daysToEvent <= 30)
    .sort((a, b) => a.daysToEvent - b.daysToEvent || b.alpha.combinedAlphaScore - a.alpha.combinedAlphaScore);
  const groups = groupByDate(rows);
  const thisWeek = rows.filter((row) => row.daysToEvent <= 7);
  const highRisk = rows.filter((row) => row.pricedInRisk === "high" || row.pricedInRisk === "critical" || row.overheatRisk === "high" || row.overheatRisk === "critical");

  return (
    <div className="space-y-4">
      <SectionCard title="Event Calendar Overview">
        <MiniMetricGrid
          items={[
            { label: "30-Day Events", value: rows.length },
            { label: "Next 7 Days", value: thisWeek.length },
            { label: "High Risk", value: highRisk.length },
            { label: "Top Event", value: rows[0] ? `${rows[0].event.symbol} D${rows[0].daysToEvent}` : "N/A" }
          ]}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <SectionCard title="Calendar Queue">
          <div className="space-y-3">
            {groups.map(([date, items]) => (
              <div key={date} className="rounded-md border border-slate-800 bg-[#08101a]">
                <div className="border-b border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{date}</div>
                <div className="divide-y divide-slate-800">
                  {items.map((row) => (
                    <div key={row.event.id} className="grid gap-3 p-3 md:grid-cols-[5rem_1fr_auto] md:items-center">
                      <div className="text-sm font-semibold text-white">D{row.daysToEvent}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{row.event.symbol}</span>
                          <span className="text-sm text-slate-400">{row.event.name}</span>
                          <EventTypeBadge type={row.event.eventType} />
                        </div>
                        <p className="mt-1 text-sm text-slate-300">{row.event.eventTitle}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <ScoreBadge score={row.alpha.combinedAlphaScore} />
                        <RiskBadge level={row.overheatRisk} />
                        <Link className="rounded-md border border-cyan-400/60 px-2 py-1 text-xs font-semibold text-cyan-200" href={`/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}`}>Plan</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Risk Clusters">
          <div className="space-y-2">
            {highRisk.slice(0, 10).map((row) => (
              <div key={row.event.id} className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{row.event.symbol} D{row.daysToEvent}</div>
                  <RiskBadge level={row.pricedInRisk === "high" || row.pricedInRisk === "critical" ? row.pricedInRisk : row.overheatRisk} />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{row.alpha.warnings[0] ?? "Review event concentration before adding risk."}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function groupByDate<T extends { event: { eventDate: string } }>(rows: T[]): Array<[string, T[]]> {
  const grouped = rows.reduce<Record<string, T[]>>((acc, row) => {
    acc[row.event.eventDate] = acc[row.event.eventDate] ?? [];
    acc[row.event.eventDate].push(row);
    return acc;
  }, {});
  return Object.entries(grouped);
}

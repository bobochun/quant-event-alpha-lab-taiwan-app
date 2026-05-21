import Link from "next/link";
import { analyzePortfolioExposure, buildAlphaEngineResults, calculateThemeHeat, classifyMarketRegime } from "./lib/alphaEngine";
import { mockEvents, mockPortfolio, mockStocks, mockThemes, mockTradePlans } from "./lib/mockData";
import { daysBetween, todayTaipei } from "./lib/utils";
import { ActionList, CatalystTable, DataSourceBadge, MiniMetricGrid, SectionCard } from "./components/ui";

export default function CommandCenterPage() {
  const upcoming = mockEvents.filter((event) => daysBetween(todayTaipei(), event.eventDate) <= 7);
  const rows = buildAlphaEngineResults(upcoming, mockStocks, mockThemes).sort((a, b) => b.alpha.combinedAlphaScore - a.alpha.combinedAlphaScore);
  const regime = classifyMarketRegime(mockStocks);
  const themes = calculateThemeHeat(mockThemes, mockEvents, mockStocks);
  const exposure = analyzePortfolioExposure(mockPortfolio);
  const actions = [
    ...rows.filter((row) => row.alpha.combinedAlphaScore >= 65 && !mockTradePlans.some((plan) => plan.relatedEventId === row.event.id)).slice(0, 3).map((row) => `High catalyst without plan: ${row.event.symbol} ${row.event.name}`),
    ...rows.filter((row) => row.overheatRisk === "high" || row.overheatRisk === "critical").slice(0, 2).map((row) => `Near event but overheated: ${row.event.symbol}. Avoid chasing.`),
    ...rows.filter((row) => row.event.confidence < 50).slice(0, 2).map((row) => `Event with low data confidence: ${row.event.symbol}`),
    ...Object.entries(exposure.themeExposure).filter(([, value]) => value > 35).map(([theme]) => `Portfolio theme exposure elevated: ${theme}`),
    "Write today's trading journal before adding new risk.",
    "Review Low Base Catalyst and Event Pullback strategy candidates this week."
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-800 bg-[#0d1520]/90 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Daily Command Center</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Quant Event Alpha Lab Taiwan</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Find upcoming event catalysts, filter out overheated or already priced-in names, create risk-controlled plans, and keep the journal honest.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DataSourceBadge source="Demo" />
            <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">No automated orders</span>
            <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">No broker API</span>
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-6">
        {["Market state", "7-day catalysts", "Priced-in vs overheated", "Pick 3 plans", "Portfolio exposure", "Journal / export"].map((step, index) => (
          <div key={step} className="rounded-md border border-slate-800 bg-[#0a121c] px-3 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Step {index + 1}</div>
            <div className="mt-1 text-sm font-medium text-slate-200">{step}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Market Regime Card">
          <MiniMetricGrid items={[
            { label: "Regime", value: regime.regime },
            { label: "Suggested Gross", value: `${regime.suggestedGrossExposurePct}%` },
            { label: "Volatility", value: regime.volatilityState },
            { label: "Data", value: regime.dataSource }
          ]} />
          <p className="mt-3 text-xs leading-5 text-slate-400">{regime.explanation}</p>
        </SectionCard>

        <SectionCard title="7-Day Catalyst Snapshot">
          <MiniMetricGrid items={[
            { label: "Events", value: upcoming.length },
            { label: "High Catalyst", value: rows.filter((row) => row.catalyst.totalCatalystScore >= 70).length },
            { label: "Overheated", value: rows.filter((row) => row.overheatRisk === "high" || row.overheatRisk === "critical").length },
            { label: "Low Confidence", value: rows.filter((row) => row.event.confidence < 50).length }
          ]} />
          <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">Hottest theme: {themes[0]?.theme ?? "N/A"}</div>
        </SectionCard>

        <SectionCard title="Quick Actions">
          <div className="grid gap-2 text-sm">
            <Link className="rounded-md bg-emerald-400 px-3 py-2 font-semibold text-slate-950" href="/event-radar">Add / review events</Link>
            <Link className="rounded-md bg-cyan-400 px-3 py-2 font-semibold text-slate-950" href="/trade-plan">Create trade plan</Link>
            <Link className="rounded-md border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800" href="/reports">Export weekly report</Link>
            <Link className="rounded-md border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800" href="/settings">JSON backup / import</Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Top Catalyst Table">
        <CatalystTable rows={rows} limit={10} />
      </SectionCard>

      <SectionCard title="Today Action List">
        <ActionList items={actions} />
      </SectionCard>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzePortfolioExposure } from "../lib/alphaEngine";
import { mockPortfolio } from "../lib/mockData";
import { loadPortfolio, savePortfolio } from "../lib/storage";
import type { Portfolio, StrategyName } from "../lib/types";
import { MiniMetricGrid, RiskAlertPanel, SectionCard } from "../components/ui";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
  const [draft, setDraft] = useState({
    symbol: "2317",
    name: "Hon Hai",
    shares: 1000,
    averageCost: 176,
    currentPrice: 178,
    tags: "AI server,EV",
    strategy: "AI Theme Rotation" as StrategyName,
    relatedEventId: "",
    stopLoss: 168,
    takeProfit1: 190,
    takeProfit2: 205,
    notes: "Manual position"
  });
  const exposure = useMemo(() => analyzePortfolioExposure(portfolio), [portfolio]);

  useEffect(() => setPortfolio(loadPortfolio()), []);

  function addPosition() {
    const next: Portfolio = {
      ...portfolio,
      positions: [
        {
          id: `pos-${Date.now()}`,
          ...draft,
          tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          relatedEventId: draft.relatedEventId || undefined,
          dataSource: "Manual",
          sourceNote: "Manual local position."
        },
        ...portfolio.positions
      ],
      updatedAt: new Date().toISOString(),
      dataSource: "Manual",
      sourceNote: "Manual local portfolio."
    };
    setPortfolio(next);
    savePortfolio(next);
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Portfolio Overview">
        <MiniMetricGrid items={[
          { label: "Total Assets", value: Math.round(exposure.totalAssetValue).toLocaleString() },
          { label: "Cash", value: Math.round(exposure.cash).toLocaleString() },
          { label: "Invested", value: `${exposure.investedPct}%` },
          { label: "Max Single", value: `${exposure.maxSinglePositionPct}%` },
          { label: "Beta Exposure", value: exposure.marketBetaExposure },
          { label: "Vol Exposure", value: exposure.volatilityExposure }
        ]} />
      </SectionCard>
      <SectionCard title="Manual Position Input">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded border border-border bg-[#0b1118] p-2" value={draft.symbol} onChange={(event) => setDraft({ ...draft, symbol: event.target.value })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" type="number" value={draft.shares} onChange={(event) => setDraft({ ...draft, shares: Number(event.target.value) })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" type="number" value={draft.averageCost} onChange={(event) => setDraft({ ...draft, averageCost: Number(event.target.value) })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" type="number" value={draft.currentPrice} onChange={(event) => setDraft({ ...draft, currentPrice: Number(event.target.value) })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" value={draft.relatedEventId} placeholder="Related event ID" onChange={(event) => setDraft({ ...draft, relatedEventId: event.target.value })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" type="number" value={draft.stopLoss} onChange={(event) => setDraft({ ...draft, stopLoss: Number(event.target.value) })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" type="number" value={draft.takeProfit1} onChange={(event) => setDraft({ ...draft, takeProfit1: Number(event.target.value) })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" type="number" value={draft.takeProfit2} onChange={(event) => setDraft({ ...draft, takeProfit2: Number(event.target.value) })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          <button className="rounded bg-accent px-3 py-2 font-semibold text-black" onClick={addPosition}>Add Position</button>
        </div>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Exposure">
          <pre className="overflow-auto rounded bg-[#0b1118] p-3 text-xs text-muted">{JSON.stringify({ themeExposure: exposure.themeExposure, strategyExposure: exposure.strategyExposure, eventDateExposure: exposure.eventDateExposure, marketBetaExposure: exposure.marketBetaExposure, volatilityExposure: exposure.volatilityExposure, correlationGroups: exposure.correlationGroups }, null, 2)}</pre>
        </SectionCard>
        <SectionCard title="Portfolio Alerts">
          <RiskAlertPanel alerts={exposure.alerts} />
        </SectionCard>
      </div>
    </div>
  );
}

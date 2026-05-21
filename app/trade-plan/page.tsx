"use client";

import { useEffect, useState } from "react";
import { mockEvents, mockPortfolio, mockStocks, mockThemes, mockTradePlans } from "../lib/mockData";
import { analyzePortfolioExposure, buildAlphaEngineResults, classifyMarketRegime } from "../lib/alphaEngine";
import { calculateAdaptivePositionSize } from "../lib/positionSizing";
import { loadJournal, loadTradePlans, saveJournal, saveTradePlans } from "../lib/storage";
import { generateTradePlan, tradePlanToMarkdown } from "../lib/tradePlan";
import type { PositionSizingResult, StrategyName } from "../lib/types";
import { ErrorState, MiniMetricGrid, SectionCard, TradePlanCard, WarningList } from "../components/ui";
import { daysBetween, todayTaipei } from "../lib/utils";

const strategies: StrategyName[] = ["Pre-Earnings Drift", "ETF Rebalance Flow", "AI Theme Rotation", "Low Base Catalyst", "Event Pullback", "Manual Event Research"];
const numberLabels = {
  capital: "Capital",
  riskPerTradePct: "Risk per trade %",
  maxPositionPct: "Max position %",
  entryPrice: "Entry price",
  stopLoss: "Stop loss",
  takeProfit1: "Take profit 1",
  takeProfit2: "Take profit 2"
} as const;

export default function TradePlanPage() {
  const [plans, setPlans] = useState(mockTradePlans);
  const [error, setError] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [adaptive, setAdaptive] = useState<PositionSizingResult | null>(null);
  const [form, setForm] = useState({
    symbol: "2330",
    strategy: "Low Base Catalyst" as StrategyName,
    relatedEventId: "evt-1",
    capital: 1000000,
    riskPerTradePct: 1,
    maxPositionPct: 18,
    entryPrice: 928,
    stopLoss: 884,
    takeProfit1: 990,
    takeProfit2: 1040,
    eventInvalidationRule: "If the event thesis fails or price breaks stop loss, review and reduce risk.",
    timeStopRule: "If there is no follow-through within 3 trading days after the event, reduce risk."
  });

  useEffect(() => setPlans(loadTradePlans()), []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("eventId");
    const symbol = params.get("symbol");
    const event = mockEvents.find((item) => item.id === eventId);
    const stock = mockStocks.find((item) => item.symbol === symbol);
    if (event || stock) {
      setForm((current) => ({
        ...current,
        symbol: stock?.symbol ?? event?.symbol ?? current.symbol,
        relatedEventId: event?.id ?? current.relatedEventId,
        entryPrice: stock?.price ?? current.entryPrice,
        stopLoss: stock ? Number((stock.price * 0.94).toFixed(2)) : current.stopLoss,
        takeProfit1: stock ? Number((stock.price * 1.07).toFixed(2)) : current.takeProfit1,
        takeProfit2: stock ? Number((stock.price * 1.13).toFixed(2)) : current.takeProfit2
      }));
    }
  }, []);

  const stock = mockStocks.find((item) => item.symbol === form.symbol) ?? mockStocks[0];
  const relatedEvent = mockEvents.find((event) => event.id === form.relatedEventId);
  const alphaRow = buildAlphaEngineResults(relatedEvent ? [relatedEvent] : [], mockStocks, mockThemes)[0];
  const portfolioExposure = analyzePortfolioExposure(mockPortfolio);
  const themeConcentrationPct = Math.max(...Object.entries(portfolioExposure.themeExposure).filter(([theme]) => stock.themes.includes(theme)).map(([, value]) => value), 0);

  function submit() {
    setError("");
    try {
      const plan = generateTradePlan({
        ...form,
        name: stock.name,
        eventDate: relatedEvent?.eventDate,
        dataSource: "Manual",
        eventDateDistanceDays: relatedEvent ? daysBetween(todayTaipei(), relatedEvent.eventDate) : undefined,
        preEventReturnPct: stock.sevenDayReturnPct,
        confidence: relatedEvent?.confidence,
        isAttentionStock: stock.isAttentionStock,
        isDispositionStock: stock.isDispositionStock
      });
      const regime = classifyMarketRegime(mockStocks);
      const sizing = calculateAdaptivePositionSize({
        capital: form.capital,
        entryPrice: form.entryPrice,
        stopLoss: form.stopLoss,
        riskPerTradePct: form.riskPerTradePct,
        maxPositionPct: form.maxPositionPct,
        combinedAlphaScore: alphaRow?.alpha.combinedAlphaScore ?? 50,
        marketRegime: regime.regime,
        eventRisk: alphaRow?.pricedInRisk ?? "medium",
        portfolioExposurePct: portfolioExposure.investedPct,
        themeConcentrationPct,
        volatility20d: stock.volatility20d,
        confidence: relatedEvent?.confidence ?? 50,
        dataQuality: relatedEvent?.confidence ?? 50
      });
      const next = [plan, ...plans];
      setPlans(next);
      saveTradePlans(next);
      setMarkdown(tradePlanToMarkdown(plan));
      setAdaptive(sizing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate plan.");
    }
  }

  function addJournal() {
    const journal = loadJournal();
    saveJournal([
      {
        id: `journal-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        symbol: stock.symbol,
        name: stock.name,
        action: "planned",
        strategy: form.strategy,
        relatedEventId: form.relatedEventId,
        eventType: relatedEvent?.eventType,
        price: form.entryPrice,
        shares: 0,
        reason: "Trade plan created.",
        eventThesis: form.eventInvalidationRule,
        wasEventPricedIn: false,
        didChaseNews: false,
        planFollowed: true,
        emotion: "disciplined",
        dataSource: "Manual",
        sourceNote: "Manual journal note from trade plan."
      },
      ...journal
    ]);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <SectionCard title="Trade Plan Builder">
        <div className="grid gap-3 md:grid-cols-2">
          <select className="rounded border border-border bg-[#0b1118] p-2" value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })}>
            {mockStocks.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol} {item.name}</option>)}
          </select>
          <select className="rounded border border-border bg-[#0b1118] p-2" value={form.strategy} onChange={(event) => setForm({ ...form, strategy: event.target.value as StrategyName })}>
            {strategies.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="rounded border border-border bg-[#0b1118] p-2 md:col-span-2" value={form.relatedEventId} onChange={(event) => setForm({ ...form, relatedEventId: event.target.value })}>
            {mockEvents.map((event) => <option key={event.id} value={event.id}>{event.symbol} {event.eventDate} {event.eventTitle}</option>)}
          </select>
          {(["capital", "riskPerTradePct", "maxPositionPct", "entryPrice", "stopLoss", "takeProfit1", "takeProfit2"] as const).map((key) => (
            <label key={key} className="text-xs text-muted">
              {numberLabels[key]}
              <input className="mt-1 w-full rounded border border-border bg-[#0b1118] p-2 text-text" type="number" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} />
            </label>
          ))}
          <textarea className="rounded border border-border bg-[#0b1118] p-2 md:col-span-2" value={form.eventInvalidationRule} onChange={(event) => setForm({ ...form, eventInvalidationRule: event.target.value })} />
          <textarea className="rounded border border-border bg-[#0b1118] p-2 md:col-span-2" value={form.timeStopRule} onChange={(event) => setForm({ ...form, timeStopRule: event.target.value })} />
        </div>
        {error ? <div className="mt-3"><ErrorState message={error} /></div> : null}
        <div className="mt-3 flex gap-2">
          <button className="rounded bg-accent px-3 py-2 font-semibold text-black" onClick={submit}>Generate & Save</button>
          <button className="rounded border border-border px-3 py-2 text-muted" onClick={addJournal}>Add Journal</button>
        </div>
      </SectionCard>
      <SectionCard title="Markdown Export">
        <textarea className="min-h-96 w-full rounded border border-border bg-[#0b1118] p-3 font-mono text-xs" value={markdown} readOnly />
      </SectionCard>
      <SectionCard title="Adaptive Position Sizing">
        {adaptive ? (
          <div className="space-y-3">
            <MiniMetricGrid items={[
              { label: "Adaptive Shares", value: adaptive.suggestedShares },
              { label: "Adaptive Position", value: `${adaptive.suggestedPositionPct}%` },
              { label: "Risk Adjusted %", value: `${adaptive.riskAdjustedPositionPct}%` },
              { label: "Confidence Size", value: `${adaptive.confidenceAdjustedSize}%` }
            ]} />
            <WarningList warnings={adaptive.warnings} />
          </div>
        ) : (
          <p className="text-sm text-muted">Generate a plan to calculate adaptive sizing.</p>
        )}
      </SectionCard>
      <SectionCard title="Saved Plans">
        <div className="space-y-3">{plans.map((plan) => <TradePlanCard key={plan.id} plan={plan} />)}</div>
      </SectionCard>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { mockEvents, mockPortfolio, mockStocks, mockThemes, mockTradePlans } from "../lib/mockData";
import { analyzePortfolioExposure, buildAlphaEngineResults, classifyMarketRegime } from "../lib/alphaEngine";
import { calculateAdaptivePositionSize } from "../lib/positionSizing";
import { loadJournal, loadTradePlans, saveJournal, saveTradePlans } from "../lib/storage";
import { generateTradePlan, tradePlanToMarkdown } from "../lib/tradePlan";
import type { PositionSizingResult, StrategyName } from "../lib/types";
import { ErrorState, MiniMetricGrid, SectionCard, TradePlanCard, WarningList } from "../components/ui";
import { daysBetween, formatSharesLots, formatStrategy, todayTaipei } from "../lib/utils";

const strategies: StrategyName[] = ["Pre-Earnings Drift", "ETF Rebalance Flow", "AI Theme Rotation", "Low Base Catalyst", "Event Pullback", "Manual Event Research"];
const numberLabels = {
  capital: "可用資金",
  riskPerTradePct: "單筆最大風險 %",
  maxPositionPct: "單檔最高部位 %",
  entryPrice: "研究進場價",
  stopLoss: "停損價",
  takeProfit1: "第一停利價",
  takeProfit2: "第二停利價"
} as const;

const inputClass = "mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-slate-900 outline-none focus:border-cyan-500";

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
    eventInvalidationRule: "若事件假設失效或跌破停損，必須重新檢查。",
    timeStopRule: "若事件後 3 個交易日內沒有延續，降低風險或移出高優先研究。"
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
      setError(err instanceof Error ? err.message : "無法產生交易計畫。");
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
        reason: "已建立交易計畫。",
        eventThesis: form.eventInvalidationRule,
        wasEventPricedIn: false,
        didChaseNews: false,
        planFollowed: true,
        emotion: "disciplined",
        dataSource: "Manual",
        sourceNote: "由交易計畫建立的手動日誌。"
      },
      ...journal
    ]);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">交易計畫產生器</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">交易計畫產生器</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">先算清楚最多虧多少，再決定是否進一步研究。此頁只建立研究計畫，不做自動下單。</p>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <SectionCard title="計畫輸入">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-500">股票代號
          <select className={inputClass} value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })}>
            {mockStocks.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol} / {item.name}</option>)}
          </select>
          </label>
          <label className="text-xs text-slate-500">策略
          <select className={inputClass} value={form.strategy} onChange={(event) => setForm({ ...form, strategy: event.target.value as StrategyName })}>
            {strategies.map((item) => <option key={item} value={item}>{formatStrategy(item)}</option>)}
          </select>
          </label>
          <label className="text-xs text-slate-500 md:col-span-2">關聯事件
          <select className={inputClass} value={form.relatedEventId} onChange={(event) => setForm({ ...form, relatedEventId: event.target.value })}>
            {mockEvents.map((event) => <option key={event.id} value={event.id}>{event.symbol} / {event.name} {event.eventDate} {event.eventTitle}</option>)}
          </select>
          </label>
          {(["capital", "riskPerTradePct", "maxPositionPct", "entryPrice", "stopLoss", "takeProfit1", "takeProfit2"] as const).map((key) => (
            <label key={key} className="text-xs text-slate-500">
              {numberLabels[key]}
              <input className={inputClass} type="number" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} />
            </label>
          ))}
          <label className="text-xs text-slate-500 md:col-span-2">事件失效條件
            <textarea className={inputClass} value={form.eventInvalidationRule} onChange={(event) => setForm({ ...form, eventInvalidationRule: event.target.value })} />
          </label>
          <label className="text-xs text-slate-500 md:col-span-2">時間停損規則
            <textarea className={inputClass} value={form.timeStopRule} onChange={(event) => setForm({ ...form, timeStopRule: event.target.value })} />
          </label>
        </div>
        {error ? <div className="mt-3"><ErrorState message={error} /></div> : null}
        <div className="mt-3 flex gap-2">
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={submit}>產生並儲存交易計畫</button>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={addJournal}>加入交易日誌</button>
        </div>
      </SectionCard>
      <SectionCard title="Markdown 匯出">
        <textarea className="min-h-96 w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800" value={markdown} readOnly />
      </SectionCard>
      <SectionCard title="自適應部位試算">
        {adaptive ? (
          <div className="space-y-3">
            <MiniMetricGrid items={[
              { label: "建議股數", value: formatSharesLots(adaptive.suggestedShares) },
              { label: "建議部位", value: `${adaptive.suggestedPositionPct}%` },
              { label: "風險調整後", value: `${adaptive.riskAdjustedPositionPct}%` },
              { label: "可信度調整", value: `${adaptive.confidenceAdjustedSize}%` }
            ]} />
            <WarningList warnings={adaptive.warnings} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">產生交易計畫後，這裡會顯示自適應部位大小。</p>
        )}
      </SectionCard>
      <SectionCard title="已儲存交易計畫">
        <div className="space-y-3">{plans.map((plan) => <TradePlanCard key={plan.id} plan={plan} />)}</div>
      </SectionCard>
      </div>
    </div>
  );
}

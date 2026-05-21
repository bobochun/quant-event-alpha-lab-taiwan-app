"use client";

import Link from "next/link";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { mockEvents, mockPortfolio, mockStocks, mockThemes, mockTradePlans } from "../lib/mockData";
import { analyzePortfolioExposure, buildAlphaEngineResults, classifyMarketRegime } from "../lib/alphaEngine";
import { calculateAdaptivePositionSize } from "../lib/positionSizing";
import { loadJournal, loadTradePlans, saveJournal, saveTradePlans } from "../lib/storage";
import { generateTradePlan, tradePlanToMarkdown } from "../lib/tradePlan";
import type { Event, PositionSizingResult, StrategyName } from "../lib/types";
import { ErrorState, MiniMetricGrid, SectionCard, TradePlanCard, WarningList } from "../components/ui";
import { daysBetween, formatNextAction, formatSharesLots, formatStrategy, todayTaipei } from "../lib/utils";
import { markJournalLinked, markTradePlanCreated } from "../lib/actionState";
import { loadSelectedEvent } from "../lib/navigationState";

const strategies: StrategyName[] = ["Pre-Earnings Drift", "ETF Rebalance Flow", "AI Theme Rotation", "Low Base Catalyst", "Event Pullback", "Manual Event Research"];
const inputClass = "mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-slate-900 outline-none focus:border-cyan-500";
type FormState = {
  symbol: string;
  strategy: StrategyName;
  relatedEventId: string;
  capital: number;
  riskPerTradePct: number;
  maxPositionPct: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  eventInvalidationRule: string;
  timeStopRule: string;
};
type NumericFormKey = "capital" | "riskPerTradePct" | "maxPositionPct" | "entryPrice" | "stopLoss" | "takeProfit1" | "takeProfit2";

export default function TradePlanPage() {
  const [plans, setPlans] = useState(mockTradePlans);
  const [error, setError] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [adaptive, setAdaptive] = useState<PositionSizingResult | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [lastPlanEventId, setLastPlanEventId] = useState<string | undefined>();
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

  useEffect(() => {
    setPlans(loadTradePlans());
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("eventId");
    const symbol = params.get("symbol");
    const navState = loadSelectedEvent();
    const event = navState?.event.id === eventId ? navState.event : mockEvents.find((item) => item.id === eventId);
    const stock = mockStocks.find((item) => item.symbol === (symbol ?? event?.symbol));
    if (event) setSelectedEvent(event);
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
  const relatedEvent = selectedEvent?.id === form.relatedEventId ? selectedEvent : mockEvents.find((event) => event.id === form.relatedEventId);
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
      setLastPlanEventId(plan.relatedEventId);
      markTradePlanCreated(plan.relatedEventId);
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
        wasEventPricedIn: alphaRow?.pricedInRisk === "high" || alphaRow?.pricedInRisk === "critical",
        didChaseNews: false,
        planFollowed: true,
        emotion: "disciplined",
        dataSource: "Manual",
        sourceNote: "由交易計畫建立的手動日誌。"
      },
      ...journal
    ]);
    markJournalLinked(form.relatedEventId);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">交易計畫產生器</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">交易計畫產生器</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">先算清楚最多虧多少，再決定是否進一步研究。此頁只建立研究計畫，不做自動下單。</p>
      </section>

      {relatedEvent ? (
        <div className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          已從事件催化雷達帶入：{relatedEvent.symbol} / {relatedEvent.name}，{relatedEvent.eventTitle}
          {alphaRow ? <span className="ml-2">催化 {Math.round(alphaRow.catalyst.totalCatalystScore)}，Alpha {Math.round(alphaRow.alpha.combinedAlphaScore)}，下一步：{formatNextAction(alphaRow.alpha.nextAction)}</span> : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div className="space-y-4">
          <Step title="Step 1 選股票與事件" note="從事件雷達帶入時會自動填入股票、事件與日期。">
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
                  {[...(selectedEvent ? [selectedEvent] : []), ...mockEvents.filter((event) => event.id !== selectedEvent?.id)].map((event) => <option key={event.id} value={event.id}>{event.symbol} / {event.name} {event.eventDate} {event.eventTitle}</option>)}
                </select>
              </label>
            </div>
          </Step>

          <Step title="Step 2 設定資金與風險" note="先決定這筆研究最多能承受多少虧損。">
            <NumberGrid form={form} setForm={setForm} keys={["capital", "riskPerTradePct", "maxPositionPct"]} labels={{ capital: "可用資金", riskPerTradePct: "單筆最大風險 %", maxPositionPct: "單檔最高部位 %" }} />
          </Step>

          <Step title="Step 3 設定進場 / 停損 / 停利" note="研究進場價必須高於停損價，才有辦法計算風險。">
            <NumberGrid form={form} setForm={setForm} keys={["entryPrice", "stopLoss", "takeProfit1", "takeProfit2"]} labels={{ entryPrice: "研究進場價", stopLoss: "停損價", takeProfit1: "第一停利價", takeProfit2: "第二停利價" }} />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-500">事件失效條件<textarea className={inputClass} value={form.eventInvalidationRule} onChange={(event) => setForm({ ...form, eventInvalidationRule: event.target.value })} /></label>
              <label className="text-xs text-slate-500">時間停損規則<textarea className={inputClass} value={form.timeStopRule} onChange={(event) => setForm({ ...form, timeStopRule: event.target.value })} /></label>
            </div>
          </Step>

          <Step title="Step 4 產生計畫與儲存" note="產生後會儲存到 localStorage，並可加入交易日誌或匯出 Markdown。">
            {error ? <ErrorState message={error} /> : null}
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={submit}>產生並儲存交易計畫</button>
              <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={addJournal}>加入交易日誌</button>
              <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" href="/event-radar">回事件雷達</Link>
              <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" href="/reports">匯出報告</Link>
            </div>
          </Step>
        </div>

        <div className="space-y-4">
          <SectionCard title="即時計算">
            <MiniMetricGrid items={[
              { label: "研究股數", value: form.entryPrice > form.stopLoss ? formatSharesLots(Math.floor((form.capital * (form.riskPerTradePct / 100)) / (form.entryPrice - form.stopLoss))) : "無法計算" },
              { label: "事件日期", value: relatedEvent?.eventDate ?? "未設定" },
              { label: "已反應風險", value: alphaRow ? formatNextAction(alphaRow.alpha.nextAction) : "無資料" },
              { label: "關聯狀態", value: lastPlanEventId ? "已建立計畫" : "尚未儲存" }
            ]} />
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
            ) : <p className="text-sm text-slate-500">產生交易計畫後，這裡會顯示自適應部位大小。</p>}
          </SectionCard>

          <SectionCard title="Markdown 匯出">
            <textarea className="min-h-72 w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800" value={markdown} readOnly />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="已儲存交易計畫">
        <div className="space-y-3">{plans.map((plan) => <TradePlanCard key={plan.id} plan={plan} />)}</div>
      </SectionCard>
    </div>
  );
}

function Step({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <SectionCard title={title}><p className="mb-3 text-xs leading-5 text-slate-500">{note}</p>{children}</SectionCard>;
}

function NumberGrid({ form, setForm, keys, labels }: { form: FormState; setForm: Dispatch<SetStateAction<FormState>>; keys: NumericFormKey[]; labels: Partial<Record<NumericFormKey, string>> }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {keys.map((key) => (
        <label key={key} className="text-xs text-slate-500">{labels[key]}
          <input className={inputClass} type="number" value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} />
        </label>
      ))}
    </div>
  );
}

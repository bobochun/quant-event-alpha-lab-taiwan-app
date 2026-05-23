"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzePortfolioExposure } from "../lib/alphaEngine";
import { mockPortfolio } from "../lib/mockData";
import { loadPortfolio, savePortfolio } from "../lib/storage";
import type { DataSource, Portfolio, StrategyName } from "../lib/types";
import { DataSourceBadge, MiniMetricGrid, RiskAlertPanel, SectionCard, WarningList } from "../components/ui";
import { formatCurrencyNTD, formatSharesLots, formatStrategy, localizeTheme } from "../lib/utils";
import { fetchLatestQuotes, type QuoteData } from "../lib/marketApi";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [priceMessage, setPriceMessage] = useState("進頁後會自動用後端批次報價更新持股 currentPrice；若後端不可用，會明確標示 Demo fallback。");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [draft, setDraft] = useState({
    symbol: "2317",
    name: "鴻海",
    shares: 1000,
    averageCost: 176,
    currentPrice: 178,
    tags: "AI server,EV",
    strategy: "AI Theme Rotation" as StrategyName,
    relatedEventId: "",
    stopLoss: 168,
    takeProfit1: 190,
    takeProfit2: 205,
    notes: "手動持股"
  });

  const enrichedPortfolio = useMemo(() => ({
    ...portfolio,
    positions: portfolio.positions.map((position) => {
      const quote = quotes[position.symbol];
      return quote ? { ...position, currentPrice: quote.price, dataSource: quote.dataSource as DataSource, sourceNote: quote.sourceNote } : position;
    }),
  }), [portfolio, quotes]);
  const exposure = useMemo(() => analyzePortfolioExposure(enrichedPortfolio), [enrichedPortfolio]);

  useEffect(() => {
    const stored = loadPortfolio();
    setPortfolio(stored);
    void syncQuotes(stored, false);
  }, []);

  async function syncQuotes(target = portfolio, persist = true) {
    const symbols = target.positions.map((position) => position.symbol);
    if (!symbols.length) {
      setPriceMessage("目前沒有持股，不需同步報價。 ");
      return;
    }
    setLoadingQuotes(true);
    setPriceMessage("正在由後端同步持股最新價...");
    try {
      const rows = await fetchLatestQuotes(symbols);
      const map = Object.fromEntries(rows.map((quote) => [quote.symbol, quote]));
      setQuotes(map);
      const updated: Portfolio = {
        ...target,
        positions: target.positions.map((position) => {
          const quote = map[position.symbol];
          return quote ? { ...position, currentPrice: quote.price, dataSource: quote.dataSource as DataSource, sourceNote: quote.sourceNote } : position;
        }),
        updatedAt: new Date().toISOString(),
        dataSource: rows.some((quote) => quote.dataSource !== "Demo") ? "Cached" : "Demo",
        sourceNote: `持股價格已嘗試由後端批次報價同步；${rows.filter((quote) => quote.dataSource === "Demo").length} 檔為 Demo fallback。`
      };
      setPortfolio(updated);
      if (persist) savePortfolio(updated);
      setWarnings(rows.filter((quote) => quote.dataSource === "Demo").map((quote) => `${quote.symbol}: ${quote.sourceNote}`));
      setPriceMessage(`完成 ${rows.length} 檔持股價格同步；來源：${Array.from(new Set(rows.map((quote) => `${quote.provider}/${quote.dataSource}`))).join("、")}。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "持股報價同步失敗"]);
      setPriceMessage("持股報價同步失敗，保留目前 currentPrice。 ");
    } finally {
      setLoadingQuotes(false);
    }
  }

  function addPosition() {
    const quote = quotes[draft.symbol];
    const currentPrice = quote?.price ?? draft.currentPrice;
    const next: Portfolio = {
      ...portfolio,
      positions: [
        {
          id: `pos-${Date.now()}`,
          ...draft,
          currentPrice,
          tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          relatedEventId: draft.relatedEventId || undefined,
          dataSource: quote ? quote.dataSource as DataSource : "Manual",
          sourceNote: quote ? quote.sourceNote : "手動建立的本機持股。"
        },
        ...portfolio.positions
      ],
      updatedAt: new Date().toISOString(),
      dataSource: "Manual",
      sourceNote: "手動建立的本機投組，價格可由後端同步。"
    };
    setPortfolio(next);
    savePortfolio(next);
    void syncQuotes(next, true);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">PORTFOLIO RISK</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">投組風控</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">檢查單檔、題材、策略與事件是否過度集中。持股價格會優先由後端批次報價同步，並標示來源。</p>
          </div>
          <div className="flex flex-wrap gap-2"><DataSourceBadge source={enrichedPortfolio.dataSource} /><button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={loadingQuotes} onClick={() => void syncQuotes()}>{loadingQuotes ? "同步中..." : "同步持股報價"}</button></div>
        </div>
      </section>

      <SectionCard title="持股報價同步狀態">
        <p className="text-sm text-amber-700">{priceMessage}</p>
        <WarningList warnings={warnings} />
      </SectionCard>

      <SectionCard title="總資產摘要">
        <MiniMetricGrid items={[
          { label: "總資產", value: formatCurrencyNTD(exposure.totalAssetValue) },
          { label: "現金", value: formatCurrencyNTD(exposure.cash) },
          { label: "持股水位", value: `${exposure.investedPct}%` },
          { label: "單檔最大曝險", value: `${exposure.maxSinglePositionPct}%` },
          { label: "Beta 曝險", value: exposure.marketBetaExposure },
          { label: "波動曝險", value: exposure.volatilityExposure }
        ]} />
      </SectionCard>

      <SectionCard title="手動新增持股">
        <div className="grid gap-3 md:grid-cols-4">
          <input className={inputClass} value={draft.symbol} onChange={(event) => setDraft({ ...draft, symbol: event.target.value })} placeholder="股票代號" />
          <input className={inputClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="股票名稱" />
          <input className={inputClass} type="number" value={draft.shares} onChange={(event) => setDraft({ ...draft, shares: Number(event.target.value) })} placeholder="股數" />
          <input className={inputClass} type="number" value={draft.averageCost} onChange={(event) => setDraft({ ...draft, averageCost: Number(event.target.value) })} placeholder="平均成本" />
          <input className={inputClass} type="number" value={draft.currentPrice} onChange={(event) => setDraft({ ...draft, currentPrice: Number(event.target.value) })} placeholder="目前價格" />
          <input className={inputClass} value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="題材標籤，以逗號分隔" />
          <input className={inputClass} value={draft.relatedEventId} placeholder="關聯事件 ID" onChange={(event) => setDraft({ ...draft, relatedEventId: event.target.value })} />
          <input className={inputClass} type="number" value={draft.stopLoss} onChange={(event) => setDraft({ ...draft, stopLoss: Number(event.target.value) })} placeholder="停損價" />
          <input className={inputClass} type="number" value={draft.takeProfit1} onChange={(event) => setDraft({ ...draft, takeProfit1: Number(event.target.value) })} placeholder="第一停利價" />
          <input className={inputClass} type="number" value={draft.takeProfit2} onChange={(event) => setDraft({ ...draft, takeProfit2: Number(event.target.value) })} placeholder="第二停利價" />
          <input className={`${inputClass} md:col-span-2`} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="備註" />
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={addPosition}>新增持股</button>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="曝險拆解">
          <div className="space-y-4 text-sm">
            <ExposureList title="題材曝險" data={exposure.themeExposure} localizeKey />
            <ExposureList title="策略曝險" data={exposure.strategyExposure} strategyKey />
            <ExposureList title="事件日曝險" data={exposure.eventDateExposure} />
            <ExposureList title="相關性群組曝險" data={exposure.correlationGroups} localizeKey />
          </div>
        </SectionCard>
        <SectionCard title="投組警示">
          <RiskAlertPanel alerts={exposure.alerts} />
        </SectionCard>
      </div>

      <SectionCard title="持股清單">
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-500">
              <tr>{["代號", "名稱", "股數 / 張數", "平均成本", "目前價格", "報價來源", "策略", "題材", "停損", "備註"].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {enrichedPortfolio.positions.map((position) => (
                <tr key={position.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold">{position.symbol}</td>
                  <td className="px-3 py-2">{position.name}</td>
                  <td className="px-3 py-2">{formatSharesLots(position.shares)}</td>
                  <td className="px-3 py-2">{position.averageCost}</td>
                  <td className="px-3 py-2">{position.currentPrice}</td>
                  <td className="px-3 py-2"><DataSourceBadge source={position.dataSource} /></td>
                  <td className="px-3 py-2">{formatStrategy(position.strategy)}</td>
                  <td className="px-3 py-2">{position.tags.map(localizeTheme).join(" / ")}</td>
                  <td className="px-3 py-2">{position.stopLoss ?? "未設定"}</td>
                  <td className="px-3 py-2">{position.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function ExposureList({ title, data, localizeKey, strategyKey }: { title: string; data: Record<string, number>; localizeKey?: boolean; strategyKey?: boolean }) {
  return (
    <div>
      <div className="mb-2 font-semibold text-slate-900">{title}</div>
      <div className="grid gap-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <span>{strategyKey ? formatStrategy(key as StrategyName) : localizeKey ? localizeTheme(key) : key}</span>
            <span className="font-semibold tabular-nums">{value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

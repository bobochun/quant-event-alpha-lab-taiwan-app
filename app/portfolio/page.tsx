"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzePortfolioExposure } from "../lib/alphaEngine";
import { mockPortfolio } from "../lib/mockData";
import { loadPortfolio, savePortfolio } from "../lib/storage";
import type { Portfolio, StrategyName } from "../lib/types";
import { MiniMetricGrid, RiskAlertPanel, SectionCard } from "../components/ui";
import { formatCurrencyNTD, formatSharesLots, formatStrategy, localizeTheme } from "../lib/utils";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
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
          sourceNote: "手動建立的本機持股。"
        },
        ...portfolio.positions
      ],
      updatedAt: new Date().toISOString(),
      dataSource: "Manual",
      sourceNote: "手動建立的本機投組。"
    };
    setPortfolio(next);
    savePortfolio(next);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">投組風控</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">投組風控</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">檢查單檔、題材、策略與事件是否過度集中。</p>
      </section>

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
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-500">
              <tr>{["代號", "名稱", "股數 / 張數", "平均成本", "目前價格", "策略", "題材", "停損", "備註"].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {portfolio.positions.map((position) => (
                <tr key={position.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold">{position.symbol}</td>
                  <td className="px-3 py-2">{position.name}</td>
                  <td className="px-3 py-2">{formatSharesLots(position.shares)}</td>
                  <td className="px-3 py-2">{position.averageCost}</td>
                  <td className="px-3 py-2">{position.currentPrice}</td>
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

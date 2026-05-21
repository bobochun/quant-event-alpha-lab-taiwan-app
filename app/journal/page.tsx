"use client";

import { useEffect, useState } from "react";
import { analyzeBehaviorRisk } from "../lib/alphaEngine";
import { mockJournal } from "../lib/mockData";
import { loadJournal, saveJournal } from "../lib/storage";
import type { JournalEntry } from "../lib/types";
import { MiniMetricGrid, SectionCard } from "../components/ui";
import { formatDateTW, formatStrategy } from "../lib/utils";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";
const emotionLabels: Record<JournalEntry["emotion"], string> = {
  calm: "冷靜",
  fomo: "FOMO",
  hesitant: "猶豫",
  revenge: "報復性交易",
  disciplined: "照計畫"
};

export default function JournalPage() {
  const [journal, setJournal] = useState<JournalEntry[]>(mockJournal);
  const [draft, setDraft] = useState({
    symbol: "2330",
    name: "台積電",
    price: 928,
    shares: 100,
    reason: "事件研究檢查",
    pnlPct: 0,
    wasEventPricedIn: false,
    didChaseNews: false,
    planFollowed: true,
    emotion: "disciplined" as JournalEntry["emotion"],
    mistakeType: "",
    review: ""
  });
  const analytics = analyzeBehaviorRisk(journal.length ? journal : mockJournal);

  useEffect(() => setJournal(loadJournal()), []);

  function addEntry() {
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      symbol: draft.symbol,
      name: draft.name,
      action: "review",
      strategy: "Manual Event Research",
      price: draft.price,
      shares: draft.shares,
      reason: draft.reason,
      eventThesis: draft.reason,
      wasEventPricedIn: draft.wasEventPricedIn,
      didChaseNews: draft.didChaseNews,
      planFollowed: draft.planFollowed,
      emotion: draft.emotion,
      mistakeType: draft.mistakeType || undefined,
      review: draft.review,
      pnlPct: draft.pnlPct,
      pnl: Math.round(draft.price * draft.shares * draft.pnlPct / 100),
      dataSource: "Manual",
      sourceNote: "手動建立的本機交易日誌。"
    };
    const next = [entry, ...journal];
    setJournal(next);
    saveJournal(next);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">交易日誌</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">交易日誌</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">記錄每次研究與交易決策，找出是策略問題，還是紀律問題。</p>
      </section>

      <SectionCard title="日誌統計與行為分析">
        <MiniMetricGrid items={[
          { label: "總紀錄數", value: analytics.totalTrades },
          { label: "勝率", value: `${analytics.winRate}%` },
          { label: "期望值", value: `${analytics.expectancy}%` },
          { label: "紀律分數", value: analytics.disciplineScore },
          { label: "行為分數", value: analytics.behaviorScore },
          { label: "Profit Factor", value: analytics.profitFactor },
          { label: "最佳策略", value: formatStrategy(analytics.bestStrategy) },
          { label: "最差策略", value: formatStrategy(analytics.worstStrategy) }
        ]} />
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
          <Insight label="是否常追事件新聞" value={analytics.warnings.some((warning) => warning.includes("chasing") || warning.includes("追")) ? "偏高" : "受控"} />
          <Insight label="是否常買在已反應後" value={analytics.warnings.some((warning) => warning.includes("priced-in") || warning.includes("反應")) ? "偏高" : "受控"} />
          <Insight label="最適合事件類型" value={analytics.bestEventType} />
          <Insight label="最容易虧損事件類型" value={analytics.worstEventType} />
          <Insight label="交易計畫紀律" value={analytics.disciplineScore >= 75 ? "尚可" : "需要改善"} />
        </div>
      </SectionCard>

      <SectionCard title="新增日誌">
        <div className="grid gap-3 md:grid-cols-6">
          <input className={inputClass} value={draft.symbol} onChange={(event) => setDraft({ ...draft, symbol: event.target.value })} placeholder="股票代號" />
          <input className={inputClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="股票名稱" />
          <input className={inputClass} type="number" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} placeholder="價格" />
          <input className={inputClass} type="number" value={draft.shares} onChange={(event) => setDraft({ ...draft, shares: Number(event.target.value) })} placeholder="股數" />
          <input className={`${inputClass} md:col-span-2`} value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} placeholder="理由 / 事件假設" />
          <input className={inputClass} type="number" value={draft.pnlPct} onChange={(event) => setDraft({ ...draft, pnlPct: Number(event.target.value) })} placeholder="損益 %" />
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={draft.wasEventPricedIn} onChange={(event) => setDraft({ ...draft, wasEventPricedIn: event.target.checked })} /> 是否已反應</label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={draft.didChaseNews} onChange={(event) => setDraft({ ...draft, didChaseNews: event.target.checked })} /> 是否追新聞</label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={draft.planFollowed} onChange={(event) => setDraft({ ...draft, planFollowed: event.target.checked })} /> 是否遵守計畫</label>
          <select className={inputClass} value={draft.emotion} onChange={(event) => setDraft({ ...draft, emotion: event.target.value as JournalEntry["emotion"] })}>
            {Object.entries(emotionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input className={inputClass} value={draft.mistakeType} placeholder="錯誤類型，例如追高 / 沒設停損" onChange={(event) => setDraft({ ...draft, mistakeType: event.target.value })} />
          <input className={`${inputClass} md:col-span-4`} value={draft.review} placeholder="檢討" onChange={(event) => setDraft({ ...draft, review: event.target.value })} />
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={addEntry}>儲存日誌</button>
        </div>
      </SectionCard>

      <SectionCard title="日誌紀錄">
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-500">
              <tr>{["日期", "股票", "動作", "策略", "是否已反應", "是否追新聞", "是否遵守計畫", "損益 %"].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {journal.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-100 text-slate-700">
                  <td className="px-3 py-2">{formatDateTW(entry.date)}</td>
                  <td className="px-3 py-2 font-semibold text-slate-950">{entry.symbol} / {entry.name}</td>
                  <td className="px-3 py-2">{entry.action}</td>
                  <td className="px-3 py-2">{formatStrategy(entry.strategy)}</td>
                  <td className="px-3 py-2">{entry.wasEventPricedIn ? "是" : "否"}</td>
                  <td className="px-3 py-2">{entry.didChaseNews ? "是" : "否"}</td>
                  <td className="px-3 py-2">{entry.planFollowed ? "是" : "否"}</td>
                  <td className="px-3 py-2">{entry.pnlPct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

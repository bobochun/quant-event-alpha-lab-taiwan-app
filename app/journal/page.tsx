"use client";

import { useEffect, useState } from "react";
import { analyzeBehaviorRisk } from "../lib/alphaEngine";
import { mockJournal } from "../lib/mockData";
import { loadJournal, saveJournal } from "../lib/storage";
import type { JournalEntry } from "../lib/types";
import { MiniMetricGrid, SectionCard } from "../components/ui";

export default function JournalPage() {
  const [journal, setJournal] = useState<JournalEntry[]>(mockJournal);
  const [draft, setDraft] = useState({
    symbol: "2330",
    name: "TSMC",
    price: 928,
    shares: 100,
    reason: "Event research review",
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
      sourceNote: "Manual local journal."
    };
    const next = [entry, ...journal];
    setJournal(next);
    saveJournal(next);
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Journal Analytics">
        <MiniMetricGrid items={[
          { label: "Trades", value: analytics.totalTrades },
          { label: "Win Rate", value: `${analytics.winRate}%` },
          { label: "Expectancy", value: `${analytics.expectancy}%` },
          { label: "Discipline", value: analytics.disciplineScore },
          { label: "Behavior", value: analytics.behaviorScore },
          { label: "Profit Factor", value: analytics.profitFactor },
          { label: "Best Strategy", value: analytics.bestStrategy },
          { label: "Worst Strategy", value: analytics.worstStrategy }
        ]} />
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
          <Insight label="Chasing event news" value={analytics.warnings.some((warning) => warning.includes("chasing")) ? "Elevated" : "Controlled"} />
          <Insight label="Buying after priced-in events" value={analytics.warnings.some((warning) => warning.includes("priced-in")) ? "Elevated" : "Controlled"} />
          <Insight label="Best event type" value={analytics.bestEventType} />
          <Insight label="Worst event type" value={analytics.worstEventType} />
          <Insight label="Plan discipline" value={analytics.disciplineScore >= 75 ? "Acceptable" : "Needs work"} />
        </div>
      </SectionCard>

      <SectionCard title="New Journal Entry">
        <div className="grid gap-3 md:grid-cols-6">
          <input className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200" value={draft.symbol} onChange={(event) => setDraft({ ...draft, symbol: event.target.value })} />
          <input className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <input className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200" type="number" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} />
          <input className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200" type="number" value={draft.shares} onChange={(event) => setDraft({ ...draft, shares: Number(event.target.value) })} />
          <input className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200 md:col-span-2" value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} />
          <input className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200" type="number" value={draft.pnlPct} onChange={(event) => setDraft({ ...draft, pnlPct: Number(event.target.value) })} />
          <label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" checked={draft.wasEventPricedIn} onChange={(event) => setDraft({ ...draft, wasEventPricedIn: event.target.checked })} /> Event priced in</label>
          <label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" checked={draft.didChaseNews} onChange={(event) => setDraft({ ...draft, didChaseNews: event.target.checked })} /> Chased news</label>
          <label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" checked={draft.planFollowed} onChange={(event) => setDraft({ ...draft, planFollowed: event.target.checked })} /> Plan followed</label>
          <select className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200" value={draft.emotion} onChange={(event) => setDraft({ ...draft, emotion: event.target.value as JournalEntry["emotion"] })}>
            {["calm", "fomo", "hesitant", "revenge", "disciplined"].map((emotion) => <option key={emotion} value={emotion}>{emotion}</option>)}
          </select>
          <input className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200" value={draft.mistakeType} placeholder="Mistake type" onChange={(event) => setDraft({ ...draft, mistakeType: event.target.value })} />
          <input className="rounded-md border border-slate-800 bg-[#07101a] p-2 text-slate-200 md:col-span-4" value={draft.review} placeholder="Post-trade review" onChange={(event) => setDraft({ ...draft, review: event.target.value })} />
          <button className="rounded-md bg-emerald-400 px-3 py-2 font-semibold text-slate-950" onClick={addEntry}>Save Journal</button>
        </div>
      </SectionCard>

      <SectionCard title="Journal Records">
        <div className="table-scroll border border-slate-800 bg-[#08101a]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-500">
              <tr>{["Date", "Symbol", "Action", "Strategy", "Priced In", "Chase", "Plan", "PnL%"].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {journal.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-800 text-slate-300">
                  <td className="px-3 py-2">{entry.date}</td>
                  <td className="px-3 py-2 font-semibold text-white">{entry.symbol}</td>
                  <td className="px-3 py-2">{entry.action}</td>
                  <td className="px-3 py-2">{entry.strategy}</td>
                  <td className="px-3 py-2">{entry.wasEventPricedIn ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">{entry.didChaseNews ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">{entry.planFollowed ? "Yes" : "No"}</td>
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
    <div className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

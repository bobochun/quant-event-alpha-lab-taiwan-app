"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildAlphaEngineResults } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { CatalystTable, SectionCard } from "../components/ui";
import type { Event, EventType } from "../lib/types";
import { addDays, EVENT_TYPE_LABELS, localizeTheme } from "../lib/utils";
import { loadEvents, loadJournal, loadTradePlans, saveEvents, saveJournal } from "../lib/storage";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function EventRadarPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [plannedEventIds, setPlannedEventIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState({
    symbol: "2382",
    name: "廣達",
    eventType: "monthlyRevenue" as EventType,
    eventTitle: "AI 伺服器出貨與月營收檢查",
    eventDate: addDays(3),
    confidence: 60,
    expectedImpact: 65,
    marketAwareness: 40,
    relatedThemes: "AI server"
  });
  const [windowDays, setWindowDays] = useState(7);
  const [eventType, setEventType] = useState<EventType | "all">("all");
  const [theme, setTheme] = useState("all");
  const [minCatalyst, setMinCatalyst] = useState(0);
  const [minAlpha, setMinAlpha] = useState(0);
  const [hideOverheated, setHideOverheated] = useState(false);
  const [hideLowConfidence, setHideLowConfidence] = useState(false);
  const [onlyNoPlan, setOnlyNoPlan] = useState(false);
  const [sortBy, setSortBy] = useState<"alpha" | "catalyst" | "days">("alpha");

  useEffect(() => {
    setEvents(loadEvents());
    setPlannedEventIds(new Set(loadTradePlans().map((plan) => plan.relatedEventId).filter((id): id is string => Boolean(id))));
  }, []);

  const eventTypes = Array.from(new Set([...mockEvents, ...events].map((event) => event.eventType)));
  const themes = Array.from(new Set(events.flatMap((event) => event.relatedThemes)));
  const rows = useMemo(
    () =>
      buildAlphaEngineResults(events, mockStocks, mockThemes)
        .filter((row) => row.daysToEvent >= 0 && row.daysToEvent <= windowDays)
        .filter((row) => !row.event.ignoredUntil || row.event.ignoredUntil < new Date().toISOString().slice(0, 10))
        .filter((row) => eventType === "all" || row.event.eventType === eventType)
        .filter((row) => theme === "all" || row.event.relatedThemes.includes(theme))
        .filter((row) => row.catalyst.totalCatalystScore >= minCatalyst)
        .filter((row) => row.alpha.combinedAlphaScore >= minAlpha)
        .filter((row) => !hideOverheated || (!row.event.flaggedOverheated && row.overheatRisk !== "high" && row.overheatRisk !== "critical"))
        .filter((row) => !hideLowConfidence || row.event.confidence >= 50)
        .filter((row) => !onlyNoPlan || !plannedEventIds.has(row.event.id))
        .sort((a, b) => (sortBy === "alpha" ? b.alpha.combinedAlphaScore - a.alpha.combinedAlphaScore : sortBy === "catalyst" ? b.catalyst.totalCatalystScore - a.catalyst.totalCatalystScore : a.daysToEvent - b.daysToEvent)),
    [eventType, events, hideLowConfidence, hideOverheated, minAlpha, minCatalyst, onlyNoPlan, plannedEventIds, sortBy, theme, windowDays]
  );

  function patchEvent(id: string, patch: Partial<Event>) {
    const next = events.map((event) => (event.id === id ? { ...event, ...patch, updatedAt: new Date().toISOString() } : event));
    setEvents(next);
    saveEvents(next);
  }

  function addEvent() {
    const now = new Date().toISOString();
    const next: Event[] = [
      {
        id: `manual-event-${Date.now()}`,
        symbol: draft.symbol,
        name: draft.name,
        eventType: draft.eventType,
        eventTitle: draft.eventTitle,
        eventDate: draft.eventDate,
        eventTime: "14:30",
        source: "手動輸入",
        sourceUrl: "",
        dataSource: "Manual",
        sourceNote: "手動建立事件，進入實際研究前請補上來源與可信度說明。",
        confidence: draft.confidence,
        expectedImpact: draft.expectedImpact,
        marketAwareness: draft.marketAwareness,
        relatedThemes: draft.relatedThemes.split(",").map((item) => item.trim()).filter(Boolean),
        createdAt: now,
        updatedAt: now
      },
      ...events
    ];
    setEvents(next);
    saveEvents(next);
  }

  function addJournalNote(id: string) {
    const event = events.find((item) => item.id === id);
    if (!event) return;
    const journal = loadJournal();
    saveJournal([
      {
        id: `journal-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        symbol: event.symbol,
        name: event.name,
        action: "review",
        strategy: "Manual Event Research",
        relatedEventId: event.id,
        eventType: event.eventType,
        price: 0,
        shares: 0,
        reason: `事件雷達筆記：${event.eventTitle}`,
        eventThesis: "補上事件假設、失效條件與風險報酬比後，才能列入研究計畫。",
        wasEventPricedIn: false,
        didChaseNews: false,
        planFollowed: true,
        emotion: "disciplined",
        dataSource: "Manual",
        sourceNote: "由事件催化雷達建立的手動日誌。"
      },
      ...journal
    ]);
    patchEvent(id, { reviewed: true });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">事件催化雷達</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">事件催化雷達</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          追蹤未來 7 / 14 / 30 天可能影響資金注意力的事件，並判斷是否已經反應或過熱。
        </p>
      </section>

      <SectionCard title="篩選條件">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="grid gap-1 text-xs text-slate-500">事件期間
            <select className={inputClass} value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))}>
              {[7, 14, 30].map((day) => <option key={day} value={day}>{day} 天</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">事件類型
            <select className={inputClass} value={eventType} onChange={(event) => setEventType(event.target.value as EventType | "all")}>
              <option value="all">全部事件類型</option>
              {eventTypes.map((type) => <option key={type} value={type}>{EVENT_TYPE_LABELS[type] ?? type}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">題材
            <select className={inputClass} value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="all">全部題材</option>
              {themes.map((item) => <option key={item} value={item}>{localizeTheme(item)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">排序
            <select className={inputClass} value={sortBy} onChange={(event) => setSortBy(event.target.value as "alpha" | "catalyst" | "days")}>
              <option value="alpha">綜合 Alpha 分數</option>
              <option value="catalyst">催化分數</option>
              <option value="days">距事件日</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">最低催化分數
            <input className={inputClass} type="number" min={0} max={100} value={minCatalyst} onChange={(event) => setMinCatalyst(Number(event.target.value))} />
          </label>
          <label className="grid gap-1 text-xs text-slate-500">最低 Alpha 分數
            <input className={inputClass} type="number" min={0} max={100} value={minAlpha} onChange={(event) => setMinAlpha(Number(event.target.value))} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={hideOverheated} onChange={(event) => setHideOverheated(event.target.checked)} /> 隱藏過熱標的</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={hideLowConfidence} onChange={(event) => setHideLowConfidence(event.target.checked)} /> 隱藏低可信度資料</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={onlyNoPlan} onChange={(event) => setOnlyNoPlan(event.target.checked)} /> 只看尚未建立交易計畫</label>
        </div>
      </SectionCard>

      <SectionCard title="新增手動事件">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <input className={inputClass} value={draft.symbol} onChange={(event) => setDraft({ ...draft, symbol: event.target.value })} placeholder="股票代號" />
          <input className={inputClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="股票名稱" />
          <select className={inputClass} value={draft.eventType} onChange={(event) => setDraft({ ...draft, eventType: event.target.value as EventType })}>
            {eventTypes.map((type) => <option key={type} value={type}>{EVENT_TYPE_LABELS[type] ?? type}</option>)}
          </select>
          <input className={inputClass} type="date" value={draft.eventDate} onChange={(event) => setDraft({ ...draft, eventDate: event.target.value })} />
          <input className={`${inputClass} xl:col-span-2`} value={draft.eventTitle} onChange={(event) => setDraft({ ...draft, eventTitle: event.target.value })} placeholder="事件標題" />
          <input className={inputClass} value={draft.relatedThemes} onChange={(event) => setDraft({ ...draft, relatedThemes: event.target.value })} placeholder="題材，以逗號分隔" />
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={addEvent}>新增事件</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">手動事件只會存在本機瀏覽器。進入實際研究前，請補上來源與可信度說明。</p>
      </SectionCard>

      <SectionCard title="未來事件清單">
        <CatalystTable
          rows={rows}
          actions={(row) => (
            <div className="flex min-w-80 flex-wrap gap-2 text-xs">
              <Link className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800" href={`/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}`}>建立交易計畫</Link>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => addJournalNote(row.event.id)}>加入日誌</button>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => patchEvent(row.event.id, { reviewed: true })}>標記已檢查</button>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => patchEvent(row.event.id, { ignoredUntil: addDays(7) })}>7 天內忽略</button>
              <button className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800" onClick={() => patchEvent(row.event.id, { flaggedOverheated: true })}>標記過熱</button>
            </div>
          )}
        />
      </SectionCard>
    </div>
  );
}

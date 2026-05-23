"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataSourceBadge, EventTypeBadge, RiskBadge, SectionCard, WarningList } from "../components/ui";
import { fetchBackendEvents } from "../lib/backendEventsApi";
import type { Event, RiskLevel } from "../lib/types";
import { formatDateTW } from "../lib/utils";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function EventCalendarPage() {
  const [symbolsText, setSymbolsText] = useState("2330,2382,2317,2308,3017,3037,3231,2603,2615,2454");
  const [days, setDays] = useState(30);
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState("事件行事曆會把未來事件依日期分組，幫你檢查同一天事件曝險、題材集中與事件前提醒。 ");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadEvents() {
    setLoading(true);
    setMessage("正在載入後端事件行事曆...");
    try {
      const payload = await fetchBackendEvents({ days, symbols: split(symbolsText) });
      setEvents(payload.events);
      setWarnings(payload.error ? [payload.error] : []);
      setMessage(`已載入未來 ${days} 天 ${payload.events.length} 筆事件；來源：${payload.dataSource}。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "Event calendar failed"]);
      setMessage("事件行事曆載入失敗，請確認 backend 已啟動。 ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => groupByDate(events), [events]);
  const riskSummary = useMemo(() => summarizeRisk(events), [events]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">EVENT CALENDAR MVP</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">事件行事曆</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">以日期分組查看法說會、月營收、除權息、ETF 調整、注意 / 處置等事件，並檢查同一天與同題材事件曝險。</p>
      </section>

      <SectionCard title="行事曆設定">
        <div className="grid gap-3 lg:grid-cols-[1fr_120px_auto] lg:items-end">
          <label className="grid gap-1 text-xs text-slate-500">股票池<input className={inputClass} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} /></label>
          <label className="grid gap-1 text-xs text-slate-500">天數<select className={inputClass} value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 天</option><option value={14}>14 天</option><option value={30}>30 天</option><option value={60}>60 天</option></select></label>
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void loadEvents()} disabled={loading}>{loading ? "載入中..." : "重新載入事件"}</button>
        </div>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-4">
        <CalendarMetric title="事件總數" value={`${events.length}`} helper={`未來 ${days} 天`} />
        <CalendarMetric title="高集中日期" value={`${riskSummary.crowdedDays}`} helper="同一天 ≥ 3 筆事件" />
        <CalendarMetric title="低信心事件" value={`${riskSummary.lowConfidence}`} helper="confidence < 60" />
        <CalendarMetric title="高知曉度事件" value={`${riskSummary.highAwareness}`} helper="可能已反應" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="日期分組事件">
          <div className="space-y-3">
            {grouped.length ? grouped.map((group) => <DayGroup key={group.date} date={group.date} events={group.events} />) : <p className="text-sm text-slate-500">尚無事件資料。</p>}
          </div>
        </SectionCard>

        <SectionCard title="事件曝險提醒">
          <div className="space-y-3">
            {buildAlerts(grouped, events).map((alert) => <div key={alert.message} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"><div className="flex items-center gap-2"><RiskBadge level={alert.level} /><span className="font-semibold text-slate-950">{alert.title}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{alert.message}</p></div>)}
          </div>
          <WarningList warnings={warnings} />
        </SectionCard>
      </div>
    </div>
  );
}

function DayGroup({ date, events }: { date: string; events: Event[] }) {
  const riskLevel = events.length >= 4 ? "high" : events.length >= 2 ? "medium" : "low";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div><div className="font-semibold text-slate-950">{formatDateTW(date)}</div><div className="text-xs text-slate-500">{events.length} 筆事件</div></div>
        <RiskBadge level={riskLevel} />
      </div>
      <div className="mt-3 space-y-2">
        {events.map((event) => <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-950">{event.symbol}</span><span className="text-sm text-slate-500">{event.name}</span><EventTypeBadge type={event.eventType} /><DataSourceBadge source={event.dataSource} /></div>
          <div className="mt-2 text-sm text-slate-700">{event.eventTitle}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">{event.relatedThemes.map((theme) => <span key={theme} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">{theme}</span>)}</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs"><Link className="rounded border border-cyan-300 bg-cyan-50 px-2 py-1 text-cyan-800" href={`/market?symbol=${event.symbol}`}>K 線</Link><Link className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800" href={`/trade-plan?symbol=${event.symbol}&event=${event.id}`}>交易計畫</Link><Link className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-slate-700" href={`/event-study?symbol=${event.symbol}`}>事件研究</Link></div>
        </div>)}
      </div>
    </div>
  );
}

function groupByDate(events: Event[]): Array<{ date: string; events: Event[] }> {
  const map = new Map<string, Event[]>();
  events.forEach((event) => { const key = event.eventDate.slice(0, 10); map.set(key, [...(map.get(key) ?? []), event]); });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({ date, events: rows.sort((a, b) => a.symbol.localeCompare(b.symbol)) }));
}

function summarizeRisk(events: Event[]) { return { crowdedDays: groupByDate(events).filter((group) => group.events.length >= 3).length, lowConfidence: events.filter((event) => event.confidence < 60).length, highAwareness: events.filter((event) => event.marketAwareness >= 75).length }; }
function buildAlerts(groups: Array<{ date: string; events: Event[] }>, events: Event[]) { const alerts: Array<{ title: string; message: string; level: RiskLevel }> = []; const crowded = groups.filter((group) => group.events.length >= 3); if (crowded.length) alerts.push({ title: "同日事件集中", message: `${crowded.map((group) => formatDateTW(group.date)).join("、")} 同一天事件較多，需檢查投組是否集中在同一天催化。`, level: "high" }); const lowConfidence = events.filter((event) => event.confidence < 60); if (lowConfidence.length) alerts.push({ title: "資料可信度偏低", message: `${lowConfidence.length} 筆事件 confidence < 60，僅列入觀察，不宜直接納入交易計畫。`, level: "medium" }); const highAwareness = events.filter((event) => event.marketAwareness >= 75); if (highAwareness.length) alerts.push({ title: "可能已反應", message: `${highAwareness.length} 筆事件市場知曉度偏高，需搭配 K 線與 overheat engine 避免追高。`, level: "medium" }); if (!alerts.length) alerts.push({ title: "目前無高度集中警示", message: "仍需逐檔檢查資料來源、事件可信度、技術位置與部位大小。", level: "low" }); return alerts; }
function split(value: string): string[] { return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean); }
function CalendarMetric({ title, value, helper }: { title: string; value: string; helper: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs text-slate-500">{title}</div><div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div><div className="mt-1 text-xs text-slate-500">{helper}</div></div>; }

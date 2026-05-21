"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildAlphaEngineResults } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { DataSourceBadge, EventTypeBadge, RiskBadge, ScoreBadge, SectionCard, ThemeBadge, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import type { DataSource, Event, EventType, AlphaEngineResult } from "../lib/types";
import { addDays, EVENT_TYPE_LABELS, formatDateTW, formatNextAction, formatRiskLevel, localizeTheme } from "../lib/utils";
import { loadEvents, loadJournal, loadTradePlans, saveEvents, saveJournal } from "../lib/storage";
import { flagEventOverheated, ignoreEventUntil, loadActionState, markEventReviewed, markJournalLinked, type ActionState } from "../lib/actionState";
import { loadImportedDataset, mergeDemoImportedManualEvents, mergeStocksWithImported } from "../lib/importers";
import { explainAlphaRow } from "../lib/explanations";
import { saveSelectedEvent } from "../lib/navigationState";

type EventRow = AlphaEngineResult & { id: string };
type SourceFilter = "all" | DataSource;
type DataMode = "merged" | "imported" | "demo";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function EventRadarPage() {
  const [manualEvents, setManualEvents] = useState<Event[]>(mockEvents);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [selected, setSelected] = useState<EventRow | null>(null);
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
  const [source, setSource] = useState<SourceFilter>("all");
  const [dataMode, setDataMode] = useState<DataMode>("merged");
  const [minCatalyst, setMinCatalyst] = useState(0);
  const [minAlpha, setMinAlpha] = useState(0);
  const [hideOverheated, setHideOverheated] = useState(false);
  const [hideLowConfidence, setHideLowConfidence] = useState(false);
  const [onlyNoPlan, setOnlyNoPlan] = useState(false);

  useEffect(() => {
    setManualEvents(loadEvents());
    setActionState(loadActionState());
  }, []);

  const imported = loadImportedDataset();
  const plans = loadTradePlans();
  const plannedEventIds = new Set([...plans.map((plan) => plan.relatedEventId).filter((id): id is string => Boolean(id)), ...(actionState?.createdTradePlanEventIds ?? [])]);
  const manualOnly = manualEvents.filter((event) => event.dataSource === "Manual");
  const effectiveEvents = dataMode === "demo"
    ? mockEvents
    : dataMode === "imported"
      ? imported.events
      : mergeDemoImportedManualEvents(mockEvents, imported.events, manualOnly);
  const effectiveStocks = mergeStocksWithImported(mockStocks, imported.stocks);
  const eventTypes = Array.from(new Set([...mockEvents, ...effectiveEvents].map((event) => event.eventType)));
  const themes = Array.from(new Set(effectiveEvents.flatMap((event) => event.relatedThemes)));

  const today = new Date().toISOString().slice(0, 10);
  const rows: EventRow[] = buildAlphaEngineResults(effectiveEvents, effectiveStocks, mockThemes)
    .filter((row) => row.daysToEvent >= 0 && row.daysToEvent <= windowDays)
    .filter((row) => !actionState?.ignoredUntil[row.event.id] || actionState.ignoredUntil[row.event.id] < today)
    .filter((row) => eventType === "all" || row.event.eventType === eventType)
    .filter((row) => theme === "all" || row.event.relatedThemes.includes(theme))
    .filter((row) => source === "all" || row.event.dataSource === source)
    .filter((row) => row.catalyst.totalCatalystScore >= minCatalyst)
    .filter((row) => row.alpha.combinedAlphaScore >= minAlpha)
    .filter((row) => !hideOverheated || (!actionState?.flaggedOverheated.includes(row.event.id) && row.overheatRisk !== "high" && row.overheatRisk !== "critical"))
    .filter((row) => !hideLowConfidence || row.event.confidence >= 50)
    .filter((row) => !onlyNoPlan || !plannedEventIds.has(row.event.id))
    .sort((a, b) => b.alpha.combinedAlphaScore - a.alpha.combinedAlphaScore)
    .map((row) => ({ ...row, id: row.event.id }));

  function syncAction(next: ActionState) {
    setActionState(next);
  }

  function patchEvent(id: string, patch: Partial<Event>) {
    const next = manualEvents.map((event) => (event.id === id ? { ...event, ...patch, updatedAt: new Date().toISOString() } : event));
    setManualEvents(next);
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
      ...manualOnly
    ];
    setManualEvents(next);
    saveEvents(next);
  }

  function addJournalNote(row: EventRow) {
    const journal = loadJournal();
    saveJournal([
      {
        id: `journal-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        symbol: row.event.symbol,
        name: row.event.name,
        action: "review",
        strategy: "Manual Event Research",
        relatedEventId: row.event.id,
        eventType: row.event.eventType,
        price: row.stock?.price ?? 0,
        shares: 0,
        reason: `事件雷達筆記：${row.event.eventTitle}`,
        eventThesis: "補上事件假設、失效條件與風險報酬比後，才能列入研究計畫。",
        wasEventPricedIn: row.pricedInRisk === "high" || row.pricedInRisk === "critical",
        didChaseNews: false,
        planFollowed: true,
        emotion: "disciplined",
        dataSource: "Manual",
        sourceNote: "由事件催化雷達建立的手動日誌。"
      },
      ...journal
    ]);
    patchEvent(row.event.id, { reviewed: true });
    syncAction(markJournalLinked(row.event.id));
  }

  function rememberSelected(row: EventRow) {
    saveSelectedEvent({
      event: row.event,
      catalystScore: row.catalyst.totalCatalystScore,
      combinedAlphaScore: row.alpha.combinedAlphaScore,
      nextAction: formatNextAction(row.alpha.nextAction)
    });
  }

  const columns: Array<DataTableColumn<EventRow>> = [
    { key: "days", header: "距事件日", accessor: (row) => `${row.daysToEvent} 天`, sortValue: (row) => row.daysToEvent },
    { key: "date", header: "事件日期", accessor: (row) => formatDateTW(row.event.eventDate), sortValue: (row) => row.event.eventDate },
    { key: "symbol", header: "代號", accessor: (row) => <button className="font-semibold text-slate-950" onClick={() => setSelected(row)}>{row.event.symbol}</button>, searchValue: (row) => row.event.symbol },
    { key: "name", header: "名稱", accessor: (row) => row.event.name, searchValue: (row) => row.event.name },
    { key: "type", header: "事件類型", accessor: (row) => <EventTypeBadge type={row.event.eventType} />, searchValue: (row) => EVENT_TYPE_LABELS[row.event.eventType] },
    { key: "title", header: "事件標題", accessor: (row) => <span className="block max-w-72 truncate" title={row.event.eventTitle}>{row.event.eventTitle}</span>, searchValue: (row) => row.event.eventTitle },
    { key: "catalyst", header: "催化", accessor: (row) => <ScoreBadge score={row.catalyst.totalCatalystScore} />, sortValue: (row) => row.catalyst.totalCatalystScore },
    { key: "alpha", header: "Alpha", accessor: (row) => <ScoreBadge score={row.alpha.combinedAlphaScore} />, sortValue: (row) => row.alpha.combinedAlphaScore },
    { key: "priced", header: "已反應", accessor: (row) => <RiskBadge level={row.pricedInRisk} />, sortValue: (row) => riskSort(row.pricedInRisk) },
    { key: "action", header: "下一步", accessor: (row) => formatNextAction(row.alpha.nextAction), searchValue: (row) => formatNextAction(row.alpha.nextAction) },
    { key: "source", header: "來源", accessor: (row) => <DataSourceBadge source={row.event.dataSource} />, searchValue: (row) => row.event.dataSource }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">事件催化雷達</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">事件催化雷達</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">追蹤未來 7 / 14 / 30 天可能影響資金注意力的事件，並判斷是否已經反應或過熱。</p>
      </section>

      <SectionCard title="篩選條件">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select label="資料模式" value={dataMode} onChange={(value) => setDataMode(value as DataMode)} options={[["merged", "合併示範 + 匯入 + 手動"], ["imported", "只看匯入資料"], ["demo", "只看示範資料"]]} />
          <Select label="事件期間" value={String(windowDays)} onChange={(value) => setWindowDays(Number(value))} options={[["7", "7 天"], ["14", "14 天"], ["30", "30 天"]]} />
          <Select label="事件類型" value={eventType} onChange={(value) => setEventType(value as EventType | "all")} options={[["all", "全部事件類型"], ...eventTypes.map((type) => [type, EVENT_TYPE_LABELS[type] ?? type] as [string, string])]} />
          <Select label="題材" value={theme} onChange={setTheme} options={[["all", "全部題材"], ...themes.map((item) => [item, localizeTheme(item)] as [string, string])]} />
          <Select label="資料來源" value={source} onChange={(value) => setSource(value as SourceFilter)} options={[["all", "全部"], ["Demo", "示範"], ["Imported", "匯入"], ["Manual", "手動"]]} />
          <label className="grid gap-1 text-xs text-slate-500">最低催化分數<input className={inputClass} type="number" min={0} max={100} value={minCatalyst} onChange={(event) => setMinCatalyst(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-xs text-slate-500">最低 Alpha 分數<input className={inputClass} type="number" min={0} max={100} value={minAlpha} onChange={(event) => setMinAlpha(Number(event.target.value))} /></label>
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
          <select className={inputClass} value={draft.eventType} onChange={(event) => setDraft({ ...draft, eventType: event.target.value as EventType })}>{eventTypes.map((type) => <option key={type} value={type}>{EVENT_TYPE_LABELS[type] ?? type}</option>)}</select>
          <input className={inputClass} type="date" value={draft.eventDate} onChange={(event) => setDraft({ ...draft, eventDate: event.target.value })} />
          <input className={`${inputClass} xl:col-span-2`} value={draft.eventTitle} onChange={(event) => setDraft({ ...draft, eventTitle: event.target.value })} placeholder="事件標題" />
          <input className={inputClass} value={draft.relatedThemes} onChange={(event) => setDraft({ ...draft, relatedThemes: event.target.value })} placeholder="題材，以逗號分隔" />
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={addEvent}>新增事件</button>
        </div>
      </SectionCard>

      <SectionCard title="未來事件清單">
        <DataTable
          rows={rows}
          columns={columns}
          emptyMessage="目前沒有符合篩選條件的事件。"
          renderExpanded={(row) => <ScoreDetails row={row} actionState={actionState} />}
          primaryAction={(row) => (
            <div className="flex min-w-80 flex-wrap gap-2 text-xs">
              <Link className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800" href={`/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}&from=event-radar`} onClick={() => rememberSelected(row)}>建立交易計畫</Link>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => setSelected(row)}>研究詳情</button>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => addJournalNote(row)}>{actionState?.journalLinkedEventIds.includes(row.event.id) ? "已有日誌" : "加入日誌"}</button>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => syncAction(markEventReviewed(row.event.id))}>{actionState?.reviewedEventIds.includes(row.event.id) ? "已檢查" : "標記已檢查"}</button>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => syncAction(ignoreEventUntil(row.event.id, addDays(7)))}>7 天內忽略</button>
              <button className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800" onClick={() => syncAction(flagEventOverheated(row.event.id))}>{actionState?.flaggedOverheated.includes(row.event.id) ? "使用者標記過熱" : "標記過熱"}</button>
            </div>
          )}
        />
      </SectionCard>

      {selected ? <ResearchDrawer row={selected} actionState={actionState} onClose={() => setSelected(null)} onJournal={() => addJournalNote(selected)} onSelectPlan={() => rememberSelected(selected)} /> : null}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs text-slate-500">{label}<select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}

function ScoreDetails({ row, actionState }: { row: EventRow; actionState: ActionState | null }) {
  const finalAction = formatNextAction(row.alpha.nextAction);
  const userFlagged = actionState?.flaggedOverheated.includes(row.event.id);
  return (
    <div className="grid gap-3 text-sm lg:grid-cols-3">
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-950">一行摘要</div>
        <p className="mt-2 text-slate-600">{row.event.symbol} / {row.event.name}：催化 {Math.round(row.catalyst.totalCatalystScore)}，Alpha {Math.round(row.alpha.combinedAlphaScore)}，下一步：{finalAction}。</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-950">主要加分項</div>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>事件重要性：{Math.round(row.catalyst.eventImportanceScore)}</li>
          <li>題材熱度：{Math.round(row.catalyst.themeHeatScore)}</li>
          <li>籌碼確認：{Math.round(row.alpha.flowConfirmationScore)}</li>
        </ul>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-950">扣分與下一步</div>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>已反應風險：{formatRiskLevel(row.pricedInRisk)}</li>
          <li>過熱風險：{userFlagged ? "使用者標記過熱" : formatRiskLevel(row.overheatRisk)}</li>
          <li>下一步原因：{row.pricedInRisk === "high" || row.pricedInRisk === "critical" ? "催化強但已反應風險偏高，可建立觀察計畫但不追價。" : "先以交易計畫檢查風險報酬比。"}</li>
        </ul>
      </div>
    </div>
  );
}

function ResearchDrawer({ row, actionState, onClose, onJournal, onSelectPlan }: { row: EventRow; actionState: ActionState | null; onClose: () => void; onJournal: () => void; onSelectPlan: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30">
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">研究詳情</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{row.event.symbol} / {row.event.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{row.event.eventTitle}</p>
          </div>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={onClose}>關閉</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Metric label="事件日期" value={formatDateTW(row.event.eventDate)} />
          <Metric label="下一步" value={formatNextAction(row.alpha.nextAction)} />
          <Metric label="催化分數" value={Math.round(row.catalyst.totalCatalystScore)} />
          <Metric label="綜合 Alpha" value={Math.round(row.alpha.combinedAlphaScore)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{row.event.relatedThemes.map((theme) => <ThemeBadge key={theme} label={theme} />)}<DataSourceBadge source={row.event.dataSource} /></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SectionCard title="已反應 / 過熱風險">
            <div className="flex gap-2"><RiskBadge level={row.pricedInRisk} /><RiskBadge level={actionState?.flaggedOverheated.includes(row.event.id) ? "high" : row.overheatRisk} /></div>
            {actionState?.flaggedOverheated.includes(row.event.id) ? <p className="mt-2 text-xs text-amber-700">使用者已標記過熱。</p> : null}
          </SectionCard>
          <SectionCard title="資料來源">
            <p className="text-sm text-slate-600">{row.event.sourceNote}</p>
          </SectionCard>
        </div>
        <SectionCard title="分數拆解">
          <p className="text-sm leading-6 text-slate-600">{explainAlphaRow(row)}</p>
          <div className="mt-3"><WarningList warnings={[...row.catalyst.warnings, ...row.alpha.warnings]} /></div>
        </SectionCard>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href={`/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}&from=event-radar`} onClick={onSelectPlan}>建立交易計畫</Link>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={onJournal}>加入日誌</button>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-950">{value}</div></div>;
}

function riskSort(level: string): number {
  return ({ low: 0, medium: 1, high: 2, critical: 3 } as Record<string, number>)[level] ?? 0;
}

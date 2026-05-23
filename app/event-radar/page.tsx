"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataSourceBadge, EventTypeBadge, RiskBadge, ScoreBadge, SectionCard, ThemeBadge, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { flagEventOverheated, ignoreEventUntil, loadActionState, markEventReviewed, markJournalLinked, type ActionState } from "../lib/actionState";
import { fetchBackendEvents } from "../lib/backendEventsApi";
import { fetchBackendPriceSnapshots } from "../lib/backendMarketSnapshots";
import { explainAlphaRow } from "../lib/explanations";
import { loadImportedDataset } from "../lib/importers";
import { fetchMarketWarnings, type MarketWarningItem } from "../lib/marketApi";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { saveSelectedEvent } from "../lib/navigationState";
import { recomputeEventScores } from "../lib/recomputeScores";
import { loadEvents, loadJournal, loadSettings, loadTradePlans, saveJournal } from "../lib/storage";
import type { AlphaEngineResult, DataSource, Event, EventType, InstitutionalFlowRecord, MarketWarningRecord, PriceSnapshot } from "../lib/types";
import { EVENT_TYPE_LABELS, addDays, formatDateTW, formatNextAction, localizeTheme } from "../lib/utils";

type EventRow = AlphaEngineResult & { id: string };
type SourceFilter = "all" | DataSource;
type DataMode = "hybrid" | "realOnly" | "demo";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function EventRadarPage() {
  const [manualEvents, setManualEvents] = useState<Event[]>([]);
  const [backendEvents, setBackendEvents] = useState<Event[]>([]);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [backendPrice, setBackendPrice] = useState<PriceSnapshot[]>([]);
  const [backendWarnings, setBackendWarnings] = useState<MarketWarningItem[]>([]);
  const [officialPrice, setOfficialPrice] = useState<PriceSnapshot[]>([]);
  const [officialFlow, setOfficialFlow] = useState<InstitutionalFlowRecord[]>([]);
  const [officialWarnings, setOfficialWarnings] = useState<MarketWarningRecord[]>([]);
  const [officialMessage, setOfficialMessage] = useState("正在嘗試由後端事件 API、行情 API 與官方警示 API 取得資料；缺資料時才使用匯入 / 手動 / Demo fallback。");
  const [windowDays, setWindowDays] = useState(7);
  const [eventType, setEventType] = useState<EventType | "all">("all");
  const [theme, setTheme] = useState("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [dataMode, setDataMode] = useState<DataMode>("hybrid");
  const [minCatalyst, setMinCatalyst] = useState(0);
  const [minAlpha, setMinAlpha] = useState(0);
  const [hideOverheated, setHideOverheated] = useState(false);
  const [hideLowConfidence, setHideLowConfidence] = useState(false);
  const [onlyNoPlan, setOnlyNoPlan] = useState(false);

  async function loadOfficialData() {
    try {
      const [priceResponse, flowResponse, warningResponse] = await Promise.all([
        fetch("/api/price-snapshot"),
        fetch("/api/institutional-flow"),
        fetch("/api/market-warnings")
      ]);
      const [priceBody, flowBody, warningBody] = await Promise.all([priceResponse.json(), flowResponse.json(), warningResponse.json()]);
      setOfficialPrice((priceBody.data?.records ?? []).filter((item: PriceSnapshot) => item.dataSource === "Official"));
      setOfficialFlow((flowBody.data?.records ?? []) as InstitutionalFlowRecord[]);
      setOfficialWarnings((warningBody.data?.records ?? []) as MarketWarningRecord[]);
    } catch {
      setOfficialMessage("官方 Next.js route 讀取失敗；仍會優先嘗試後端事件 / 行情 / 警示 API，再 fallback。 ");
    }
  }

  useEffect(() => {
    const storedEvents = loadEvents();
    setManualEvents(storedEvents.filter((event) => event.dataSource === "Manual"));
    setActionState(loadActionState());
    const settings = loadSettings();
    setDataMode(settings.dataMode === "DemoOnly" ? "demo" : settings.dataMode === "RealImportedOnly" ? "realOnly" : "hybrid");
    void loadOfficialData();
    void fetchBackendEvents({ days: 30 }).then((result) => {
      setBackendEvents(result.events);
      setOfficialMessage(result.sourceNote || (result.events.length ? `後端事件 API 已取得 ${result.events.length} 筆事件。` : "後端事件 API 目前無正式事件，將使用匯入 / 手動 / Demo fallback。"));
    }).catch(() => {
      setOfficialMessage("後端事件 API 暫時不可用；事件雷達保留匯入 / 手動 / 示範 fallback，且資料來源會明確標示。");
    });
  }, []);

  const imported = loadImportedDataset();
  const plans = loadTradePlans();
  const plannedEventIds = new Set([...plans.map((plan) => plan.relatedEventId).filter((id): id is string => Boolean(id)), ...(actionState?.createdTradePlanEventIds ?? [])]);
  const effectiveEvents = dataMode === "demo"
    ? mockEvents
    : mergeEventSources(backendEvents, imported.events, manualEvents, mockEvents, dataMode !== "realOnly");

  useEffect(() => {
    const symbols = effectiveEvents
      .filter((event) => eventType === "all" || event.eventType === eventType)
      .filter((event) => theme === "all" || event.relatedThemes.includes(theme))
      .filter((event) => source === "all" || event.dataSource === source)
      .filter((event) => {
        const days = Math.ceil((new Date(`${event.eventDate}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
        return days >= 0 && days <= windowDays;
      })
      .map((event) => event.symbol)
      .slice(0, 18);
    if (!symbols.length) {
      setBackendPrice([]);
      setBackendWarnings([]);
      return;
    }
    void Promise.all([
      fetchBackendPriceSnapshots(symbols),
      fetchMarketWarnings(symbols)
    ]).then(([priceResult, warningResult]) => {
      setBackendPrice(priceResult.priceSnapshots);
      setBackendWarnings(warningResult.items);
      setOfficialMessage((previous) => `${previous} ${priceResult.sourceNote} 官方警示 ${warningResult.items.length} 筆；${warningResult.sourceNote}`);
    }).catch(() => {
      setOfficialMessage("後端行情或官方警示 API 暫時不可用；事件雷達保留匯入 / 官方 / 示範 fallback。資料來源仍會明確標示。");
      setBackendWarnings([]);
    });
  }, [dataMode, eventType, theme, source, windowDays, effectiveEvents.length]);

  const backendWarningRecords = backendWarnings.map(toMarketWarningRecord);
  const combinedMarketWarnings = [...backendWarningRecords, ...officialWarnings, ...imported.marketWarnings];
  const recomputed = recomputeEventScores({
    events: effectiveEvents,
    stocks: mockStocks,
    themes: mockThemes,
    priceSnapshots: [...backendPrice, ...officialPrice, ...imported.priceSnapshots],
    institutionalFlows: [...officialFlow, ...imported.institutionalFlows],
    marketWarnings: combinedMarketWarnings
  });

  const eventTypes = Array.from(new Set([...mockEvents, ...effectiveEvents].map((event) => event.eventType)));
  const themes = Array.from(new Set(effectiveEvents.flatMap((event) => event.relatedThemes)));
  const today = new Date().toISOString().slice(0, 10);
  const backendDataCount = backendPrice.filter((item) => item.dataSource !== "Demo").length;
  const backendEventCount = backendEvents.length;
  const rows: EventRow[] = recomputed.enrichedEvents
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

  function addJournalNote(row: EventRow) {
    const warning = findWarning(combinedMarketWarnings, row.event.symbol);
    const journal = loadJournal();
    saveJournal([
      {
        id: `journal-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        symbol: row.event.symbol,
        name: row.event.name,
        action: "planned",
        strategy: "Manual Event Research",
        relatedEventId: row.event.id,
        eventType: row.event.eventType,
        price: row.stock?.price ?? 0,
        shares: 0,
        reason: warning ? `由事件催化雷達加入：${row.event.eventTitle}；官方/匯入警示：${warning.warningType} ${warning.reason}` : `由事件催化雷達加入：${row.event.eventTitle}`,
        eventThesis: explainAlphaRow(row),
        wasEventPricedIn: row.pricedInRisk === "high" || row.pricedInRisk === "critical",
        didChaseNews: false,
        planFollowed: true,
        emotion: "disciplined",
        dataSource: "Manual",
        sourceNote: warning ? `由事件催化雷達建立的日誌草稿。警示來源：${warning.sourceNote}` : "由事件催化雷達建立的日誌草稿。"
      },
      ...journal
    ]);
    syncAction(markJournalLinked(row.event.id));
  }

  function rememberSelected(row: EventRow) {
    saveSelectedEvent({
      event: row.event,
      catalystScore: Math.round(row.catalyst.totalCatalystScore),
      combinedAlphaScore: Math.round(row.alpha.combinedAlphaScore),
      nextAction: formatNextAction(row.alpha.nextAction)
    });
  }

  const columns: Array<DataTableColumn<EventRow>> = [
    { key: "days", header: "距事件日", accessor: (row) => `${row.daysToEvent} 天`, sortValue: (row) => row.daysToEvent },
    { key: "date", header: "事件日期", accessor: (row) => formatDateTW(row.event.eventDate), sortValue: (row) => row.event.eventDate },
    { key: "symbol", header: "代號", accessor: (row) => <span className="font-semibold text-slate-950">{row.event.symbol}</span>, searchValue: (row) => row.event.symbol },
    { key: "name", header: "名稱", accessor: (row) => row.event.name, searchValue: (row) => row.event.name },
    { key: "type", header: "事件類型", accessor: (row) => <EventTypeBadge type={row.event.eventType} />, searchValue: (row) => EVENT_TYPE_LABELS[row.event.eventType] ?? row.event.eventType },
    { key: "title", header: "事件標題", accessor: (row) => <span className="block max-w-80 truncate" title={row.event.eventTitle}>{row.event.eventTitle}</span>, searchValue: (row) => row.event.eventTitle },
    { key: "catalyst", header: "催化分數", accessor: (row) => <ScoreBadge score={row.catalyst.totalCatalystScore} />, sortValue: (row) => row.catalyst.totalCatalystScore },
    { key: "alpha", header: "綜合 Alpha", accessor: (row) => <ScoreBadge score={row.alpha.combinedAlphaScore} />, sortValue: (row) => row.alpha.combinedAlphaScore },
    { key: "priceSource", header: "行情來源", accessor: (row) => <DataSourceBadge source={row.sourceDiagnostics?.priceSource ?? row.stock?.dataSource ?? "Missing"} />, searchValue: (row) => row.sourceDiagnostics?.priceSource ?? row.stock?.dataSource ?? "Missing" },
    { key: "warning", header: "官方警示", accessor: (row) => <WarningBadge warning={findWarning(combinedMarketWarnings, row.event.symbol)} />, searchValue: (row) => findWarning(combinedMarketWarnings, row.event.symbol)?.warningType ?? "none", sortValue: (row) => warningSort(findWarning(combinedMarketWarnings, row.event.symbol)?.warningType) },
    { key: "priced", header: "已反應", accessor: (row) => <RiskBadge level={row.pricedInRisk} />, sortValue: (row) => riskSort(row.pricedInRisk) },
    { key: "risk", header: "風險", accessor: (row) => <RiskBadge level={actionState?.flaggedOverheated.includes(row.event.id) ? "high" : row.overheatRisk} />, sortValue: (row) => riskSort(row.overheatRisk) },
    { key: "action", header: "下一步", accessor: (row) => formatNextAction(row.alpha.nextAction), searchValue: (row) => formatNextAction(row.alpha.nextAction) },
    { key: "source", header: "事件來源", accessor: (row) => <DataSourceBadge source={row.event.dataSource} />, searchValue: (row) => row.event.dataSource },
    { key: "confidence", header: "信心", accessor: (row) => `${row.event.confidence}%`, sortValue: (row) => row.event.confidence }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">EVENT RADAR</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">事件催化雷達</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">事件來源優先使用後端事件 API 與匯入 / 手動資料；只有沒有正式來源時才使用 Demo fallback。行情、MA、RSI、近期報酬率、注意股 / 處置股會優先使用後端 API 重新計分。</p>
        <p className="mt-2 text-xs text-amber-700">{officialMessage}</p>
        <p className="mt-1 text-xs text-cyan-800">後端事件：{backendEventCount} 筆；後端行情：{backendDataCount || backendPrice.length} 檔；後端官方警示：{backendWarnings.length} 筆；行情 Demo fallback：{backendPrice.filter((item) => item.dataSource === "Demo").length} 檔。</p>
      </section>

      <SectionCard title="篩選條件">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select label="資料模式" value={dataMode} options={[["hybrid", "全部 / Hybrid"], ["realOnly", "手動 + 匯入 + 後端"], ["demo", "只看示範"]]} onChange={(value) => setDataMode(value as DataMode)} />
          <Select label="事件期間" value={String(windowDays)} options={[["7", "7 天"], ["14", "14 天"], ["30", "30 天"]]} onChange={(value) => setWindowDays(Number(value))} />
          <Select label="事件類型" value={eventType} options={[["all", "全部"], ...eventTypes.map((type) => [type, EVENT_TYPE_LABELS[type] ?? type] as [string, string])]} onChange={(value) => setEventType(value as EventType | "all")} />
          <Select label="題材" value={theme} options={[["all", "全部"], ...themes.map((item) => [item, localizeTheme(item)] as [string, string])]} onChange={setTheme} />
          <Select label="資料來源" value={source} options={[["all", "全部"], ["Official", "官方/後端"], ["Imported", "匯入"], ["Manual", "手動"], ["Demo", "示範"]]} onChange={(value) => setSource(value as SourceFilter)} />
          <label className="grid gap-1 text-xs text-slate-500">最低催化分數<input className={inputClass} type="number" value={minCatalyst} onChange={(event) => setMinCatalyst(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-xs text-slate-500">最低 Alpha 分數<input className={inputClass} type="number" value={minAlpha} onChange={(event) => setMinAlpha(Number(event.target.value))} /></label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={hideOverheated} onChange={(event) => setHideOverheated(event.target.checked)} />隱藏過熱標的</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={hideLowConfidence} onChange={(event) => setHideLowConfidence(event.target.checked)} />隱藏低可信度</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyNoPlan} onChange={(event) => setOnlyNoPlan(event.target.checked)} />只看尚未建立計畫</label>
        </div>
      </SectionCard>

      <SectionCard title="重新計分摘要">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="後端事件" value={backendEventCount} />
          <Metric label="後端行情" value={backendPrice.length} />
          <Metric label="官方/匯入警示" value={combinedMarketWarnings.length} />
          <Metric label="分數變動" value={recomputed.scoreChanges.length} />
        </div>
        <WarningList warnings={recomputed.warnings} />
      </SectionCard>

      <SectionCard title="事件清單">
        <DataTable
          rows={rows}
          columns={columns}
          emptyMessage="目前沒有符合條件的事件。"
          renderExpanded={(row) => <ScoreDetails row={row} actionState={actionState} warning={findWarning(combinedMarketWarnings, row.event.symbol)} />}
          primaryAction={(row) => (
            <div className="flex min-w-80 flex-wrap gap-2 text-xs">
              <Link className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800" href={`/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}&from=event-radar`} onClick={() => rememberSelected(row)}>建立交易計畫</Link>
              <Link className="rounded border border-cyan-300 bg-cyan-50 px-2 py-1 text-cyan-800" href={`/market?symbol=${row.event.symbol}`}>查看 K 線</Link>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => setSelected(row)}>研究詳情</button>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => addJournalNote(row)}>{actionState?.journalLinkedEventIds.includes(row.event.id) ? "已有日誌" : "加入日誌"}</button>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => syncAction(markEventReviewed(row.event.id))}>{actionState?.reviewedEventIds.includes(row.event.id) ? "已檢查" : "標記已檢查"}</button>
              <button className="rounded border border-slate-200 px-2 py-1 text-slate-700" onClick={() => syncAction(ignoreEventUntil(row.event.id, addDays(7)))}>7 天內忽略</button>
              <button className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800" onClick={() => syncAction(flagEventOverheated(row.event.id))}>{actionState?.flaggedOverheated.includes(row.event.id) ? "已標記過熱" : "標記過熱"}</button>
            </div>
          )}
        />
      </SectionCard>

      {selected ? <ResearchDrawer row={selected} actionState={actionState} warning={findWarning(combinedMarketWarnings, selected.event.symbol)} onClose={() => setSelected(null)} onJournal={() => addJournalNote(selected)} onSelectPlan={() => rememberSelected(selected)} /> : null}
    </div>
  );
}

function mergeEventSources(backend: Event[], imported: Event[], manual: Event[], demo: Event[], includeDemoFallback: boolean): Event[] {
  const output = new Map<string, Event>();
  const realLikeEvents = [...imported, ...manual, ...backend];
  if (includeDemoFallback || !realLikeEvents.length) {
    demo.forEach((event) => output.set(`${event.symbol}|${event.eventType}|${event.eventDate}|${event.eventTitle}`, event));
  }
  realLikeEvents.forEach((event) => output.set(`${event.symbol}|${event.eventType}|${event.eventDate}|${event.eventTitle}`, event));
  return Array.from(output.values());
}

function toMarketWarningRecord(row: MarketWarningItem): MarketWarningRecord {
  return {
    symbol: row.symbol,
    name: row.name,
    warningType: row.warningType === "disposition" ? "disposition" : "attention",
    startDate: row.effectiveDate ?? row.fetchedAt.slice(0, 10),
    endDate: row.endDate ?? undefined,
    reason: row.reason,
    sourceUrl: row.sourceUrl ?? undefined,
    dataSource: row.dataSource === "Official" ? "Official" : "Estimated",
    sourceNote: row.sourceNote
  };
}

function findWarning(warnings: MarketWarningRecord[], symbol: string): MarketWarningRecord | undefined {
  return warnings.find((warning) => warning.symbol === symbol);
}

function WarningBadge({ warning }: { warning?: MarketWarningRecord }) {
  if (!warning) return <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500">無</span>;
  const level = warning.warningType === "disposition" ? "high" : "medium";
  return <div className="flex items-center gap-2"><RiskBadge level={level} /><span className="text-xs text-slate-600">{warning.warningType === "disposition" ? "處置" : "注意"}</span></div>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs text-slate-500">{label}<select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-semibold text-slate-950">{value}</div></div>;
}

function ScoreDetails({ row, actionState, warning }: { row: EventRow; actionState: ActionState | null; warning?: MarketWarningRecord }) {
  const warningMessages = warning ? [`${warning.symbol} ${warning.name} ${warning.warningType === "disposition" ? "處置" : "注意"}：${warning.reason}`] : [];
  return <div className="grid gap-3 text-sm text-slate-600 lg:grid-cols-2"><div><div className="font-semibold text-slate-950">分數拆解</div><ul className="mt-2 space-y-1"><li>催化：{Math.round(row.catalyst.totalCatalystScore)}</li><li>趨勢：{Math.round(row.alpha.quantTrendScore)}</li><li>籌碼：{Math.round(row.alpha.flowConfirmationScore)}</li><li>題材：{Math.round(row.alpha.themeMomentumScore)}</li><li>資料來源：事件 {row.sourceDiagnostics?.eventSource ?? row.event.dataSource} / 行情 {row.sourceDiagnostics?.priceSource ?? row.stock?.dataSource ?? "Missing"} / 警示 {row.sourceDiagnostics?.warningSource ?? warning?.dataSource ?? "Missing"}</li></ul></div><div><div className="font-semibold text-slate-950">警示</div><WarningList warnings={[...warningMessages, ...row.alpha.warnings, ...row.catalyst.warnings, ...(row.dataQualityWarnings ?? []), actionState?.flaggedOverheated.includes(row.event.id) ? "使用者已標記為過熱。" : ""].filter(Boolean)} /></div></div>;
}

function ResearchDrawer({ row, onClose, onJournal, onSelectPlan, warning }: { row: EventRow; actionState: ActionState | null; warning?: MarketWarningRecord; onClose: () => void; onJournal: () => void; onSelectPlan: () => void }) {
  return <div className="fixed inset-0 z-50 bg-slate-950/30 p-4" role="dialog"><div className="ml-auto h-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">RESEARCH DETAIL</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{row.event.symbol} {row.event.name}</h2><p className="mt-1 text-sm text-slate-500">{row.event.eventTitle}</p></div><button className="rounded border border-slate-200 px-2 py-1 text-sm" onClick={onClose}>關閉</button></div><div className="mt-4 grid gap-3 md:grid-cols-3"><ScoreBadge score={row.catalyst.totalCatalystScore} /><ScoreBadge score={row.alpha.combinedAlphaScore} /><RiskBadge level={row.pricedInRisk} /></div><div className="mt-4 space-y-3 text-sm leading-6 text-slate-700"><p>{explainAlphaRow(row)}</p>{warning ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">官方 / 匯入警示：{warning.warningType === "disposition" ? "處置" : "注意"}｜{warning.reason}</div> : null}<div className="flex flex-wrap gap-2">{row.event.relatedThemes.map((item) => <ThemeBadge key={item} label={item} />)}</div><WarningList warnings={[...row.alpha.warnings, ...row.catalyst.warnings, ...(row.dataQualityWarnings ?? [])]} /><div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">事件來源：{row.event.dataSource}；行情來源：{row.sourceDiagnostics?.priceSource ?? row.stock?.dataSource ?? "Missing"}；警示來源：{row.sourceDiagnostics?.warningSource ?? warning?.dataSource ?? "Missing"}；{row.stock?.sourceNote}</div></div><div className="mt-5 flex flex-wrap gap-2"><Link className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href={`/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}&from=event-radar`} onClick={onSelectPlan}>建立交易計畫</Link><Link className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white" href={`/market?symbol=${row.event.symbol}`}>查看 K 線</Link><button className="rounded-md border border-slate-200 px-3 py-2 text-sm" onClick={onJournal}>加入日誌</button></div></div></div>;
}

function riskSort(level: string): number {
  return level === "critical" ? 4 : level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function warningSort(type?: string): number {
  return type === "disposition" ? 2 : type === "attention" ? 1 : 0;
}

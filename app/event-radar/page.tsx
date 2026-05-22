"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataSourceBadge, EventTypeBadge, RiskBadge, ScoreBadge, SectionCard, ThemeBadge, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { flagEventOverheated, ignoreEventUntil, loadActionState, markEventReviewed, markJournalLinked, type ActionState } from "../lib/actionState";
import { mergeEventsByPriority } from "../lib/dataSources/mergeSources";
import { explainAlphaRow } from "../lib/explanations";
import { loadImportedDataset } from "../lib/importers";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { saveSelectedEvent } from "../lib/navigationState";
import { recomputeEventScores } from "../lib/recomputeScores";
import { loadEvents, loadJournal, loadSettings, loadTradePlans, saveJournal } from "../lib/storage";
import type { AlphaEngineResult, DataSource, Event, EventType, InstitutionalFlowRecord, MarketWarningRecord, PriceSnapshot } from "../lib/types";
import { EVENT_TYPE_LABELS, addDays, formatDateTW, formatNextAction, formatRiskLevel, localizeTheme } from "../lib/utils";

type EventRow = AlphaEngineResult & { id: string };
type SourceFilter = "all" | DataSource;
type DataMode = "hybrid" | "realOnly" | "demo";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function EventRadarPage() {
  const [manualEvents, setManualEvents] = useState<Event[]>(mockEvents);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [officialPrice, setOfficialPrice] = useState<PriceSnapshot[]>([]);
  const [officialFlow, setOfficialFlow] = useState<InstitutionalFlowRecord[]>([]);
  const [officialWarnings, setOfficialWarnings] = useState<MarketWarningRecord[]>([]);
  const [officialMessage, setOfficialMessage] = useState("官方資料尚未刷新，先使用匯入 / 示範 fallback。");
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
      setOfficialMessage("已嘗試載入官方資料；缺資料時仍使用匯入或示範 fallback。");
    } catch {
      setOfficialMessage("官方資料讀取失敗；目前使用匯入 / 示範 fallback，不影響操作。");
    }
  }

  useEffect(() => {
    setManualEvents(loadEvents());
    setActionState(loadActionState());
    const settings = loadSettings();
    setDataMode(settings.dataMode === "DemoOnly" ? "demo" : settings.dataMode === "RealImportedOnly" ? "realOnly" : "hybrid");
    void loadOfficialData();
  }, []);

  const imported = loadImportedDataset();
  const plans = loadTradePlans();
  const plannedEventIds = new Set([...plans.map((plan) => plan.relatedEventId).filter((id): id is string => Boolean(id)), ...(actionState?.createdTradePlanEventIds ?? [])]);
  const manualOnly = manualEvents.filter((event) => event.dataSource === "Manual");
  const effectiveEvents = dataMode === "demo"
    ? mockEvents
    : mergeEventsByPriority(mockEvents, [], imported.events, manualOnly, dataMode === "realOnly" ? "RealImportedOnly" : "Hybrid");

  const recomputed = recomputeEventScores({
    events: effectiveEvents,
    stocks: mockStocks,
    themes: mockThemes,
    priceSnapshots: [...officialPrice, ...imported.priceSnapshots],
    institutionalFlows: [...officialFlow, ...imported.institutionalFlows],
    marketWarnings: [...officialWarnings, ...imported.marketWarnings]
  });

  const eventTypes = Array.from(new Set([...mockEvents, ...effectiveEvents].map((event) => event.eventType)));
  const themes = Array.from(new Set(effectiveEvents.flatMap((event) => event.relatedThemes)));
  const today = new Date().toISOString().slice(0, 10);
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
        reason: `由事件催化雷達加入：${row.event.eventTitle}`,
        eventThesis: explainAlphaRow(row),
        wasEventPricedIn: row.pricedInRisk === "high" || row.pricedInRisk === "critical",
        didChaseNews: false,
        planFollowed: true,
        emotion: "disciplined",
        dataSource: "Manual",
        sourceNote: "由事件催化雷達建立的日誌草稿。"
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
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">追蹤未來 7 / 14 / 30 天可能影響資金注意力的事件，並根據匯入與官方資料重新計算技術、籌碼、過熱與已反應風險。</p>
        <p className="mt-2 text-xs text-amber-700">{officialMessage}</p>
      </section>

      <SectionCard title="篩選條件">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select label="資料模式" value={dataMode} options={[["hybrid", "全部 / Hybrid"], ["realOnly", "手動 + 匯入 + 官方"], ["demo", "只看示範"]]} onChange={(value) => setDataMode(value as DataMode)} />
          <Select label="事件期間" value={String(windowDays)} options={[["7", "7 天"], ["14", "14 天"], ["30", "30 天"]]} onChange={(value) => setWindowDays(Number(value))} />
          <Select label="事件類型" value={eventType} options={[["all", "全部"], ...eventTypes.map((type) => [type, EVENT_TYPE_LABELS[type] ?? type] as [string, string])]} onChange={(value) => setEventType(value as EventType | "all")} />
          <Select label="題材" value={theme} options={[["all", "全部"], ...themes.map((item) => [item, localizeTheme(item)] as [string, string])]} onChange={setTheme} />
          <Select label="資料來源" value={source} options={[["all", "全部"], ["Official", "官方"], ["Imported", "匯入"], ["Manual", "手動"], ["Demo", "示範"]]} onChange={(value) => setSource(value as SourceFilter)} />
          <label className="grid gap-1 text-xs text-slate-500">最低催化分數<input className={inputClass} type="number" value={minCatalyst} onChange={(event) => setMinCatalyst(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-xs text-slate-500">最低 Alpha 分數<input className={inputClass} type="number" value={minAlpha} onChange={(event) => setMinAlpha(Number(event.target.value))} /></label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={hideOverheated} onChange={(event) => setHideOverheated(event.target.checked)} />隱藏過熱標的</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={hideLowConfidence} onChange={(event) => setHideLowConfidence(event.target.checked)} />隱藏低可信度</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyNoPlan} onChange={(event) => setOnlyNoPlan(event.target.checked)} />只看尚未建立計畫</label>
        </div>
      </SectionCard>

      <SectionCard title="重新計分摘要">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="匯入股價" value={imported.priceSnapshots.length} />
          <Metric label="匯入法人" value={imported.institutionalFlows.length} />
          <Metric label="風險警示" value={imported.marketWarnings.length} />
          <Metric label="分數變動" value={recomputed.scoreChanges.length} />
        </div>
        <WarningList warnings={recomputed.warnings} />
      </SectionCard>

      <SectionCard title="事件清單">
        <DataTable
          rows={rows}
          columns={columns}
          emptyMessage="目前沒有符合條件的事件。"
          renderExpanded={(row) => <ScoreDetails row={row} actionState={actionState} />}
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

      {selected ? <ResearchDrawer row={selected} actionState={actionState} onClose={() => setSelected(null)} onJournal={() => addJournalNote(selected)} onSelectPlan={() => rememberSelected(selected)} /> : null}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs text-slate-500">{label}<select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}

function ScoreDetails({ row, actionState }: { row: EventRow; actionState: ActionState | null }) {
  return (
    <div className="grid gap-3 text-sm lg:grid-cols-3">
      <div className="rounded-md border border-slate-200 bg-white p-3"><div className="font-semibold text-slate-950">一行摘要</div><p className="mt-2 text-slate-600">{row.event.symbol} / {row.event.name}：催化 {Math.round(row.catalyst.totalCatalystScore)}，Alpha {Math.round(row.alpha.combinedAlphaScore)}，下一步 {formatNextAction(row.alpha.nextAction)}。</p></div>
      <div className="rounded-md border border-slate-200 bg-white p-3"><div className="font-semibold text-slate-950">加分來源</div><ul className="mt-2 space-y-1 text-slate-600"><li>事件重要度：{Math.round(row.catalyst.eventImportanceScore)}</li><li>題材熱度：{Math.round(row.catalyst.themeHeatScore)}</li><li>法人籌碼：{Math.round(row.alpha.flowConfirmationScore)}</li></ul></div>
      <div className="rounded-md border border-slate-200 bg-white p-3"><div className="font-semibold text-slate-950">扣分 / 資料品質</div><ul className="mt-2 space-y-1 text-slate-600"><li>已反應風險：{formatRiskLevel(row.pricedInRisk)}</li><li>過熱風險：{actionState?.flaggedOverheated.includes(row.event.id) ? "使用者標記過熱" : formatRiskLevel(row.overheatRisk)}</li><li>{row.scoreRecomputed ? "已根據匯入 / 官方資料重新計分" : "使用 fallback 分數"}</li></ul></div>
    </div>
  );
}

function ResearchDrawer({ row, actionState, onClose, onJournal, onSelectPlan }: { row: EventRow; actionState: ActionState | null; onClose: () => void; onJournal: () => void; onSelectPlan: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30">
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">研究詳情</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{row.event.symbol} / {row.event.name}</h2><p className="mt-1 text-sm text-slate-600">{row.event.eventTitle}</p></div>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={onClose}>關閉</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><Metric label="事件日期" value={formatDateTW(row.event.eventDate)} /><Metric label="下一步" value={formatNextAction(row.alpha.nextAction)} /><Metric label="催化分數" value={Math.round(row.catalyst.totalCatalystScore)} /><Metric label="綜合 Alpha" value={Math.round(row.alpha.combinedAlphaScore)} /></div>
        <div className="mt-4 flex flex-wrap gap-2">{row.event.relatedThemes.map((theme) => <ThemeBadge key={theme} label={theme} />)}<DataSourceBadge source={row.event.dataSource} />{row.sourceDiagnostics ? <DataSourceBadge source={row.sourceDiagnostics.priceSource} /> : null}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><SectionCard title="已反應 / 過熱風險"><div className="flex gap-2"><RiskBadge level={row.pricedInRisk} /><RiskBadge level={actionState?.flaggedOverheated.includes(row.event.id) ? "high" : row.overheatRisk} /></div></SectionCard><SectionCard title="資料來源"><p className="text-sm text-slate-600">事件：{row.event.sourceNote}</p><p className="mt-2 text-sm text-slate-600">技術：{row.sourceDiagnostics?.priceSource ?? "Demo"}，籌碼：{row.sourceDiagnostics?.flowSource ?? "Demo"}，估算欄位：{row.sourceDiagnostics?.estimatedFields.join(", ") || "無"}</p></SectionCard></div>
        <SectionCard title="分數說明"><p className="text-sm leading-6 text-slate-600">{explainAlphaRow(row)}</p><div className="mt-3"><WarningList warnings={[...(row.dataQualityWarnings ?? []), ...row.catalyst.warnings, ...row.alpha.warnings]} /></div></SectionCard>
        <div className="mt-4 flex flex-wrap gap-2"><Link className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href={`/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}&from=event-radar`} onClick={onSelectPlan}>建立交易計畫</Link><Link className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800" href={`/market?symbol=${row.event.symbol}`}>查看最新報價 / K 線</Link><button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={onJournal}>加入日誌</button></div>
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

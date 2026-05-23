"use client";

import { useEffect, useState } from "react";
import { DataSourceBadge, EventTypeBadge, ScoreBadge, SectionCard, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { fetchBackendEvents } from "../lib/backendEventsApi";
import { runEventStudy, type EventStudyResult } from "../lib/researchApi";
import type { Event } from "../lib/types";
import { formatDateTW } from "../lib/utils";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function EventStudyPage() {
  const [symbolsText, setSymbolsText] = useState("2330,2382,2317,2308,3017,3037");
  const [days, setDays] = useState(30);
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<Event | null>(null);
  const [result, setResult] = useState<EventStudyResult | null>(null);
  const [preDays, setPreDays] = useState(10);
  const [postDays, setPostDays] = useState(10);
  const [message, setMessage] = useState("載入未來事件後，可選擇單一事件執行 T 前 / T 後 abnormal return MVP。結果僅供研究，不構成投資建議。");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadEvents() {
    setLoading(true);
    setMessage("正在載入後端事件 metadata...");
    try {
      const payload = await fetchBackendEvents({ days, symbols: split(symbolsText) });
      setEvents(payload.events);
      setSelected(payload.events[0] ?? null);
      setWarnings(payload.error ? [payload.error] : []);
      setMessage(`已載入 ${payload.events.length} 筆事件；來源：${payload.dataSource}。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "事件載入失敗"]);
      setMessage("事件載入失敗，請確認 backend 已啟動。 ");
    } finally {
      setLoading(false);
    }
  }

  async function analyze(event = selected) {
    if (!event) return;
    setLoading(true);
    setMessage(`正在執行 ${event.symbol} ${event.eventType} event study...`);
    try {
      const payload = await runEventStudy({ eventId: event.id, symbol: event.symbol, eventType: event.eventType, eventDate: event.eventDate, preDays, postDays });
      setResult(payload);
      setWarnings(payload.warnings);
      setMessage(`${event.symbol} event study 完成。樣本數 ${payload.sampleSize}，abnormal post return：${fmt(payload.abnormalPostReturn)}。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "Event study failed"]);
      setMessage("Event study 失敗，請確認 backend / research API。 ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: Array<DataTableColumn<Event>> = [
    { key: "date", header: "日期", accessor: (row) => formatDateTW(row.eventDate), sortValue: (row) => row.eventDate },
    { key: "symbol", header: "代號", accessor: (row) => <span className="font-semibold text-slate-950">{row.symbol}</span>, searchValue: (row) => row.symbol },
    { key: "name", header: "名稱", accessor: (row) => row.name, searchValue: (row) => row.name },
    { key: "type", header: "事件", accessor: (row) => <EventTypeBadge type={row.eventType} />, searchValue: (row) => row.eventType },
    { key: "title", header: "標題", accessor: (row) => <span className="block max-w-96 truncate" title={row.eventTitle}>{row.eventTitle}</span>, searchValue: (row) => row.eventTitle },
    { key: "impact", header: "影響", accessor: (row) => <ScoreBadge score={row.expectedImpact} />, sortValue: (row) => row.expectedImpact },
    { key: "confidence", header: "信心", accessor: (row) => <ScoreBadge score={row.confidence} />, sortValue: (row) => row.confidence },
    { key: "source", header: "來源", accessor: (row) => <DataSourceBadge source={row.dataSource} />, searchValue: (row) => row.dataSource }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">EVENT STUDY MVP</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">事件回測研究</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">用後端事件 metadata 與 K 線資料估算事件前後報酬、benchmark 報酬、abnormal return 與 max drawdown。這是 MVP 研究工具，正式結論需更多歷史樣本驗證。</p>
      </section>

      <SectionCard title="事件研究設定">
        <div className="grid gap-3 lg:grid-cols-[1fr_110px_110px_110px_auto_auto] lg:items-end">
          <label className="grid gap-1 text-xs text-slate-500">股票池<input className={inputClass} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} /></label>
          <label className="grid gap-1 text-xs text-slate-500">事件天數<input className={inputClass} type="number" value={days} onChange={(event) => setDays(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-xs text-slate-500">T 前<input className={inputClass} type="number" value={preDays} onChange={(event) => setPreDays(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-xs text-slate-500">T 後<input className={inputClass} type="number" value={postDays} onChange={(event) => setPostDays(Number(event.target.value))} /></label>
          <button className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 disabled:opacity-50" onClick={() => void loadEvents()} disabled={loading}>載入事件</button>
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void analyze()} disabled={!selected || loading}>執行回測</button>
        </div>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard title="事件清單">
          <DataTable rows={events} columns={columns} emptyMessage="尚無事件資料。" primaryAction={(row) => <button className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800" onClick={() => { setSelected(row); void analyze(row); }}>研究</button>} renderExpanded={(row) => <div className="text-sm leading-6 text-slate-600"><div>{row.sourceNote}</div><div className="mt-2 flex flex-wrap gap-2">{row.relatedThemes.map((theme) => <span key={theme} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">{theme}</span>)}</div></div>} />
        </SectionCard>

        <SectionCard title="Event Study Result">
          {result ? <div className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="text-xl font-semibold text-slate-950">{result.symbol}</div><div className="text-xs text-slate-500">{result.eventType} / {formatDateTW(result.eventDate)} / benchmark {result.benchmarkSymbol}</div></div>
            <Metric label="T 前報酬" value={fmt(result.preReturn)} />
            <Metric label="T 後報酬" value={fmt(result.postReturn)} />
            <Metric label="Benchmark T 前" value={fmt(result.benchmarkPreReturn)} />
            <Metric label="Benchmark T 後" value={fmt(result.benchmarkPostReturn)} />
            <Metric label="Abnormal T 前" value={fmt(result.abnormalPreReturn)} />
            <Metric label="Abnormal T 後" value={fmt(result.abnormalPostReturn)} />
            <Metric label="Max Drawdown" value={fmt(result.maxDrawdown)} />
            <Metric label="Hit" value={result.hit === null || result.hit === undefined ? "資料不足" : result.hit ? "是" : "否"} />
            <p className="text-xs leading-5 text-slate-500">{result.sourceNote}</p>
          </div> : <p className="text-sm text-slate-500">尚未執行 event study。</p>}
          <WarningList warnings={warnings} />
        </SectionCard>
      </div>
    </div>
  );
}

function split(value: string): string[] { return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean); }
function fmt(value?: number | null): string { return value === null || value === undefined ? "資料不足" : `${value.toFixed(2)}%`; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="flex justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-950">{value}</span></div>; }

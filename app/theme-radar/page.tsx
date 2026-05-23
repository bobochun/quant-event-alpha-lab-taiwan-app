"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateThemeHeat } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { DataSourceBadge, ScoreBadge, SectionCard, ThemeHeatPanel, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { localizeTheme } from "../lib/utils";
import { fetchBackendEvents } from "../lib/backendEventsApi";
import { fetchThemeStrength, type ThemeStrengthRow } from "../lib/researchApi";
import { fetchQuantBatch, type QuantAnalysisResult } from "../lib/quantApi";
import type { Event, ThemeHeatResult } from "../lib/types";

const defaultSymbols = "2330,2382,2317,2308,3017,3037,3231,2603,2615,2454";
const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function ThemeRadarPage() {
  const [symbolsText, setSymbolsText] = useState(defaultSymbols);
  const [backendEvents, setBackendEvents] = useState<Event[]>([]);
  const [themeStrength, setThemeStrength] = useState<ThemeStrengthRow[]>([]);
  const [quantRows, setQuantRows] = useState<QuantAnalysisResult[]>([]);
  const [message, setMessage] = useState("正在嘗試由後端事件、量化掃描與題材強弱 API 建立題材雷達；後端不可用時才使用 demo fallback。 ");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const symbols = split(symbolsText);
  const fallbackThemes = useMemo(() => calculateThemeHeat(mockThemes, mockEvents, mockStocks), []);
  const backendThemeRows: ThemeHeatResult[] = themeStrength.map((row) => ({
    theme: row.theme,
    heatScore: row.averageScore,
    momentum: row.averageReturn20d ?? 0,
    relatedSymbols: row.symbols,
    upcomingEvents: backendEvents.filter((event) => event.relatedThemes.includes(row.theme)).length,
    overheatedSymbols: [],
    dataSource: "Cached",
    sourceNote: row.note,
    explanation: row.note,
    warnings: row.overheatedCount ? [`${row.overheatedCount} 檔可能過熱，避免追高。`] : []
  }));
  const themes: ThemeHeatResult[] = backendThemeRows.length ? backendThemeRows : fallbackThemes;
  const chartData = themes.slice(0, 12).map((theme) => ({ ...theme, 題材: localizeTheme(theme.theme), 熱度分數: Math.round(theme.heatScore) }));

  async function loadBackendThemeRadar() {
    setLoading(true);
    setMessage("正在更新後端題材雷達...");
    try {
      const [eventsPayload, themeRows, quantPayload] = await Promise.all([
        fetchBackendEvents({ days: 30, symbols }),
        fetchThemeStrength(symbols),
        fetchQuantBatch(symbols, "1d", "1y")
      ]);
      setBackendEvents(eventsPayload.events);
      setThemeStrength(themeRows);
      setQuantRows(quantPayload.results);
      setWarnings([...quantPayload.warnings, ...(eventsPayload.error ? [eventsPayload.error] : [])]);
      setMessage(`已由後端建立題材雷達：事件 ${eventsPayload.events.length} 筆、題材 ${themeRows.length} 組、量化掃描 ${quantPayload.results.length} 檔。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "後端題材雷達資料取得失敗"]);
      setMessage("後端題材雷達資料暫時不可用，目前顯示 Demo fallback，請勿視為真實題材熱度。 ");
      setBackendEvents([]);
      setThemeStrength([]);
      setQuantRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadBackendThemeRadar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: Array<DataTableColumn<ThemeStrengthRow & { id: string }>> = [
    { key: "rank", header: "排名", accessor: (row) => row.rank, sortValue: (row) => row.rank },
    { key: "theme", header: "題材", accessor: (row) => <span className="font-semibold text-slate-950">{localizeTheme(row.theme)}</span>, searchValue: (row) => row.theme },
    { key: "score", header: "相對強弱", accessor: (row) => <ScoreBadge score={row.averageScore} />, sortValue: (row) => row.averageScore },
    { key: "r20", header: "20D", accessor: (row) => fmtPct(row.averageReturn20d), sortValue: (row) => row.averageReturn20d ?? 0 },
    { key: "r60", header: "60D", accessor: (row) => fmtPct(row.averageReturn60d), sortValue: (row) => row.averageReturn60d ?? 0 },
    { key: "hot", header: "轉強檔", accessor: (row) => row.hotCount, sortValue: (row) => row.hotCount },
    { key: "over", header: "過熱檔", accessor: (row) => row.overheatedCount, sortValue: (row) => row.overheatedCount },
    { key: "symbols", header: "成分", accessor: (row) => <span className="block max-w-80 truncate" title={row.symbols.join("、")}>{row.symbols.join("、")}</span>, searchValue: (row) => row.symbols.join(" ") }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">THEME RADAR</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">題材熱度雷達</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">找出剛開始升溫、但尚未全面過熱的台股題材。後端可用時使用事件、量化掃描與題材相對強弱；缺資料時才 fallback demo。</p>
          </div>
          <div className="flex flex-wrap gap-2"><DataSourceBadge source={themeStrength.length ? "Cached" : "Demo"} /><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">後端題材 {themeStrength.length}</span><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">量化掃描 {quantRows.length}</span></div>
        </div>
      </section>

      <SectionCard title="題材掃描設定" action={<button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={loading} onClick={() => void loadBackendThemeRadar()}>{loading ? "更新中..." : "更新題材雷達"}</button>}>
        <label className="grid gap-1 text-xs text-slate-500">股票池<textarea className={`${inputClass} min-h-20`} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} /></label>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
        <WarningList warnings={warnings} />
      </SectionCard>

      <SectionCard title="題材熱度分布">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="題材" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", color: "#e2e8f0" }} />
              <Bar dataKey="熱度分數" fill="#22d3ee" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {themeStrength.length ? <SectionCard title="後端題材相對強弱矩陣"><DataTable rows={themeStrength.map((row) => ({ ...row, id: row.theme }))} columns={columns} emptyMessage="後端尚未回傳題材強弱資料。" /></SectionCard> : null}
      <SectionCard title="題材明細"><ThemeHeatPanel themes={themes} /></SectionCard>
    </div>
  );
}

function split(value: string): string[] { return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean); }
function fmtPct(value?: number | null): string { return value === null || value === undefined ? "-" : `${value.toFixed(2)}%`; }

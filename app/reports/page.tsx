"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAlphaEngineResults, calculateThemeHeat } from "../lib/alphaEngine";
import { exportEventsCsv, exportFullBackupJson, exportJournalCsv, exportPortfolioCsv, exportTradePlansMarkdown, exportWeeklyReportMarkdown } from "../lib/exporters";
import { mockEvents, mockJournal, mockPortfolio, mockSettings, mockStocks, mockThemes, mockTradePlans } from "../lib/mockData";
import { exportAllData, loadEvents, loadJournal, loadPortfolio, loadTradePlans } from "../lib/storage";
import type { Event, JournalEntry, Portfolio, TradePlan } from "../lib/types";
import { DataSourceBadge, SectionCard, WarningList } from "../components/ui";
import { DEMO_SOURCE_NOTE } from "../lib/utils";
import { loadImportedDataset, mergeDemoImportedManualEvents, mergeStocksWithImported } from "../lib/importers";
import { fetchBackendEvents } from "../lib/backendEventsApi";
import { fetchQuantBatch, type QuantAnalysisResult } from "../lib/quantApi";
import { fetchDataQuality, fetchThemeStrength, type DataQualityReport, type ThemeStrengthRow } from "../lib/researchApi";

const reportLabels: Record<string, string> = {
  weekly: "每週事件 Alpha 報告",
  backendSummary: "後端量化資料摘要 Markdown",
  eventsCsv: "未來 7 天事件觀察清單 CSV",
  plansMd: "交易計畫報告 Markdown",
  portfolioCsv: "投組風控報告 CSV",
  journalCsv: "交易日誌檢討報告 CSV",
  themeJson: "題材熱度報告 JSON",
  backup: "完整 JSON 備份"
};

const defaultSymbols = "2330,2382,2317,2308,3017,3037,3231,2603,2615,2454";
const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function ReportsPage() {
  const [type, setType] = useState("weekly");
  const [symbolsText, setSymbolsText] = useState(defaultSymbols);
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [backendEvents, setBackendEvents] = useState<Event[]>([]);
  const [quantRows, setQuantRows] = useState<QuantAnalysisResult[]>([]);
  const [themeStrength, setThemeStrength] = useState<ThemeStrengthRow[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualityReport[]>([]);
  const [plans, setPlans] = useState<TradePlan[]>(mockTradePlans);
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
  const [journal, setJournal] = useState<JournalEntry[]>(mockJournal);
  const [message, setMessage] = useState("報告會優先使用後端 events / quant / theme / data-quality；不可用時才用 localStorage / imported / demo fallback。 ");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const symbols = split(symbolsText);

  useEffect(() => {
    const imported = loadImportedDataset();
    const manual = loadEvents().filter((event) => event.dataSource === "Manual");
    setEvents(mergeDemoImportedManualEvents(mockEvents, imported.events, manual));
    setPlans(loadTradePlans());
    setPortfolio(loadPortfolio());
    setJournal(loadJournal());
    void refreshBackendReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshBackendReportData() {
    setLoading(true);
    setMessage("正在更新後端報告資料...");
    try {
      const [eventPayload, quantPayload, themeRows, qualityRows] = await Promise.all([
        fetchBackendEvents({ days: 30, symbols }),
        fetchQuantBatch(symbols, "1d", "1y"),
        fetchThemeStrength(symbols),
        fetchDataQuality()
      ]);
      setBackendEvents(eventPayload.events);
      if (eventPayload.events.length) setEvents((current) => mergeReportEvents(eventPayload.events, current));
      setQuantRows(quantPayload.results);
      setThemeStrength(themeRows);
      setDataQuality(qualityRows);
      setWarnings([...(eventPayload.error ? [eventPayload.error] : []), ...quantPayload.warnings]);
      setMessage(`後端報告資料更新完成：事件 ${eventPayload.events.length} 筆、量化 ${quantPayload.results.length} 檔、題材 ${themeRows.length} 組、資料品質 ${qualityRows.length} 組。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "後端報告資料更新失敗"]);
      setMessage("後端報告資料暫時不可用，目前使用本機 / 匯入 / Demo fallback。 ");
    } finally {
      setLoading(false);
    }
  }

  const content = useMemo(() => {
    const imported = loadImportedDataset();
    const stocks = mergeStocksWithImported(mockStocks, imported.stocks);
    const themeHeat = themeStrength.length ? themeStrength.map((row) => ({
      theme: row.theme,
      heatScore: row.averageScore,
      momentum: row.averageReturn20d ?? 0,
      relatedSymbols: row.symbols,
      upcomingEvents: events.filter((event) => event.relatedThemes.includes(row.theme)).length,
      overheatedSymbols: [],
      sourceNote: row.note,
      explanation: row.note,
      warnings: row.overheatedCount ? [`${row.overheatedCount} 檔可能過熱。`] : []
    })) : calculateThemeHeat(mockThemes, events, stocks);
    const alphaRows = buildAlphaEngineResults(events, stocks, mockThemes);
    if (type === "eventsCsv") return exportEventsCsv(events);
    if (type === "plansMd") return exportTradePlansMarkdown(plans);
    if (type === "portfolioCsv") return exportPortfolioCsv(portfolio);
    if (type === "journalCsv") return exportJournalCsv(journal);
    if (type === "themeJson") return JSON.stringify({ source: themeStrength.length ? "backend/research/theme-strength" : "fallback", themeHeat, themeStrength }, null, 2);
    if (type === "backup") return exportFullBackupJson(typeof window === "undefined" ? { version: "1", exportedAt: new Date().toISOString(), events, tradePlans: plans, portfolio, journal, settings: mockSettings } : exportAllData());
    if (type === "backendSummary") return buildBackendSummary({ events: backendEvents, quantRows, themeStrength, dataQuality, warnings });
    return exportWeeklyReportMarkdown({
      themeHeat,
      events,
      plans,
      portfolio,
      alphaRows,
      dataQualityNote: buildDataQualityNote(imported.summaries.length, backendEvents.length, quantRows.length, dataQuality)
    });
  }, [backendEvents, dataQuality, events, journal, plans, portfolio, quantRows, themeStrength, type]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">REPORTS</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">報告匯出</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">輸出每週事件 Alpha 報告、事件觀察清單、交易計畫、投組風控、交易日誌與完整 JSON 備份。後端可用時會優先納入事件、量化、題材與資料品質。</p>
          </div>
          <div className="flex flex-wrap gap-2"><DataSourceBadge source={backendEvents.length || quantRows.length ? "Cached" : "Demo"} /><button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={loading} onClick={() => void refreshBackendReportData()}>{loading ? "更新中..." : "更新後端報告資料"}</button></div>
        </div>
      </section>

      <SectionCard title="報告資料來源">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-1 text-xs text-slate-500">報告股票池<textarea className={`${inputClass} min-h-20`} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} /></label>
          <button className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 disabled:opacity-50" disabled={loading} onClick={() => void refreshBackendReportData()}>重新整理</button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Metric label="後端事件" value={backendEvents.length} />
          <Metric label="量化掃描" value={quantRows.length} />
          <Metric label="題材強弱" value={themeStrength.length} />
          <Metric label="資料品質" value={dataQuality.length} />
        </div>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
        <WarningList warnings={warnings} />
      </SectionCard>

      <SectionCard title="報告內容">
        <select className="mb-3 rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500" value={type} onChange={(event) => setType(event.target.value)}>
          {Object.entries(reportLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <textarea className="min-h-[620px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800" value={content} readOnly />
      </SectionCard>
    </div>
  );
}

function split(value: string): string[] { return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean); }
function mergeReportEvents(backend: Event[], current: Event[]): Event[] { const map = new Map<string, Event>(); [...current, ...backend].forEach((event) => map.set(`${event.symbol}|${event.eventType}|${event.eventDate}|${event.eventTitle}`, event)); return Array.from(map.values()); }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div></div>; }
function buildDataQualityNote(importedCount: number, backendEventsCount: number, quantCount: number, rows: DataQualityReport[]): string { return `後端事件 ${backendEventsCount} 筆、量化掃描 ${quantCount} 檔、資料品質 ${rows.length} 組。${importedCount ? "包含使用者匯入 CSV 資料，請自行確認來源與正確性。" : "未偵測到匯入 CSV。"} ${rows.map((row) => `${row.dataset}:${Math.round(row.score)}`).join(" / ") || DEMO_SOURCE_NOTE}`; }
function buildBackendSummary({ events, quantRows, themeStrength, dataQuality, warnings }: { events: Event[]; quantRows: QuantAnalysisResult[]; themeStrength: ThemeStrengthRow[]; dataQuality: DataQualityReport[]; warnings: string[] }) {
  return `# Backend Quant Data Summary\n\n資料時間：${new Date().toISOString()}\n\n## Events\n\n${events.length ? events.map((event) => `- ${event.eventDate} ${event.symbol} ${event.name} ${event.eventType}: ${event.eventTitle} (${event.dataSource})`).join("\n") : "- 後端目前沒有事件資料。"}\n\n## Quant Ranking\n\n${quantRows.length ? quantRows.sort((a, b) => b.quantScore - a.quantScore).map((row, index) => `${index + 1}. ${row.symbol} ${row.name} score=${Math.round(row.quantScore)} trend=${row.trendState} overheat=${row.overheatRisk} source=${row.provider}/${row.dataSource}`).join("\n") : "- 尚無後端量化掃描資料。"}\n\n## Theme Strength\n\n${themeStrength.length ? themeStrength.map((row) => `- #${row.rank} ${row.theme}: score=${Math.round(row.averageScore)}, symbols=${row.symbols.join(",")}, overheated=${row.overheatedCount}`).join("\n") : "- 尚無後端題材強弱資料。"}\n\n## Data Quality\n\n${dataQuality.length ? dataQuality.map((row) => `- ${row.dataset}/${row.provider}: score=${Math.round(row.score)}, missing=${row.missingRate}%, stale=${row.staleRate}%, error=${row.errorRate}%`).join("\n") : "- 尚無資料品質檢查結果。"}\n\n## Warnings\n\n${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- 無額外警示。"}\n\n> 本報告僅供個人研究，不構成投資建議。`;
}

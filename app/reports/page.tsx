"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAlphaEngineResults, calculateThemeHeat } from "../lib/alphaEngine";
import { exportEventsCsv, exportFullBackupJson, exportJournalCsv, exportPortfolioCsv, exportTradePlansMarkdown, exportWeeklyReportMarkdown } from "../lib/exporters";
import { mockEvents, mockJournal, mockPortfolio, mockSettings, mockStocks, mockThemes, mockTradePlans } from "../lib/mockData";
import { exportAllData, loadEvents, loadJournal, loadPortfolio, loadTradePlans } from "../lib/storage";
import type { Event, JournalEntry, Portfolio, TradePlan } from "../lib/types";
import { SectionCard } from "../components/ui";
import { DEMO_SOURCE_NOTE } from "../lib/utils";
import { loadImportedDataset, mergeDemoImportedManualEvents, mergeStocksWithImported } from "../lib/importers";

const reportLabels: Record<string, string> = {
  weekly: "每週事件 Alpha 報告",
  eventsCsv: "未來 7 天事件觀察清單 CSV",
  plansMd: "交易計畫報告 Markdown",
  portfolioCsv: "投組風控報告 CSV",
  journalCsv: "交易日誌檢討報告 CSV",
  themeJson: "題材熱度報告 JSON",
  backup: "完整 JSON 備份"
};

export default function ReportsPage() {
  const [type, setType] = useState("weekly");
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [plans, setPlans] = useState<TradePlan[]>(mockTradePlans);
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
  const [journal, setJournal] = useState<JournalEntry[]>(mockJournal);
  useEffect(() => {
    const imported = loadImportedDataset();
    const manual = loadEvents().filter((event) => event.dataSource === "Manual");
    setEvents(mergeDemoImportedManualEvents(mockEvents, imported.events, manual));
    setPlans(loadTradePlans());
    setPortfolio(loadPortfolio());
    setJournal(loadJournal());
  }, []);
  const content = useMemo(() => {
    const imported = loadImportedDataset();
    const stocks = mergeStocksWithImported(mockStocks, imported.stocks);
    const themeHeat = calculateThemeHeat(mockThemes, events, stocks);
    const alphaRows = buildAlphaEngineResults(events, stocks, mockThemes);
    if (type === "eventsCsv") return exportEventsCsv(events);
    if (type === "plansMd") return exportTradePlansMarkdown(plans);
    if (type === "portfolioCsv") return exportPortfolioCsv(portfolio);
    if (type === "journalCsv") return exportJournalCsv(journal);
    if (type === "themeJson") return JSON.stringify(themeHeat, null, 2);
    if (type === "backup") return exportFullBackupJson(typeof window === "undefined" ? { version: "1", exportedAt: new Date().toISOString(), events, tradePlans: plans, portfolio, journal, settings: mockSettings } : exportAllData());
    return exportWeeklyReportMarkdown({ themeHeat, events, plans, portfolio, alphaRows, dataQualityNote: imported.summaries.length ? "包含使用者匯入 CSV 資料，請自行確認來源與正確性。" : DEMO_SOURCE_NOTE });
  }, [events, journal, plans, portfolio, type]);
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">報告匯出</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">報告匯出</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">輸出每週事件 Alpha 報告、事件觀察清單、交易計畫、投組風控、交易日誌與完整 JSON 備份。</p>
      </section>
      <SectionCard title="報告內容">
        <select className="mb-3 rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500" value={type} onChange={(event) => setType(event.target.value)}>
          {Object.entries(reportLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <textarea className="min-h-[620px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800" value={content} readOnly />
      </SectionCard>
    </div>
  );
}

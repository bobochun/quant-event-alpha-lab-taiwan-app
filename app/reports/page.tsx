"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAlphaEngineResults, calculateThemeHeat } from "../lib/alphaEngine";
import { exportEventsCsv, exportFullBackupJson, exportJournalCsv, exportPortfolioCsv, exportTradePlansMarkdown, exportWeeklyReportMarkdown } from "../lib/exporters";
import { mockEvents, mockJournal, mockPortfolio, mockStocks, mockThemes, mockTradePlans, mockSettings } from "../lib/mockData";
import { exportAllData, loadEvents, loadJournal, loadPortfolio, loadTradePlans } from "../lib/storage";
import type { Event, JournalEntry, Portfolio, TradePlan } from "../lib/types";
import { SectionCard } from "../components/ui";

export default function ReportsPage() {
  const [type, setType] = useState("weekly");
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [plans, setPlans] = useState<TradePlan[]>(mockTradePlans);
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
  const [journal, setJournal] = useState<JournalEntry[]>(mockJournal);
  useEffect(() => {
    setEvents(loadEvents());
    setPlans(loadTradePlans());
    setPortfolio(loadPortfolio());
    setJournal(loadJournal());
  }, []);
  const content = useMemo(() => {
    const themeHeat = calculateThemeHeat(mockThemes, events, mockStocks);
    const alphaRows = buildAlphaEngineResults(events, mockStocks, mockThemes);
    if (type === "eventsCsv") return exportEventsCsv(events);
    if (type === "plansMd") return exportTradePlansMarkdown(plans);
    if (type === "portfolioCsv") return exportPortfolioCsv(portfolio);
    if (type === "journalCsv") return exportJournalCsv(journal);
    if (type === "themeJson") return JSON.stringify(themeHeat, null, 2);
    if (type === "backup") return exportFullBackupJson(typeof window === "undefined" ? { version: "1", exportedAt: new Date().toISOString(), events, tradePlans: plans, portfolio, journal, settings: mockSettings } : exportAllData());
    return exportWeeklyReportMarkdown({ themeHeat, events: events.slice(0, 12), plans, portfolio, alphaRows, dataQualityNote: "All seeded values are demo data for MVP testing unless you imported/manual-edited local data. Not real-time market data." });
  }, [events, journal, plans, portfolio, type]);
  return (
    <SectionCard title="Reports Export">
      <select className="mb-3 rounded border border-border bg-[#0b1118] p-2" value={type} onChange={(event) => setType(event.target.value)}>
        <option value="weekly">Weekly Event Alpha Report</option>
        <option value="eventsCsv">7-Day Catalyst Watchlist CSV</option>
        <option value="plansMd">Trade Plan Report Markdown</option>
        <option value="portfolioCsv">Portfolio Risk Report CSV</option>
        <option value="journalCsv">Journal Review Report CSV</option>
        <option value="themeJson">Theme Heat Report JSON</option>
        <option value="backup">Full JSON Backup</option>
      </select>
      <textarea className="min-h-[620px] w-full rounded border border-border bg-[#0b1118] p-3 font-mono text-xs" value={content} readOnly />
    </SectionCard>
  );
}

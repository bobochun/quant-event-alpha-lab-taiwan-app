"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzeBehaviorRisk, analyzePortfolioExposure } from "../lib/alphaEngine";
import { mockJournal, mockPortfolio, mockRiskAlerts } from "../lib/mockData";
import { DataSourceBadge, RiskAlertPanel, SectionCard, WarningList } from "../components/ui";
import { fetchBackendEvents } from "../lib/backendEventsApi";
import { fetchMarketWarnings, type MarketWarningItem } from "../lib/marketApi";
import { fetchSystematicScan, type SystematicQuantResult } from "../lib/quantApi";
import { fetchDataQuality, type DataQualityReport } from "../lib/researchApi";
import { loadJournal, loadPortfolio } from "../lib/storage";
import type { Event, RiskAlert, RiskLevel } from "../lib/types";

const defaultSymbols = "2330,2382,2317,2308,3017,3037,3231,2603,2615,2454";
const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function RiskCenterPage() {
  const [symbolsText, setSymbolsText] = useState(defaultSymbols);
  const [events, setEvents] = useState<Event[]>([]);
  const [quantRows, setQuantRows] = useState<SystematicQuantResult[]>([]);
  const [qualityRows, setQualityRows] = useState<DataQualityReport[]>([]);
  const [marketWarnings, setMarketWarnings] = useState<MarketWarningItem[]>([]);
  const [marketWarningSourceNote, setMarketWarningSourceNote] = useState("官方注意股 / 處置股資料尚未載入。");
  const [message, setMessage] = useState("風控中心會優先使用後端事件、量化掃描、官方警示、資料品質與本機投組/日誌；後端不可用時才使用 fallback。 ");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const portfolio = useMemo(() => analyzePortfolioExposure(loadPortfolioSafe()), []);
  const behavior = useMemo(() => analyzeBehaviorRisk(loadJournalSafe()), []);
  const symbols = split(symbolsText);

  async function loadBackendRisks() {
    setLoading(true);
    setMessage("正在更新後端風控資料...");
    try {
      const [eventPayload, scanPayload, dataQuality, warningPayload] = await Promise.all([
        fetchBackendEvents({ days: 30, symbols }),
        fetchSystematicScan(symbols, "riskFirst", "1d", "1y"),
        fetchDataQuality(),
        fetchMarketWarnings(symbols)
      ]);
      setEvents(eventPayload.events);
      setQuantRows(scanPayload.results);
      setQualityRows(dataQuality);
      setMarketWarnings(warningPayload.items);
      setMarketWarningSourceNote(warningPayload.sourceNote);
      const warningProviderMessages = warningPayload.providerStatus
        .filter((row) => row.status === "error" || row.status === "degraded")
        .map((row) => `${row.provider}: ${row.message ?? row.status}`);
      setWarnings([...(eventPayload.error ? [eventPayload.error] : []), ...scanPayload.warnings, ...warningProviderMessages]);
      setMessage(`後端風控更新完成：事件 ${eventPayload.events.length} 筆、量化掃描 ${scanPayload.results.length} 檔、資料品質 ${dataQuality.length} 組、官方警示 ${warningPayload.items.length} 筆。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "後端風控資料取得失敗"]);
      setMessage("後端風控資料暫時不可用，目前僅顯示本機投組/日誌與 Demo fallback。 ");
      setEvents([]);
      setQuantRows([]);
      setQualityRows([]);
      setMarketWarnings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadBackendRisks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const eventAlerts = events.length ? buildEventAlerts(events, quantRows) : [];
  const officialWarningAlerts = buildOfficialWarningAlerts(marketWarnings);
  const dataAlerts = buildDataAlerts(qualityRows);
  const quantAlerts = buildQuantAlerts(quantRows);
  const behaviorAlerts = behavior.warnings.map((text, index) => ({
    id: `behavior-${index}`,
    severity: "medium" as const,
    category: "Behavior Risk" as const,
    message: text,
    suggestedAction: "新增事件風險前，先回到交易計畫與日誌檢查紀律。",
    createdAt: new Date().toISOString(),
    dataSource: "Estimated" as const,
    sourceNote: "由本機交易日誌產生。"
  }));

  const alerts = [...eventAlerts, ...officialWarningAlerts, ...quantAlerts, ...portfolio.alerts, ...behaviorAlerts, ...dataAlerts, ...(events.length || quantRows.length || marketWarnings.length ? [] : mockRiskAlerts)];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">RISK CENTER</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">風控中心</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">這裡不是找機會，而是防止大虧。事件、量化、官方注意/處置、投組、行為與資料品質都要能產生下一步。</p>
          </div>
          <div className="flex flex-wrap gap-2"><DataSourceBadge source={events.length || quantRows.length || marketWarnings.length ? "Cached" : "Demo"} /><button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={loading} onClick={() => void loadBackendRisks()}>{loading ? "更新中..." : "更新風控"}</button></div>
        </div>
      </section>

      <SectionCard title="風控資料來源">
        <div className="grid gap-3 md:grid-cols-5">
          <Metric label="後端事件" value={events.length} />
          <Metric label="量化掃描" value={quantRows.length} />
          <Metric label="官方警示" value={marketWarnings.length} />
          <Metric label="資料品質" value={qualityRows.length} />
          <Metric label="警示總數" value={alerts.length} />
        </div>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">官方警示來源：{marketWarningSourceNote}</p>
        <WarningList warnings={warnings} />
        <label className="mt-3 grid gap-1 text-xs text-slate-500">風控股票池<textarea className={`${inputClass} min-h-20`} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} /></label>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="事件風險"><RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Event Risk")} /></SectionCard>
        <SectionCard title="部位風險"><RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Position Risk")} /></SectionCard>
        <SectionCard title="投組風險"><RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Portfolio Risk")} /></SectionCard>
        <SectionCard title="行為風險"><RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Behavior Risk")} /></SectionCard>
        <SectionCard title="資料風險"><RiskAlertPanel alerts={alerts.filter((alert) => alert.category === "Data Risk")} /></SectionCard>
      </div>
    </div>
  );
}

function buildEventAlerts(events: Event[], quantRows: SystematicQuantResult[]): RiskAlert[] {
  const quantMap = new Map(quantRows.map((row) => [row.symbol, row]));
  return events.flatMap((event) => {
    const row = quantMap.get(event.symbol);
    const alerts: RiskAlert[] = [];
    if (event.marketAwareness >= 75) {
      alerts.push(makeAlert(`event-awareness-${event.id}`, "medium", "Event Risk", event.symbol, `${event.eventTitle} 市場知曉度偏高，可能已部分反應。`, "先檢查 K 線與量化過熱風險，避免追高。", "Cached", event.sourceNote));
    }
    if (event.confidence < 60) {
      alerts.push(makeAlert(`event-confidence-${event.id}`, "medium", "Event Risk", event.symbol, `${event.eventTitle} 事件可信度偏低。`, "僅列入觀察或等待官方來源確認。", "Cached", event.sourceNote));
    }
    if (row?.overheatRisk === "high" || row?.overheatRisk === "critical") {
      alerts.push(makeAlert(`event-overheat-${event.id}`, row.overheatRisk, "Event Risk", event.symbol, `${event.symbol} 量化過熱風險 ${row.overheatRisk}。`, row.nextAction, "Cached", row.explanation));
    }
    return alerts;
  }).slice(0, 16);
}

function buildOfficialWarningAlerts(rows: MarketWarningItem[]): RiskAlert[] {
  return rows.map((row) => makeAlert(
    `official-warning-${row.provider}-${row.warningType}-${row.symbol}-${row.effectiveDate ?? row.fetchedAt}`,
    row.severity,
    row.warningType === "disposition" ? "Position Risk" : "Event Risk",
    row.symbol,
    `${row.symbol} ${row.name} 被列為${row.warningType === "disposition" ? "處置股" : row.warningType === "attention" ? "注意股" : "市場警示標的"}：${row.reason}`,
    row.warningType === "disposition" ? "降低部位、避免追高，檢查流動性與分盤撮合風險。" : "先檢查是否已過熱與量價異常，不宜只因事件追高。",
    "Official",
    row.sourceNote
  ));
}

function buildQuantAlerts(rows: SystematicQuantResult[]): RiskAlert[] {
  return rows.filter((row) => !row.passedFilters || row.overheatRisk === "high" || row.overheatRisk === "critical").slice(0, 12).map((row) => makeAlert(
    `quant-risk-${row.symbol}`,
    row.overheatRisk === "critical" ? "critical" : row.overheatRisk === "high" ? "high" : "medium",
    "Position Risk",
    row.symbol,
    `${row.symbol} ${row.name} 未通過 risk-first 檢查：${row.rejectReasons.join("、") || row.overheatRisk}`,
    row.nextAction,
    row.dataSource === "Demo" ? "Demo" : "Cached",
    row.explanation
  ));
}

function buildDataAlerts(rows: DataQualityReport[]): RiskAlert[] {
  return rows.filter((row) => row.score < 80 || row.warning).map((row) => makeAlert(
    `data-quality-${row.dataset}-${row.provider}`,
    row.score < 50 ? "high" : "medium",
    "Data Risk",
    undefined,
    `${row.dataset} / ${row.provider} 資料品質分數 ${Math.round(row.score)}。${row.warning ?? ""}`,
    "檢查 Data Center、provider 狀態與 fallback 比例。",
    "Cached",
    `missing ${row.missingRate}%, stale ${row.staleRate}%, error ${row.errorRate}%`
  ));
}

function makeAlert(id: string, severity: RiskLevel, category: RiskAlert["category"], symbol: string | undefined, message: string, suggestedAction: string, dataSource: RiskAlert["dataSource"], sourceNote: string): RiskAlert {
  return { id, severity, category, symbol, message, suggestedAction, createdAt: new Date().toISOString(), dataSource, sourceNote };
}

function split(value: string): string[] { return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean); }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div></div>; }
function loadPortfolioSafe() { try { return loadPortfolio(); } catch { return mockPortfolio; } }
function loadJournalSafe() { try { const rows = loadJournal(); return rows.length ? rows : mockJournal; } catch { return mockJournal; } }

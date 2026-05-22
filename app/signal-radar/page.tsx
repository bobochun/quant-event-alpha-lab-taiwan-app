"use client";

import Link from "next/link";
import { useState } from "react";
import { DataSourceBadge, RiskBadge, ScoreBadge, SectionCard, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { fetchQuantModes, fetchSystematicScan, type QuantMode, type QuantModeConfig, type SystematicQuantResult } from "../lib/quantApi";

const defaultSymbols = "2330,2382,2317,2308,3017,3037,3231,2603,2615,8046";
const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";
const fallbackModes: QuantModeConfig[] = [
  { mode: "balanced", label: "平衡量化模式", description: "每日總排序。", bestFor: "快速掃描候選股。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "lowBase", label: "低基期轉強模式", description: "找未過熱、剛轉強。", bestFor: "事件尚未完全反應。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "momentumRotation", label: "動能輪動模式", description: "找資金輪動。", bestFor: "題材族群切換。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "pullback", label: "健康回檔模式", description: "找 MA20 附近回測。", bestFor: "事件後第一次回檔。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "overheatAvoidance", label: "避免過熱模式", description: "排除追高風險。", bestFor: "市場亢奮時。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "riskFirst", label: "風控優先模式", description: "降低波動與資料風險。", bestFor: "risk-off 或滿倉時。", weights: {}, hardFilters: [], warnings: [] }
];

export default function SignalRadarPage() {
  const [symbolsText, setSymbolsText] = useState(defaultSymbols);
  const [range, setRange] = useState("1y");
  const [interval, setInterval] = useState("1d");
  const [mode, setMode] = useState<QuantMode>("balanced");
  const [modes, setModes] = useState<QuantModeConfig[]>(fallbackModes);
  const [rows, setRows] = useState<SystematicQuantResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("選擇量化研究模式後，後端會依不同權重、硬性排除條件與風控規則排序。分數僅供研究，不構成投資建議。");

  async function loadModes() {
    try {
      setModes(await fetchQuantModes());
    } catch {
      setModes(fallbackModes);
    }
  }

  async function runScan() {
    setLoading(true);
    setMessage("正在呼叫後端系統化量化掃描 API...");
    await loadModes();
    try {
      const symbols = symbolsText.split(/[\s,，]+/).map((symbol) => symbol.trim()).filter(Boolean);
      const payload = await fetchSystematicScan(symbols, mode, interval, range);
      setRows(payload.results);
      setWarnings(payload.warnings);
      setMessage(`${payload.modeConfig.label} 完成：${payload.passedCount}/${payload.universeSize} 檔通過硬性篩選。資料來源依各檔 provider 顯示；Demo / fallback 不可視為正式即時行情。`);
    } catch (error) {
      setRows([]);
      setWarnings([error instanceof Error ? error.message : "後端系統化量化掃描失敗。"]);
      setMessage("量化掃描失敗；請確認 backend 已啟動，且 NEXT_PUBLIC_BACKEND_URL 指向正確後端。 ");
    } finally {
      setLoading(false);
    }
  }

  const selectedMode = modes.find((item) => item.mode === mode) ?? fallbackModes[0];
  const columns: Array<DataTableColumn<SystematicQuantResult>> = [
    { key: "rank", header: "排名", accessor: (row) => row.rank, sortValue: (row) => row.rank },
    { key: "symbol", header: "代號", accessor: (row) => <span className="font-semibold text-slate-950">{row.symbol}</span>, searchValue: (row) => row.symbol },
    { key: "name", header: "名稱", accessor: (row) => row.name, searchValue: (row) => row.name },
    { key: "systematic", header: "模式分數", accessor: (row) => <ScoreBadge score={row.systematicScore} />, sortValue: (row) => row.systematicScore },
    { key: "base", header: "基礎分數", accessor: (row) => row.baseQuantScore.toFixed(1), sortValue: (row) => row.baseQuantScore },
    { key: "passed", header: "硬篩", accessor: (row) => row.passedFilters ? <span className="text-emerald-700">通過</span> : <span className="text-amber-700">排除</span>, sortValue: (row) => row.passedFilters ? 1 : 0 },
    { key: "trend", header: "趨勢", accessor: (row) => trendLabel(row.trendState), searchValue: (row) => row.trendState },
    { key: "momentum", header: "動能", accessor: (row) => momentumLabel(row.momentumState), searchValue: (row) => row.momentumState },
    { key: "overheat", header: "過熱", accessor: (row) => <RiskBadge level={row.overheatRisk} />, sortValue: (row) => riskSort(row.overheatRisk) },
    { key: "action", header: "下一步", accessor: (row) => row.nextAction, searchValue: (row) => row.nextAction },
    { key: "drivers", header: "主要驅動", accessor: (row) => <span className="block max-w-72 truncate" title={row.keyDrivers.join("、")}>{row.keyDrivers.slice(0, 2).join("、")}</span>, searchValue: (row) => row.keyDrivers.join(" ") },
    { key: "source", header: "來源", accessor: (row) => <DataSourceBadge source={normalizeSource(row.dataSource)} />, searchValue: (row) => `${row.provider} ${row.dataSource}` }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">SYSTEMATIC SIGNAL RADAR</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">系統化量化訊號雷達</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">不是只有一個總分，而是依研究目的切換不同模式：平衡、低基期、動能輪動、健康回檔、避免過熱、風控優先。每個模式有不同權重、硬性排除條件與下一步建議。</p>
      </section>

      <SectionCard title="量化模式">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modes.map((item) => (
            <button key={item.mode} onClick={() => setMode(item.mode)} className={`rounded-lg border p-3 text-left ${mode === item.mode ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <div className="font-semibold text-slate-950">{item.label}</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">{item.description}</div>
              <div className="mt-2 text-xs text-emerald-700">適合：{item.bestFor}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <div className="font-semibold text-slate-950">目前模式：{selectedMode.label}</div>
          <div>硬性條件：{selectedMode.hardFilters.length ? selectedMode.hardFilters.join("、") : "無"}</div>
          <div>提醒：{selectedMode.warnings.join("、") || "無"}</div>
        </div>
      </SectionCard>

      <SectionCard title="掃描設定">
        <div className="grid gap-3 lg:grid-cols-[1fr_120px_120px_auto] lg:items-end">
          <label className="grid gap-1 text-xs text-slate-500">股票代號<textarea className={`${inputClass} min-h-20`} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} placeholder="2330,2382,2317" /></label>
          <label className="grid gap-1 text-xs text-slate-500">週期<select className={inputClass} value={interval} onChange={(event) => setInterval(event.target.value)}><option value="1d">日 K</option><option value="1w">週 K</option><option value="1mo">月 K</option></select></label>
          <label className="grid gap-1 text-xs text-slate-500">區間<select className={inputClass} value={range} onChange={(event) => setRange(event.target.value)}><option value="3m">3M</option><option value="6m">6M</option><option value="1y">1Y</option><option value="3y">3Y</option><option value="5y">5Y</option></select></label>
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void runScan()} disabled={loading}>{loading ? "掃描中..." : "開始模式掃描"}</button>
        </div>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>

      <SectionCard title="模式化排序結果">
        <DataTable rows={rows} columns={columns} emptyMessage="尚未執行掃描。" renderExpanded={(row) => <QuantDetails row={row} />} primaryAction={(row) => (
          <div className="flex flex-wrap gap-2 text-xs">
            <Link className="rounded border border-cyan-300 bg-cyan-50 px-2 py-1 text-cyan-800" href={`/market?symbol=${row.symbol}`}>查看 K 線</Link>
            <Link className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800" href={`/trade-plan?symbol=${row.symbol}&from=signal-radar`}>建立交易計畫</Link>
          </div>
        )} />
        <WarningList warnings={warnings} />
      </SectionCard>
    </div>
  );
}

function QuantDetails({ row }: { row: SystematicQuantResult }) {
  return (
    <div className="grid gap-3 text-sm text-slate-600 lg:grid-cols-2">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="font-semibold text-slate-950">模式分數說明</div>
        <p className="mt-2 leading-6">{row.explanation}</p>
        <ul className="mt-3 space-y-1">
          <li>百分位：{row.percentile}%</li>
          <li>硬性篩選：{row.passedFilters ? "通過" : "未通過"}</li>
          <li>排除原因：{row.rejectReasons.length ? row.rejectReasons.join("、") : "無"}</li>
        </ul>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="font-semibold text-slate-950">Key Drivers / Warnings</div>
        <div className="mt-2 flex flex-wrap gap-2">{row.keyDrivers.map((item) => <span key={item} className="rounded bg-white px-2 py-1 text-xs text-slate-700">{item}</span>)}</div>
        <p className="mt-3 text-xs text-slate-500">Provider：{row.provider} / {row.dataSource}</p>
        <WarningList warnings={row.warnings} />
      </div>
    </div>
  );
}

function trendLabel(value: string): string {
  return value === "bullish" ? "多頭" : value === "bearish" ? "空頭" : value === "sideways" ? "盤整" : "未知";
}

function momentumLabel(value: string): string {
  return value === "warming" ? "升溫" : value === "hot" ? "過熱" : value === "cooling" ? "降溫" : value === "weak" ? "偏弱" : "未知";
}

function riskSort(level: string): number {
  return level === "critical" ? 4 : level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function normalizeSource(source: string): "Real" | "Official" | "Cached" | "Manual" | "Imported" | "Estimated" | "Demo" | "Missing" | "Error" {
  if (["Real", "Official", "Cached", "Manual", "Imported", "Estimated", "Demo", "Missing", "Error"].includes(source)) return source as ReturnType<typeof normalizeSource>;
  if (source === "DelayedFallback") return "Cached";
  return "Estimated";
}

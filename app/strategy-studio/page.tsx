"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScoreBadge, SectionCard, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { fetchQuantModes, fetchSystematicScan, type QuantMode, type QuantModeConfig, type SystematicQuantResult } from "../lib/quantApi";
import { fetchThemeStrength, optimizePortfolio, runTradingCost, type PortfolioOptimizeResult, type ThemeStrengthRow, type TradingCostResult } from "../lib/researchApi";

const defaultSymbols = "2330,2382,2317,2308,3017,3037,3231,2603,2615,2454";
const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";
const fallbackModes: QuantModeConfig[] = [
  { mode: "balanced", label: "平衡量化模式", description: "每日總排序。", bestFor: "快速掃描候選股。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "lowBase", label: "低基期轉強模式", description: "找未過熱、剛轉強。", bestFor: "事件尚未完全反應。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "momentumRotation", label: "動能輪動模式", description: "找資金輪動。", bestFor: "題材族群切換。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "pullback", label: "健康回檔模式", description: "找 MA20 附近回測。", bestFor: "事件後第一次回檔。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "overheatAvoidance", label: "避免過熱模式", description: "排除追高風險。", bestFor: "市場亢奮時。", weights: {}, hardFilters: [], warnings: [] },
  { mode: "riskFirst", label: "風控優先模式", description: "降低波動與資料風險。", bestFor: "risk-off 或滿倉時。", weights: {}, hardFilters: [], warnings: [] }
];

export default function StrategyStudioPage() {
  const [symbolsText, setSymbolsText] = useState(defaultSymbols);
  const [mode, setMode] = useState<QuantMode>("balanced");
  const [modes, setModes] = useState<QuantModeConfig[]>(fallbackModes);
  const [scanRows, setScanRows] = useState<SystematicQuantResult[]>([]);
  const [themes, setThemes] = useState<ThemeStrengthRow[]>([]);
  const [cost, setCost] = useState<TradingCostResult | null>(null);
  const [optimizer, setOptimizer] = useState<PortfolioOptimizeResult | null>(null);
  const [message, setMessage] = useState("策略工作室將量化模式、題材強弱、交易成本與投組權重放在同一頁，用於建立研究 playbook。結果僅供研究，不構成投資建議。 ");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const symbols = split(symbolsText);
  const selectedMode = modes.find((item) => item.mode === mode) ?? fallbackModes[0];

  useEffect(() => { void fetchQuantModes().then(setModes).catch(() => setModes(fallbackModes)); }, []);

  async function runStudio() {
    setLoading(true);
    setMessage("正在執行策略工作室分析...");
    try {
      const [scan, themeRows, costResult, opt] = await Promise.all([
        fetchSystematicScan(symbols, mode, "1d", "1y"),
        fetchThemeStrength(symbols),
        runTradingCost({ price: 100, shares: 1000, side: "roundTrip" }),
        optimizePortfolio({ capital: 1_000_000, maxPositionPct: 0.2, maxThemePct: 0.4, symbols, themeMap: { "AI server": ["2330", "2382", "2317", "3231"], Semiconductor: ["2330", "2454"], Shipping: ["2603", "2615"] } })
      ]);
      setScanRows(scan.results);
      setThemes(themeRows);
      setCost(costResult);
      setOptimizer(opt);
      setWarnings([...scan.warnings, ...opt.warnings]);
      setMessage(`${scan.modeConfig.label} 完成：${scan.passedCount}/${scan.universeSize} 通過硬性篩選。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "Strategy Studio failed"]);
      setMessage("策略工作室執行失敗，請確認 backend 已啟動。 ");
    } finally {
      setLoading(false);
    }
  }

  const columns: Array<DataTableColumn<SystematicQuantResult>> = [
    { key: "rank", header: "排名", accessor: (row) => row.rank, sortValue: (row) => row.rank },
    { key: "symbol", header: "代號", accessor: (row) => <span className="font-semibold text-slate-950">{row.symbol}</span>, searchValue: (row) => row.symbol },
    { key: "name", header: "名稱", accessor: (row) => row.name, searchValue: (row) => row.name },
    { key: "score", header: "模式分數", accessor: (row) => <ScoreBadge score={row.systematicScore} />, sortValue: (row) => row.systematicScore },
    { key: "base", header: "基礎分", accessor: (row) => row.baseQuantScore.toFixed(1), sortValue: (row) => row.baseQuantScore },
    { key: "pass", header: "硬篩", accessor: (row) => row.passedFilters ? "通過" : "排除", sortValue: (row) => row.passedFilters ? 1 : 0 },
    { key: "action", header: "下一步", accessor: (row) => row.nextAction, searchValue: (row) => row.nextAction },
    { key: "drivers", header: "Key drivers", accessor: (row) => <span className="block max-w-72 truncate" title={row.keyDrivers.join("、")}>{row.keyDrivers.slice(0, 2).join("、")}</span>, searchValue: (row) => row.keyDrivers.join(" ") }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">STRATEGY STUDIO MVP</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">策略工作室</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">把不同量化研究模式、題材強弱矩陣、交易成本與投組權重放在同一頁，幫你把單次掃描整理成策略 playbook。</p>
      </section>

      <SectionCard title="策略模式選擇">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modes.map((item) => <button key={item.mode} onClick={() => setMode(item.mode)} className={`rounded-lg border p-3 text-left ${mode === item.mode ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}><div className="font-semibold text-slate-950">{item.label}</div><div className="mt-1 text-xs leading-5 text-slate-600">{item.description}</div><div className="mt-2 text-xs text-emerald-700">適合：{item.bestFor}</div></button>)}
        </div>
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600"><div className="font-semibold text-slate-950">目前：{selectedMode.label}</div><div>硬性條件：{selectedMode.hardFilters.length ? selectedMode.hardFilters.join("、") : "無"}</div><div>提醒：{selectedMode.warnings.join("、") || "無"}</div></div>
      </SectionCard>

      <SectionCard title="策略執行設定">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-1 text-xs text-slate-500">股票池<textarea className={`${inputClass} min-h-20`} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} /></label>
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void runStudio()} disabled={loading}>{loading ? "執行中..." : "產生策略 Playbook"}</button>
        </div>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>

      <SectionCard title="模式掃描結果">
        <DataTable rows={scanRows} columns={columns} emptyMessage="尚未執行策略掃描。" primaryAction={(row) => <div className="flex flex-wrap gap-2 text-xs"><Link className="rounded border border-cyan-300 bg-cyan-50 px-2 py-1 text-cyan-800" href={`/market?symbol=${row.symbol}`}>K 線</Link><Link className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-800" href={`/trade-plan?symbol=${row.symbol}&from=strategy-studio`}>交易計畫</Link></div>} />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="題材強弱矩陣">
          <div className="space-y-2">{themes.slice(0, 6).map((row) => <div key={row.theme} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs"><div className="flex justify-between"><span className="font-semibold text-slate-950">#{row.rank} {row.theme}</span><ScoreBadge score={row.averageScore} /></div><div className="mt-1 text-slate-500">{row.symbols.join("、")} / hot {row.hotCount} / overheated {row.overheatedCount}</div></div>)}</div>
        </SectionCard>
        <SectionCard title="成本假設">
          {cost ? <div className="space-y-2 text-sm"><Metric label="Round-trip 成本" value={`NT$${Math.round(cost.totalCost).toLocaleString("zh-TW")}`} /><Metric label="成本率" value={`${cost.costPct.toFixed(3)}%`} /><p className="text-xs leading-5 text-slate-500">{cost.note}</p></div> : <p className="text-sm text-slate-500">尚未計算。</p>}
        </SectionCard>
        <SectionCard title="投組權重建議">
          <div className="space-y-2">{optimizer?.weights.slice(0, 6).map((row) => <div key={row.symbol} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs"><div className="flex justify-between"><span className="font-semibold text-slate-950">{row.symbol}</span><span>{row.weightPct.toFixed(1)}%</span></div><div className="mt-1 text-slate-500">{row.reason}</div></div>) ?? <p className="text-sm text-slate-500">尚未產生。</p>}</div>
        </SectionCard>
      </div>

      <WarningList warnings={warnings} />
    </div>
  );
}

function split(value: string): string[] { return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean); }
function Metric({ label, value }: { label: string; value: string }) { return <div className="flex justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-950">{value}</span></div>; }

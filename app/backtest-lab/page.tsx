"use client";

import { useState } from "react";
import { DataSourceBadge, ScoreBadge, SectionCard, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { fetchCrossSection, fetchDataQuality, fetchWalkForward, optimizePortfolio, runTradingCost, type CrossSectionRank, type DataQualityReport, type PortfolioOptimizeResult, type TradingCostResult, type WalkForwardResult } from "../lib/researchApi";
import type { DataSource } from "../lib/types";

const defaultSymbols = "2330,2382,2317,2308,3017,3037,3231,2603,2615,2454";
const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";
const DATA_SOURCES: DataSource[] = ["Real", "Official", "Cached", "Manual", "Imported", "Estimated", "Demo", "Missing", "Error"];

export default function BacktestLabPage() {
  const [symbolsText, setSymbolsText] = useState(defaultSymbols);
  const [ranks, setRanks] = useState<CrossSectionRank[]>([]);
  const [quality, setQuality] = useState<DataQualityReport[]>([]);
  const [walkForward, setWalkForward] = useState<WalkForwardResult | null>(null);
  const [cost, setCost] = useState<TradingCostResult | null>(null);
  const [optimizer, setOptimizer] = useState<PortfolioOptimizeResult | null>(null);
  const [message, setMessage] = useState("這裡先做 MVP 研究工具：橫截面排名、交易成本、投組權重、walk-forward 摘要與資料品質。結果僅供研究，不構成投資建議。");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const symbols = split(symbolsText);

  async function runResearchPack() {
    setLoading(true);
    setMessage("正在呼叫後端 research APIs...");
    try {
      const [cross, wf, dq, tc, opt] = await Promise.all([
        fetchCrossSection(symbols, false),
        fetchWalkForward(symbols),
        fetchDataQuality(),
        runTradingCost({ price: 100, shares: 1000, side: "roundTrip" }),
        optimizePortfolio({ capital: 1_000_000, maxPositionPct: 0.2, maxThemePct: 0.4, symbols, themeMap: { "AI server": ["2330", "2382", "2317", "3231"], Semiconductor: ["2330", "2454"], Shipping: ["2603", "2615"] } })
      ]);
      setRanks(cross.ranks);
      setWalkForward(wf);
      setQuality(dq);
      setCost(tc);
      setOptimizer(opt);
      setWarnings([...cross.warnings, ...wf.warnings, ...opt.warnings]);
      setMessage(`完成 ${cross.universeSize} 檔橫截面排序、交易成本、投組 optimizer 與 walk-forward MVP。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "Research APIs failed"]);
      setMessage("研究工具執行失敗，請確認 backend 已啟動。 ");
    } finally {
      setLoading(false);
    }
  }

  const columns: Array<DataTableColumn<CrossSectionRank>> = [
    { key: "rank", header: "排名", accessor: (row) => row.rank, sortValue: (row) => row.rank },
    { key: "symbol", header: "代號", accessor: (row) => <span className="font-semibold text-slate-950">{row.symbol}</span>, searchValue: (row) => row.symbol },
    { key: "name", header: "名稱", accessor: (row) => row.name, searchValue: (row) => row.name },
    { key: "score", header: "Quant", accessor: (row) => <ScoreBadge score={row.quantScore} />, sortValue: (row) => row.quantScore },
    { key: "percentile", header: "百分位", accessor: (row) => `${row.percentile.toFixed(1)}%`, sortValue: (row) => row.percentile },
    { key: "trend", header: "趨勢", accessor: (row) => translate(row.trendState), searchValue: (row) => row.trendState },
    { key: "momentum", header: "動能", accessor: (row) => translate(row.momentumState), searchValue: (row) => row.momentumState },
    { key: "source", header: "來源", accessor: (row) => <DataSourceBadge source={normalizeSource(row.dataSource)} />, searchValue: (row) => row.dataSource }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">BACKTEST LAB MVP</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">回測實驗室</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">先把研究需要的核心工具補齊：橫截面分數、交易成本、投組權重、資料品質與 walk-forward 骨架。正式策略回測之後可接歷史事件樣本與 price_bars。</p>
      </section>

      <SectionCard title="研究股票池">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-1 text-xs text-slate-500">股票代號<textarea className={`${inputClass} min-h-20`} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} /></label>
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void runResearchPack()} disabled={loading}>{loading ? "執行中..." : "執行研究工具包"}</button>
        </div>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>

      <SectionCard title="橫截面量化排名">
        <DataTable rows={ranks} columns={columns} emptyMessage="尚未執行橫截面排名。" />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="交易成本模型">
          {cost ? <MetricList items={[ ["成交金額", money(cost.notional)], ["手續費", money(cost.fee)], ["交易稅", money(cost.tax)], ["滑價", money(cost.slippage)], ["總成本", money(cost.totalCost)], ["成本率", `${cost.costPct.toFixed(3)}%`] ]} note={cost.note} /> : <p className="text-sm text-slate-500">尚未計算。</p>}
        </SectionCard>
        <SectionCard title="Walk-forward 摘要">
          {walkForward ? <MetricList items={[ ["模型", walkForward.modelVersion], ["訓練區間", `${walkForward.trainStart} ~ ${walkForward.trainEnd}`], ["測試區間", `${walkForward.testStart} ~ ${walkForward.testEnd}`], ["樣本數", String(walkForward.sampleSize)], ["Hit Rate", nullablePct(walkForward.hitRate)], ["平均 forward return", nullablePct(walkForward.averageForwardReturn)] ]} note={walkForward.sourceNote} /> : <p className="text-sm text-slate-500">尚未執行。</p>}
        </SectionCard>
        <SectionCard title="資料品質">
          <div className="space-y-2">{quality.slice(0, 5).map((row) => <div key={`${row.dataset}-${row.provider}`} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs"><div className="flex justify-between"><span>{row.dataset}</span><ScoreBadge score={row.score} /></div><div className="mt-1 text-slate-500">{row.provider} / missing {row.missingRate}% / stale {row.staleRate}%</div></div>)}</div>
        </SectionCard>
      </div>

      <SectionCard title="簡易投組 Optimizer">
        {optimizer ? <div className="grid gap-3 lg:grid-cols-2">{optimizer.weights.map((row) => <div key={row.symbol} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span className="font-semibold text-slate-950">{row.symbol}</span><span>{row.weightPct.toFixed(1)}%</span></div><div className="mt-1 text-xs text-slate-500">建議金額 {money(row.suggestedValue)} / {row.reason}</div></div>)}</div> : <p className="text-sm text-slate-500">尚未執行 optimizer。</p>}
        <WarningList warnings={warnings} />
      </SectionCard>
    </div>
  );
}

function split(value: string): string[] { return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean); }
function money(value: number): string { return `NT$${Math.round(value).toLocaleString("zh-TW")}`; }
function nullablePct(value?: number | null): string { return value === null || value === undefined ? "資料不足" : `${value.toFixed(2)}%`; }
function translate(value: string): string { return value === "bullish" ? "多頭" : value === "bearish" ? "空頭" : value === "sideways" ? "盤整" : value === "warming" ? "升溫" : value === "hot" ? "過熱" : value === "cooling" ? "降溫" : value === "weak" ? "偏弱" : value; }
function normalizeSource(source: string): DataSource { return DATA_SOURCES.includes(source as DataSource) ? source as DataSource : "Estimated"; }
function MetricList({ items, note }: { items: Array<[string, string]>; note?: string }) { return <div className="space-y-2 text-sm">{items.map(([label, value]) => <div key={label} className="flex justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-950">{value}</span></div>)}{note ? <p className="text-xs leading-5 text-slate-500">{note}</p> : null}</div>; }

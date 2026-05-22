"use client";

import Link from "next/link";
import { useState } from "react";
import { DataSourceBadge, RiskBadge, ScoreBadge, SectionCard, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { fetchQuantBatch, type QuantAnalysisResult } from "../lib/quantApi";

const defaultSymbols = "2330,2382,2317,2308,3017,3037,3231,2603,2615,8046";
const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function SignalRadarPage() {
  const [symbolsText, setSymbolsText] = useState(defaultSymbols);
  const [range, setRange] = useState("1y");
  const [interval, setInterval] = useState("1d");
  const [rows, setRows] = useState<QuantAnalysisResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("輸入股票代號後，後端會抓 K 線並計算趨勢、動能、波動、RSI、MA 結構與過熱風險。分數僅供研究，不構成投資建議。");

  async function runScan() {
    setLoading(true);
    setMessage("正在呼叫後端量化分析 API...");
    try {
      const symbols = symbolsText.split(/[\s,，]+/).map((symbol) => symbol.trim()).filter(Boolean);
      const payload = await fetchQuantBatch(symbols, interval, range);
      setRows(payload.results);
      setWarnings(payload.warnings);
      setMessage(`完成 ${payload.results.length} 檔量化分析。資料來源依各檔 provider 顯示；Demo / fallback 不可視為正式即時行情。`);
    } catch (error) {
      setRows([]);
      setWarnings([error instanceof Error ? error.message : "後端量化分析失敗。"]);
      setMessage("量化分析失敗；請確認 backend 已啟動，且 NEXT_PUBLIC_BACKEND_URL 指向正確後端。 ");
    } finally {
      setLoading(false);
    }
  }

  const columns: Array<DataTableColumn<QuantAnalysisResult>> = [
    { key: "symbol", header: "代號", accessor: (row) => <span className="font-semibold text-slate-950">{row.symbol}</span>, searchValue: (row) => row.symbol },
    { key: "name", header: "名稱", accessor: (row) => row.name, searchValue: (row) => row.name },
    { key: "score", header: "量化分數", accessor: (row) => <ScoreBadge score={row.quantScore} />, sortValue: (row) => row.quantScore },
    { key: "trend", header: "趨勢", accessor: (row) => trendLabel(row.trendState), searchValue: (row) => row.trendState },
    { key: "momentum", header: "動能", accessor: (row) => momentumLabel(row.momentumState), searchValue: (row) => row.momentumState },
    { key: "overheat", header: "過熱", accessor: (row) => <RiskBadge level={row.overheatRisk} />, sortValue: (row) => riskSort(row.overheatRisk) },
    { key: "close", header: "收盤", accessor: (row) => row.latestClose?.toFixed(2) ?? "-", sortValue: (row) => row.latestClose ?? 0 },
    { key: "r20", header: "20日%", accessor: (row) => formatPct(row.return20d), sortValue: (row) => row.return20d ?? 0 },
    { key: "r60", header: "60日%", accessor: (row) => formatPct(row.return60d), sortValue: (row) => row.return60d ?? 0 },
    { key: "rsi", header: "RSI14", accessor: (row) => row.rsi14?.toFixed(1) ?? "-", sortValue: (row) => row.rsi14 ?? 0 },
    { key: "vol", header: "波動", accessor: (row) => formatPct(row.volatility20d), sortValue: (row) => row.volatility20d ?? 0 },
    { key: "volume", header: "量比", accessor: (row) => row.volumeRatio20d?.toFixed(2) ?? "-", sortValue: (row) => row.volumeRatio20d ?? 0 },
    { key: "action", header: "下一步", accessor: (row) => row.nextAction, searchValue: (row) => row.nextAction },
    { key: "source", header: "來源", accessor: (row) => <DataSourceBadge source={normalizeSource(row.dataSource)} />, searchValue: (row) => `${row.provider} ${row.dataSource}` }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">SIGNAL RADAR</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">後端量化訊號雷達</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">用後端 K 線資料計算多因子量化分數，包含趨勢、動能、波動、RSI、MA 結構、成交量與過熱懲罰。這是研究排序工具，不是買賣建議。</p>
      </section>

      <SectionCard title="掃描設定">
        <div className="grid gap-3 lg:grid-cols-[1fr_120px_120px_auto] lg:items-end">
          <label className="grid gap-1 text-xs text-slate-500">股票代號<textarea className={`${inputClass} min-h-20`} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} placeholder="2330,2382,2317" /></label>
          <label className="grid gap-1 text-xs text-slate-500">週期<select className={inputClass} value={interval} onChange={(event) => setInterval(event.target.value)}><option value="1d">日 K</option><option value="1w">週 K</option><option value="1mo">月 K</option></select></label>
          <label className="grid gap-1 text-xs text-slate-500">區間<select className={inputClass} value={range} onChange={(event) => setRange(event.target.value)}><option value="3m">3M</option><option value="6m">6M</option><option value="1y">1Y</option><option value="3y">3Y</option><option value="5y">5Y</option></select></label>
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void runScan()} disabled={loading}>{loading ? "掃描中..." : "開始量化掃描"}</button>
        </div>
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>

      <SectionCard title="量化排序結果">
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

function QuantDetails({ row }: { row: QuantAnalysisResult }) {
  return (
    <div className="grid gap-3 text-sm text-slate-600 lg:grid-cols-2">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="font-semibold text-slate-950">分數拆解</div>
        <ul className="mt-2 space-y-1">
          <li>趨勢：{row.breakdown.trendScore}</li>
          <li>動能：{row.breakdown.momentumScore}</li>
          <li>波動：{row.breakdown.volatilityScore}</li>
          <li>RSI：{row.breakdown.rsiScore}</li>
          <li>MA 結構：{row.breakdown.maStructureScore}</li>
          <li>成交量：{row.breakdown.volumeScore}</li>
          <li>過熱扣分：-{row.breakdown.overheatPenalty}</li>
          <li>資料品質扣分：-{row.breakdown.dataQualityPenalty}</li>
        </ul>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="font-semibold text-slate-950">說明</div>
        <p className="mt-2 leading-6">{row.explanation}</p>
        <p className="mt-2 text-xs text-slate-500">Provider：{row.provider} / {row.dataSource}；更新：{row.fetchedAt}</p>
        <WarningList warnings={row.warnings} />
      </div>
    </div>
  );
}

function formatPct(value?: number | null): string {
  return value === null || value === undefined ? "-" : `${value.toFixed(2)}%`;
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

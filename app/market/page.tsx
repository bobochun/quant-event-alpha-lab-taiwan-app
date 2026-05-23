"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DataSourceNotice } from "../components/market/DataSourceNotice";
import { IntervalSelector } from "../components/market/IntervalSelector";
import { KLineChart } from "../components/market/KLineChart";
import { QuoteCard } from "../components/market/QuoteCard";
import { RangeSelector } from "../components/market/RangeSelector";
import { SymbolSearch } from "../components/market/SymbolSearch";
import { DataSourceBadge, RiskBadge, ScoreBadge, WarningList } from "../components/ui";
import { fetchKLine, fetchLatestQuote, fetchMarketSummary, fetchMarketWarnings, supportsRealtimePolling, type KLinePayload, type MarketInterval, type MarketRange, type MarketSummaryPayload, type MarketWarningItem, type QuoteData } from "../lib/marketApi";
import type { DataSource } from "../lib/types";

const DATA_SOURCES: DataSource[] = ["Real", "Official", "Cached", "Manual", "Imported", "Estimated", "Demo", "Missing", "Error"];

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">正在載入報價頁...</div>}>
      <MarketPageContent />
    </Suspense>
  );
}

function MarketPageContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") ?? "2330";
  const [symbol, setSymbol] = useState(initialSymbol);
  const [range, setRange] = useState<MarketRange>("1y");
  const [interval, setInterval] = useState<MarketInterval>("1d");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [kline, setKline] = useState<KLinePayload | null>(null);
  const [summary, setSummary] = useState<MarketSummaryPayload | null>(null);
  const [officialWarnings, setOfficialWarnings] = useState<MarketWarningItem[]>([]);
  const [officialWarningNote, setOfficialWarningNote] = useState("官方注意股 / 處置股資料尚未載入。");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const canAutoRefresh = supportsRealtimePolling(quote);

  async function load(nextSymbol = symbol, nextInterval = interval, nextRange = range) {
    setLoading(true);
    const [quoteResult, klineResult, summaryResult, warningResult] = await Promise.all([
      fetchLatestQuote(nextSymbol),
      fetchKLine(nextSymbol, nextInterval, nextRange),
      fetchMarketSummary(nextSymbol),
      fetchMarketWarnings([nextSymbol])
    ]);
    setQuote(quoteResult);
    setKline(klineResult);
    setSummary(summaryResult);
    setOfficialWarnings(warningResult.items);
    setOfficialWarningNote(warningResult.sourceNote);
    setLoading(false);
    setCountdown(30);
  }

  useEffect(() => {
    void load(initialSymbol, interval, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh || !canAutoRefresh) return;
    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          void load();
          return 30;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, canAutoRefresh, symbol, interval, range]);

  const refreshNote = useMemo(() => {
    if (!quote) return "尚未取得資料。";
    if (quote.isRealtime) return "目前 provider 標示為即時或近即時，可手動開啟自動刷新。";
    return "目前為盤後 / 延遲 / fallback 資料，頻繁刷新沒有意義。";
  }, [quote]);

  function submitSymbol(nextSymbol: string) {
    setSymbol(nextSymbol);
    void load(nextSymbol, interval, range);
  }

  function changeRange(nextRange: MarketRange) {
    setRange(nextRange);
    void load(symbol, interval, nextRange);
  }

  function changeInterval(nextInterval: MarketInterval) {
    setInterval(nextInterval);
    void load(symbol, nextInterval, range);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">MARKET DATA</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">即時報價、K 線與個股研究摘要</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          輸入台股代號查詢最新報價、K 線、技術摘要、外資 / 投信 / 自營商籌碼與個股重要資訊。免費、官方或 fallback 資料會明確標示即時性、延遲與來源，不會把非即時資料包裝成正式即時行情。
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
          <SymbolSearch initialSymbol={symbol} onSubmit={submitSymbol} />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => void load()}>重新整理</button>
            <label className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${canAutoRefresh ? "border-cyan-200 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
              <input type="checkbox" checked={autoRefresh} disabled={!canAutoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
              自動刷新 {autoRefresh && canAutoRefresh ? `${countdown}s` : ""}
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{refreshNote}</p>
      </section>

      <DataSourceNotice quote={quote} kline={kline} />
      <QuoteCard quote={quote} loading={loading} />
      <OfficialWarningPanel symbol={symbol} warnings={officialWarnings} note={officialWarningNote} loading={loading} />
      <MarketSummaryPanel summary={summary} loading={loading} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-500">股價區間</div>
            <RangeSelector value={range} onChange={changeRange} />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-500">K 線週期</div>
            <IntervalSelector value={interval} quote={quote} onChange={changeInterval} />
          </div>
        </div>
      </section>

      <KLineChart payload={kline} loading={loading} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" href={`/event-radar?symbol=${symbol}`}>回事件雷達</Link>
          <Link className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800" href={`/signal-radar?symbol=${symbol}`}>量化模式掃描</Link>
          <Link className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href={`/trade-plan?symbol=${symbol}&from=market`}>建立交易計畫</Link>
        </div>
        <p className="mt-3 text-xs leading-5 text-amber-700">帶入最新價只能作為研究參考，請自行確認價格、流動性、注意/處置狀態與風險，不代表建議進場。</p>
      </section>
    </div>
  );
}

function OfficialWarningPanel({ symbol, warnings, note, loading }: { symbol: string; warnings: MarketWarningItem[]; note: string; loading: boolean }) {
  if (loading && !warnings.length) {
    return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-500">正在檢查官方注意股 / 處置股...</section>;
  }
  return (
    <section className={`rounded-lg border p-5 shadow-sm ${warnings.length ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">OFFICIAL RISK FLAGS</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">官方注意 / 處置檢查</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">{symbol} 的 TWSE / TPEx 注意股、處置股或匯入警示狀態。endpoint 未設定時會顯示空資料，不會用 Demo 冒充。</p>
        </div>
        <DataSourceBadge source={warnings.length ? "Official" : "Missing"} />
      </div>
      {warnings.length ? (
        <div className="mt-3 grid gap-2">
          {warnings.map((warning) => (
            <div key={`${warning.provider}-${warning.warningType}-${warning.symbol}-${warning.effectiveDate ?? warning.fetchedAt}`} className="rounded-md border border-amber-200 bg-white p-3 text-sm text-amber-950">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={warning.severity} />
                <span className="font-semibold">{warning.warningType === "disposition" ? "處置股" : warning.warningType === "attention" ? "注意股" : "市場警示"}</span>
                <span className="text-xs text-slate-500">{warning.provider} / {warning.market}</span>
                <span className="text-xs text-slate-500">{warning.effectiveDate ?? "日期未知"}{warning.endDate ? ` ~ ${warning.endDate}` : ""}</span>
              </div>
              <p className="mt-2 text-xs leading-5">{warning.reason}</p>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">{warning.sourceNote}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">目前未命中已設定 endpoint 的官方注意 / 處置資料。仍需自行確認最新交易所公告。</p>
      )}
      <p className="mt-3 text-xs leading-5 text-amber-700">{note}</p>
    </section>
  );
}

function MarketSummaryPanel({ summary, loading }: { summary: MarketSummaryPayload | null; loading: boolean }) {
  if (loading && !summary) {
    return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-500">正在載入個股研究摘要...</section>;
  }
  if (!summary) return null;
  const flow = summary.institutionalFlow;
  const technical = summary.technical;
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700">STOCK RESEARCH SNAPSHOT</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{summary.symbol} {summary.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{summary.profile.market} / {summary.profile.industry ?? "Unknown"} / {summary.profile.assetType}</p>
        </div>
        <DataSourceBadge source={normalizeDataSource(summary.profile.dataSource)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-500">個股重要資訊</div>
          <div className="mt-2 flex flex-wrap gap-2">{summary.profile.themes.map((theme) => <span key={theme} className="rounded bg-white px-2 py-1 text-xs text-slate-700">{theme}</span>)}</div>
          <p className="mt-3 text-xs leading-5 text-slate-500">{summary.profile.marketCapNote}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{summary.profile.liquidityNote}</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-500">技術摘要</div>
          {technical ? <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
            <Metric label="趨勢" value={translateState(technical.trendState)} />
            <Metric label="動能" value={translateState(technical.momentumState)} />
            <Metric label="RSI14" value={formatNumber(technical.rsi14)} />
            <Metric label="量比20D" value={formatNumber(technical.volumeRatio20d)} />
            <Metric label="20日報酬" value={formatPct(technical.return20d)} />
            <Metric label="60日報酬" value={formatPct(technical.return60d)} />
          </div> : <p className="mt-2 text-xs text-slate-500">尚無技術摘要。</p>}
          {technical ? <div className="mt-3"><RiskBadge level={technical.overheatRisk} /></div> : null}
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2"><div className="text-xs font-semibold text-slate-500">外資 / 投信 / 自營商</div>{flow ? <DataSourceBadge source={normalizeDataSource(flow.dataSource)} /> : null}</div>
          {flow ? <div className="mt-2 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between"><span>法人確認分數</span><ScoreBadge score={flow.flowConfirmationScore} /></div>
            <Metric label="外資買賣超" value={formatShares(flow.foreignNetBuyShares)} />
            <Metric label="投信買賣超" value={formatShares(flow.investmentTrustNetBuyShares)} />
            <Metric label="自營商買賣超" value={formatShares(flow.dealerNetBuyShares)} />
            <Metric label="合計" value={formatShares(flow.totalInstitutionalNetBuyShares)} />
            <Metric label="偏向" value={translateFlow(flow.flowBias)} />
          </div> : <p className="mt-2 text-xs text-slate-500">尚無法人籌碼。</p>}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
          <div className="text-xs font-semibold text-emerald-800">Key Points</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-emerald-900">{summary.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="rounded-md border border-amber-100 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-800">Risk Flags</div>
          {summary.riskFlags.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">{summary.riskFlags.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-xs text-amber-900">目前沒有明顯風險旗標，但仍需交易計畫與停損。</p>}
        </div>
      </div>
      <WarningList warnings={[...(technical?.warnings ?? []), ...(flow?.warnings ?? [])]} />
      <p className="text-xs leading-5 text-slate-500">{summary.sourceNote}</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-slate-200 bg-white px-2 py-1"><div className="text-[10px] text-slate-500">{label}</div><div className="font-semibold text-slate-900">{value}</div></div>;
}

function formatNumber(value?: number | null): string {
  return value === null || value === undefined ? "-" : value.toFixed(2);
}

function formatPct(value?: number | null): string {
  return value === null || value === undefined ? "-" : `${value.toFixed(2)}%`;
}

function formatShares(value: number): string {
  const sign = value > 0 ? "+" : "";
  if (Math.abs(value) >= 1000000) return `${sign}${(value / 1000000).toFixed(2)}M 股`;
  if (Math.abs(value) >= 1000) return `${sign}${(value / 1000).toFixed(1)}K 股`;
  return `${sign}${value} 股`;
}

function translateState(value: string): string {
  return value === "bullish" ? "多頭" : value === "bearish" ? "空頭" : value === "sideways" ? "盤整" : value === "warming" ? "升溫" : value === "hot" ? "過熱" : value === "cooling" ? "降溫" : value === "weak" ? "偏弱" : value;
}

function translateFlow(value: string): string {
  return value === "accumulation" ? "偏累積" : value === "distribution" ? "偏賣壓" : value === "mixed" ? "分歧" : value === "neutral" ? "中性" : "未知";
}

function normalizeDataSource(value: string): DataSource {
  return DATA_SOURCES.includes(value as DataSource) ? value as DataSource : "Estimated";
}

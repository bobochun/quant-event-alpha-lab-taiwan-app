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
import { fetchKLine, fetchLatestQuote, supportsRealtimePolling, type KLinePayload, type MarketInterval, type MarketRange, type QuoteData } from "../lib/marketApi";

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
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const canAutoRefresh = supportsRealtimePolling(quote);

  async function load(nextSymbol = symbol, nextInterval = interval, nextRange = range) {
    setLoading(true);
    const [quoteResult, klineResult] = await Promise.all([
      fetchLatestQuote(nextSymbol),
      fetchKLine(nextSymbol, nextInterval, nextRange)
    ]);
    setQuote(quoteResult);
    setKline(klineResult);
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
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">即時報價與 K 線</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          輸入台股代號查詢最新報價與 K 線。免費、官方或 fallback 資料會明確標示即時性、延遲與來源，不會把非即時資料包裝成正式即時行情。
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
          <Link className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href={`/trade-plan?symbol=${symbol}&from=market`}>建立交易計畫</Link>
        </div>
        <p className="mt-3 text-xs leading-5 text-amber-700">帶入最新價只能作為研究參考，請自行確認價格、流動性與風險，不代表建議進場。</p>
      </section>
    </div>
  );
}

import type { MarketInterval, QuoteData } from "../../lib/marketApi";

const intervals: Array<[MarketInterval, string, boolean]> = [["1m", "1分", true], ["5m", "5分", true], ["15m", "15分", true], ["1d", "日K", false], ["1w", "週K", false], ["1mo", "月K", false]];

export function IntervalSelector({ value, quote, onChange }: { value: MarketInterval; quote: QuoteData | null; onChange: (value: MarketInterval) => void }) {
  const intradayAllowed = Boolean(quote?.isRealtime || quote?.provider === "yfinance" || quote?.dataSource === "DelayedFallback");
  return (
    <div className="flex flex-wrap gap-2">
      {intervals.map(([interval, label, intraday]) => {
        const disabled = intraday && !intradayAllowed;
        return (
          <button
            key={interval}
            className={`rounded-md border px-3 py-1.5 text-sm ${value === interval ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
            disabled={disabled}
            title={disabled ? "目前資料來源不支援此週期" : undefined}
            onClick={() => onChange(interval)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

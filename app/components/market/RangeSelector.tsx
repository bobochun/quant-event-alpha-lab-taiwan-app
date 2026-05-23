import type { MarketRange } from "../../lib/marketApi";

const ranges: Array<[MarketRange, string]> = [["1d", "1日"], ["5d", "5日"], ["1m", "1個月"], ["3m", "3個月"], ["6m", "6個月"], ["ytd", "YTD"], ["1y", "1年"], ["3y", "3年"], ["5y", "5年"], ["custom", "自訂"]];

export function RangeSelector({ value, onChange }: { value: MarketRange; onChange: (value: MarketRange) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ranges.map(([range, label]) => (
        <button key={range} className={`rounded-md border px-3 py-1.5 text-sm ${value === range ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`} onClick={() => onChange(range)}>
          {label}
        </button>
      ))}
    </div>
  );
}

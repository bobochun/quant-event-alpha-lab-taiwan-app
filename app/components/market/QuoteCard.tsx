import type { QuoteData } from "../../lib/marketApi";

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("zh-TW", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatVolume(value: number | null | undefined): string {
  if (!value) return "-";
  return `${value.toLocaleString("zh-TW")} 股`;
}

export function QuoteCard({ quote, loading }: { quote: QuoteData | null; loading?: boolean }) {
  if (loading && !quote) {
    return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">正在載入報價...</div>;
  }
  if (!quote) {
    return <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-500 shadow-sm">尚未取得報價。</div>;
  }
  const positive = (quote.change ?? 0) >= 0;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">最新報價</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{quote.symbol} / {quote.name}</h2>
          <p className="mt-1 text-xs text-slate-500">更新時間：{new Date(quote.quoteTime).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</p>
        </div>
        <div className="text-left md:text-right">
          <div className="text-4xl font-semibold text-slate-950">NT$ {formatNumber(quote.price)}</div>
          <div className={`mt-1 text-sm font-semibold ${positive ? "text-red-600" : "text-emerald-700"}`}>
            {positive ? "+" : ""}{formatNumber(quote.change)} / {positive ? "+" : ""}{formatNumber(quote.changePercent)}%
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="開盤" value={`NT$ ${formatNumber(quote.open)}`} />
        <Metric label="最高 / 最低" value={`NT$ ${formatNumber(quote.high)} / ${formatNumber(quote.low)}`} />
        <Metric label="成交量" value={formatVolume(quote.volume)} />
        <Metric label="資料來源" value={`${quote.provider} / ${quote.dataSource}`} />
      </div>
      <p className="mt-3 text-xs leading-5 text-amber-700">{quote.sourceNote}</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-950">{value}</div></div>;
}

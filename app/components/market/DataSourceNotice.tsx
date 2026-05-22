import type { KLinePayload, QuoteData } from "../../lib/marketApi";

export function DataSourceNotice({ quote, kline }: { quote: QuoteData | null; kline?: KLinePayload | null }) {
  const source = quote?.dataSource ?? kline?.dataSource ?? "Missing";
  const isRealtime = Boolean(quote?.isRealtime ?? kline?.isRealtime);
  const label = isRealtime ? "即時" : source === "Official" ? "官方盤後 / 延遲" : source === "Demo" ? "示範 fallback" : "延遲 / 研究資料";
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
      <span className="font-semibold">資料狀態：{label}</span>
      <span className="ml-2">來源：{quote?.provider ?? kline?.provider ?? "-"}</span>
      {quote?.delayMinutes ? <span className="ml-2">延遲約 {quote.delayMinutes} 分鐘</span> : null}
      <div className="text-xs text-amber-800">{quote?.licenseNote ?? kline?.licenseNote ?? "目前無資料來源說明。"}</div>
    </div>
  );
}

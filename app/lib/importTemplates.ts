export type ImportTemplateId =
  | "events"
  | "price_snapshot"
  | "institutional_flow"
  | "monthly_revenue"
  | "earnings"
  | "dividends"
  | "market_warnings"
  | "theme_news"
  | "etf_rebalance"
  | "major_holder_changes";

export interface ImportTemplateColumn {
  name: string;
  required: boolean;
  description: string;
}

export interface ImportTemplate {
  id: ImportTemplateId;
  fileName: string;
  title: string;
  description: string;
  columns: ImportTemplateColumn[];
  sampleRow: Record<string, string>;
}

const note = "日期格式 YYYY-MM-DD，檔案請使用 UTF-8 編碼。";

export const importTemplates: ImportTemplate[] = [
  {
    id: "events",
    fileName: "events.csv",
    title: "事件資料",
    description: `匯入法說會、月營收、財報、ETF 調整、供應鏈消息等事件。${note}`,
    columns: cols(["symbol", "name", "eventType", "eventTitle", "eventDate"], ["eventTime", "source", "sourceUrl", "confidence", "expectedImpact", "marketAwareness", "relatedThemes", "note"]),
    sampleRow: {
      symbol: "2382",
      name: "廣達",
      eventType: "monthlyRevenue",
      eventTitle: "AI 伺服器出貨與月營收檢查",
      eventDate: "2026-05-28",
      eventTime: "14:30",
      source: "使用者整理",
      sourceUrl: "",
      confidence: "75",
      expectedImpact: "80",
      marketAwareness: "45",
      relatedThemes: "AI server|CoWoS",
      note: "匯入事件範例"
    }
  },
  template("price_snapshot", "price_snapshot.csv", "股價快照", ["symbol", "name", "date", "close", "volume"], ["open", "high", "low", "ma20", "ma60", "rsi", "atr", "twentyDayReturn", "sixtyDayReturn", "relativeStrength"], { symbol: "2330", name: "台積電", date: "2026-05-21", close: "928", volume: "35000", ma20: "900", rsi: "61", relativeStrength: "94" }),
  template("institutional_flow", "institutional_flow.csv", "法人籌碼", ["symbol", "name", "date", "foreignNetBuy", "investmentTrustNetBuy", "dealerNetBuy"], ["totalInstitutionalNetBuy", "buyDays", "flowState", "source"], { symbol: "2382", name: "廣達", date: "2026-05-21", foreignNetBuy: "1200", investmentTrustNetBuy: "350", dealerNetBuy: "80", flowState: "accumulation" }),
  template("monthly_revenue", "monthly_revenue.csv", "月營收", ["symbol", "name", "revenueMonth", "announceDate", "revenue", "yoyGrowth", "momGrowth"], ["cumulativeRevenue", "cumulativeYoyGrowth", "note"], { symbol: "2382", name: "廣達", revenueMonth: "2026-04", announceDate: "2026-05-10", revenue: "108000000000", yoyGrowth: "18.5", momGrowth: "4.2" }),
  template("earnings", "earnings.csv", "財報", ["symbol", "name", "quarter", "announceDate", "eps"], ["grossMargin", "operatingMargin", "netMargin", "yoyGrowth", "qoqGrowth", "note"], { symbol: "2330", name: "台積電", quarter: "2026Q1", announceDate: "2026-04-18", eps: "9.8" }),
  template("dividends", "dividends.csv", "除權息", ["symbol", "name", "exDividendDate", "cashDividend"], ["stockDividend", "yieldPct", "lastBuyDate", "paymentDate", "note"], { symbol: "2603", name: "長榮", exDividendDate: "2026-06-20", cashDividend: "8.0", yieldPct: "4.1" }),
  template("market_warnings", "market_warnings.csv", "注意股 / 處置股", ["symbol", "name", "warningType", "startDate"], ["endDate", "reason", "source"], { symbol: "9958", name: "世紀鋼", warningType: "attention", startDate: "2026-05-21", reason: "範例注意股資料" }),
  template("theme_news", "theme_news.csv", "題材新聞 metadata", ["title", "publishedAt", "source", "relatedThemes"], ["sourceUrl", "relatedSymbols", "sentiment", "importance", "novelty", "summary"], { title: "AI 伺服器供應鏈需求升溫", publishedAt: "2026-05-21", source: "使用者整理", relatedThemes: "AI server|CoWoS", relatedSymbols: "2382|3231", importance: "70" }),
  template("etf_rebalance", "etf_rebalance.csv", "ETF 成分調整", ["etfSymbol", "etfName", "effectiveDate", "symbol", "name", "action"], ["estimatedImpact", "source", "sourceUrl", "note"], { etfSymbol: "006208", etfName: "富邦台50", effectiveDate: "2026-06-01", symbol: "2382", name: "廣達", action: "weightIncrease" }),
  template("major_holder_changes", "major_holder_changes.csv", "大戶持股變化", ["symbol", "name", "date", "holderTier", "holdingRatioChange"], ["holderCountChange", "source", "note"], { symbol: "2330", name: "台積電", date: "2026-05-21", holderTier: "1000", holdingRatioChange: "0.3" })
];

function template(id: ImportTemplateId, fileName: string, title: string, required: string[], optional: string[], sampleRow: Record<string, string>): ImportTemplate {
  return { id, fileName, title, description: `${title} 匯入模板。${note}`, columns: cols(required, optional), sampleRow };
}

function cols(required: string[], optional: string[]): ImportTemplateColumn[] {
  return [
    ...required.map((name) => ({ name, required: true, description: "必填欄位" })),
    ...optional.map((name) => ({ name, required: false, description: "選填欄位" }))
  ];
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function templateToCsv(templateItem: ImportTemplate): string {
  const headers = templateItem.columns.map((column) => column.name);
  return [headers.join(","), headers.map((key) => csvEscape(templateItem.sampleRow[key] ?? "")).join(",")].join("\n");
}

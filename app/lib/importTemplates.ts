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
    description: `匯入法說會、月營收、ETF 調整、注意股等事件。${note}`,
    columns: [
      ["symbol", true, "股票代號"],
      ["name", true, "股票名稱"],
      ["eventType", true, "事件類型，需符合系統 enum"],
      ["eventTitle", true, "事件標題"],
      ["eventDate", true, "事件日期 YYYY-MM-DD"],
      ["eventTime", false, "事件時間"],
      ["source", false, "資料來源"],
      ["sourceUrl", false, "來源網址"],
      ["confidence", false, "可信度 0-100"],
      ["expectedImpact", false, "預期影響 0-100"],
      ["marketAwareness", false, "市場關注度 0-100"],
      ["relatedThemes", false, "題材，使用 | 分隔"],
      ["note", false, "備註"]
    ].map(([name, required, description]) => ({ name: String(name), required: Boolean(required), description: String(description) })),
    sampleRow: {
      symbol: "2382",
      name: "廣達",
      eventType: "monthlyRevenue",
      eventTitle: "AI 伺服器出貨與月營收檢查",
      eventDate: "2026-05-28",
      eventTime: "14:30",
      source: "手動整理",
      sourceUrl: "",
      confidence: "75",
      expectedImpact: "80",
      marketAwareness: "45",
      relatedThemes: "AI server|CoWoS",
      note: "使用者匯入事件"
    }
  },
  template("price_snapshot", "price_snapshot.csv", "股價快照", ["symbol", "name", "date", "close", "volume"], ["open", "high", "low", "ma20", "ma60", "rsi", "atr", "twentyDayReturn", "sixtyDayReturn", "relativeStrength"], { symbol: "2330", name: "台積電", date: "2026-05-21", close: "928", volume: "35000", rsi: "61", relativeStrength: "94" }),
  template("institutional_flow", "institutional_flow.csv", "法人籌碼", ["symbol", "name", "date", "foreignNetBuy", "investmentTrustNetBuy", "dealerNetBuy"], ["totalInstitutionalNetBuy", "buyDays", "flowState", "source"], { symbol: "2382", name: "廣達", date: "2026-05-21", foreignNetBuy: "1200", investmentTrustNetBuy: "350", dealerNetBuy: "80", flowState: "positive" }),
  template("monthly_revenue", "monthly_revenue.csv", "月營收", ["symbol", "name", "revenueMonth", "announceDate", "revenue", "yoyGrowth", "momGrowth"], ["cumulativeRevenue", "cumulativeYoyGrowth", "note"], { symbol: "2382", name: "廣達", revenueMonth: "2026-04", announceDate: "2026-05-10", revenue: "108000000000", yoyGrowth: "18.5", momGrowth: "4.2" }),
  template("earnings", "earnings.csv", "財報", ["symbol", "name", "quarter", "announceDate", "eps"], ["grossMargin", "operatingMargin", "netMargin", "yoyGrowth", "qoqGrowth", "note"], { symbol: "2330", name: "台積電", quarter: "2026Q1", announceDate: "2026-04-18", eps: "9.8" }),
  template("dividends", "dividends.csv", "除權息", ["symbol", "name", "exDividendDate", "cashDividend"], ["stockDividend", "yieldPct", "lastBuyDate", "paymentDate", "note"], { symbol: "2603", name: "長榮", exDividendDate: "2026-06-20", cashDividend: "8.0", yieldPct: "4.1" }),
  template("market_warnings", "market_warnings.csv", "注意股 / 處置股", ["symbol", "name", "warningType", "startDate"], ["endDate", "reason", "source"], { symbol: "9958", name: "世紀鋼", warningType: "attention", startDate: "2026-05-21", reason: "示範注意股資料" }),
  template("theme_news", "theme_news.csv", "題材新聞 metadata", ["title", "publishedAt", "source", "relatedThemes"], ["sourceUrl", "relatedSymbols", "sentiment", "importance", "novelty", "summary"], { title: "AI 伺服器供應鏈更新", publishedAt: "2026-05-21", source: "手動整理", relatedThemes: "AI server|CoWoS", relatedSymbols: "2382|3231", importance: "70" }),
  template("etf_rebalance", "etf_rebalance.csv", "ETF 成分調整", ["etfSymbol", "etfName", "effectiveDate", "symbol", "name", "action"], ["estimatedImpact", "source", "sourceUrl", "note"], { etfSymbol: "006208", etfName: "富邦台50", effectiveDate: "2026-06-01", symbol: "2382", name: "廣達", action: "weightIncrease" }),
  template("major_holder_changes", "major_holder_changes.csv", "大戶持股變化", ["symbol", "name", "date", "holderTier", "holdingRatioChange"], ["holderCountChange", "source", "note"], { symbol: "2330", name: "台積電", date: "2026-05-21", holderTier: "1000", holdingRatioChange: "0.3" })
];

function template(id: ImportTemplateId, fileName: string, title: string, required: string[], optional: string[], sampleRow: Record<string, string>): ImportTemplate {
  return {
    id,
    fileName,
    title,
    description: `${title}匯入模板。${note}`,
    columns: [...required.map((name) => ({ name, required: true, description: "必填欄位" })), ...optional.map((name) => ({ name, required: false, description: "選填欄位" }))],
    sampleRow
  };
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function templateToCsv(templateItem: ImportTemplate): string {
  const headers = templateItem.columns.map((column) => column.name);
  return [headers.join(","), headers.map((key) => csvEscape(templateItem.sampleRow[key] ?? "")).join(",")].join("\n");
}

import type { AlphaEngineResult, BackupPayload, Event, JournalEntry, Portfolio, ThemeHeatResult, TradePlan } from "./types";
import { tradePlanToMarkdown } from "./tradePlan";
import { formatDataSource, formatDateTW, formatNextAction, formatRiskLevel, formatStrategy, localizeTheme } from "./utils";

function csvEscape(value: string | number | boolean | undefined): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportEventsCsv(events: Event[]): string {
  const rows = events.map((event) => [formatDateTW(event.eventDate), event.symbol, event.name, event.eventType, event.eventTitle, event.confidence, event.expectedImpact, event.marketAwareness, formatDataSource(event.dataSource), event.sourceNote]);
  return [["事件日期", "代號", "名稱", "事件類型", "事件標題", "可信度", "預期影響", "市場關注度", "資料來源", "來源說明"], ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function exportTradePlansMarkdown(plans: TradePlan[]): string {
  return plans.map(tradePlanToMarkdown).join("\n---\n");
}

export function exportPortfolioCsv(portfolio: Portfolio): string {
  const rows = portfolio.positions.map((position) => [position.symbol, position.name, position.shares, position.averageCost, position.currentPrice, formatStrategy(position.strategy), position.tags.map(localizeTheme).join("|"), position.stopLoss, formatDataSource(position.dataSource)]);
  return [["代號", "名稱", "股數", "平均成本", "目前價格", "策略", "題材", "停損價", "資料來源"], ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function exportJournalCsv(journal: JournalEntry[]): string {
  const rows = journal.map((entry) => [formatDateTW(entry.date), entry.symbol, entry.name, entry.action, formatStrategy(entry.strategy), entry.price, entry.shares, entry.wasEventPricedIn ? "是" : "否", entry.didChaseNews ? "是" : "否", entry.planFollowed ? "是" : "否", entry.pnl, entry.pnlPct, entry.mistakeType, formatDataSource(entry.dataSource)]);
  return [["日期", "代號", "名稱", "動作", "策略", "價格", "股數", "是否已反應", "是否追新聞", "是否遵守計畫", "損益", "損益 %", "錯誤類型", "資料來源"], ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function exportWeeklyReportMarkdown(params: {
  themeHeat: ThemeHeatResult[];
  events: Event[];
  plans: TradePlan[];
  portfolio: Portfolio;
  dataQualityNote: string;
  alphaRows?: AlphaEngineResult[];
}): string {
  const topThemes = params.themeHeat.slice(0, 5).map((theme) => `- ${localizeTheme(theme.theme)}：${Math.round(theme.heatScore)} 分（${theme.explanation}）`).join("\n");
  const watchlist = params.events.slice(0, 10).map((event) => `- ${formatDateTW(event.eventDate)} ${event.symbol} / ${event.name}：${event.eventTitle}（${formatDataSource(event.dataSource)}）`).join("\n");
  const highScore = (params.alphaRows ?? []).filter((row) => row.alpha.combinedAlphaScore >= 65).slice(0, 8).map((row) => `- ${row.event.symbol} / ${row.event.name}：Alpha ${Math.round(row.alpha.combinedAlphaScore)}，催化 ${Math.round(row.catalyst.totalCatalystScore)}，下一步：${formatNextAction(row.alpha.nextAction)}`).join("\n");
  const chaseRisk = (params.alphaRows ?? []).filter((row) => row.pricedInRisk === "high" || row.pricedInRisk === "critical" || row.overheatRisk === "high" || row.overheatRisk === "critical").slice(0, 8).map((row) => `- ${row.event.symbol} / ${row.event.name}：已反應風險 ${formatRiskLevel(row.pricedInRisk)}，過熱風險 ${formatRiskLevel(row.overheatRisk)}`).join("\n");
  const unplanned = params.events.filter((event) => !params.plans.some((plan) => plan.relatedEventId === event.id)).slice(0, 8).map((event) => `- ${event.symbol} ${event.name} ${event.eventTitle}`).join("\n");
  const exposure = params.portfolio.positions.map((position) => `- ${position.symbol} / ${position.name}：${position.tags.map(localizeTheme).join(" / ")}，策略 ${formatStrategy(position.strategy)}`).join("\n");
  return `# 每週事件 Alpha 報告

本報告僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議。

## 本週最強題材
${topThemes || "- 無資料"}

## 未來 7 天高催化事件
${watchlist || "- 無資料"}

## 高分事件標的
${highScore || "- 目前沒有高分事件列"}

## 已過熱 / 避免追高標的
${chaseRisk || "- 目前沒有明顯過熱標的"}

## 尚未建立交易計畫標的
${unplanned || "- 無"}

## 投組事件曝險
${exposure || "- 目前沒有持股"}

## 資料品質提醒
${params.dataQualityNote}

## 下週觀察重點
- 建立交易計畫前，先檢查過熱與已反應風險。
- 優先處理高催化但尚未建立交易計畫的標的。
- 用交易日誌檢查是否追新聞、是否遵守計畫。
`;
}

export function exportFullBackupJson(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

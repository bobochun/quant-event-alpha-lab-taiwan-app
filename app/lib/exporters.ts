import type { AlphaEngineResult, BackupPayload, DataSource, Event, JournalEntry, Portfolio, ThemeHeatResult, TradePlan } from "./types";
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
  dataSourceSummary?: Partial<Record<DataSource, number>> & { estimatedFields?: number; missingItems?: string[]; lastUpdated?: string };
}): string {
  const alphaRows = params.alphaRows ?? [];
  const generatedAt = new Date().toISOString();
  const highCatalyst = alphaRows.filter((row) => row.daysToEvent <= 7 && row.catalyst.totalCatalystScore >= 70).slice(0, 10);
  const unpriced = alphaRows.filter((row) => row.alpha.combinedAlphaScore >= 65 && (row.pricedInRisk === "low" || row.pricedInRisk === "medium")).slice(0, 10);
  const confirm = alphaRows.filter((row) => row.catalyst.totalCatalystScore >= 65 && row.pricedInRisk === "high").slice(0, 10);
  const overheated = alphaRows.filter((row) => row.pricedInRisk === "critical" || row.overheatRisk === "high" || row.overheatRisk === "critical").slice(0, 10);
  const plannedIds = new Set(params.plans.map((plan) => plan.relatedEventId).filter(Boolean));
  const unplanned = params.events.filter((event) => !plannedIds.has(event.id)).slice(0, 10);
  const counts = countSources(params.events);
  const sourceSummary = { ...counts, ...params.dataSourceSummary };
  const usesDemo = (sourceSummary.Demo ?? 0) > 0;

  return `# 每週事件 Alpha 報告

generatedAt: ${generatedAt}

本報告僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議。
${usesDemo ? "\n> 本報告部分內容使用示範資料補齊，不應直接作為交易依據。\n" : ""}

## 本週摘要
- 未來 7 天高催化事件：${highCatalyst.length}
- 尚未反應候選：${unpriced.length}
- 待確認候選：${confirm.length}
- 過熱暫避名單：${overheated.length}
- 已建立交易計畫：${params.plans.length}

## 資料來源摘要
- 官方資料筆數：${sourceSummary.Official ?? 0}
- 匯入資料筆數：${sourceSummary.Imported ?? 0}
- 手動資料筆數：${sourceSummary.Manual ?? 0}
- 示範資料筆數：${sourceSummary.Demo ?? 0}
- 估算欄位：${sourceSummary.estimatedFields ?? 0}
- 缺資料提醒：${sourceSummary.missingItems?.join("、") || "無"}
- 最後更新時間：${sourceSummary.lastUpdated ?? generatedAt}

## 未來 7 天高催化事件
${formatRows(highCatalyst)}

## 尚未反應候選
${formatRows(unpriced)}

## 待確認候選
${formatRows(confirm, "催化分數高，但已反應風險偏高；可建立觀察計畫，不追價。")}

## 已過熱 / 避免追高標的
${formatRows(overheated, "避免追高，等待回測或新的確認訊號。")}

## 題材熱度排行
${params.themeHeat.slice(0, 8).map((theme, index) => `${index + 1}. ${localizeTheme(theme.theme)}：${Math.round(theme.heatScore)} 分，${theme.explanation}`).join("\n") || "- 無資料"}

## 已建立交易計畫
${params.plans.map((plan) => `- ${plan.symbol} / ${plan.name}：${formatStrategy(plan.strategy)}，部位 ${plan.positionPct}%，最大風險 ${Math.round(plan.maxRiskAmount).toLocaleString("zh-TW")}`).join("\n") || "- 無"}

## 尚未建立交易計畫
${unplanned.map((event) => `- ${event.symbol} / ${event.name}：${event.eventTitle}`).join("\n") || "- 無"}

## 投組曝險提醒
${params.portfolio.positions.map((position) => `- ${position.symbol} / ${position.name}：${position.tags.map(localizeTheme).join(" / ")}，策略 ${formatStrategy(position.strategy)}`).join("\n") || "- 目前沒有持股"}

## 資料品質提醒
${params.dataQualityNote}

## 下週待辦事項
- 檢查高催化但尚未建立計畫的事件。
- 對待確認候選只建立觀察計畫，不追價。
- 匯出 JSON 備份，避免 localStorage 資料遺失。`;
}

function countSources(events: Event[]): Partial<Record<DataSource, number>> {
  return events.reduce<Partial<Record<DataSource, number>>>((acc, event) => {
    acc[event.dataSource] = (acc[event.dataSource] ?? 0) + 1;
    return acc;
  }, {});
}

function formatRows(rows: AlphaEngineResult[], note?: string): string {
  return rows.map((row) => `- ${formatDateTW(row.event.eventDate)} ${row.event.symbol} / ${row.event.name}：催化 ${Math.round(row.catalyst.totalCatalystScore)}，Alpha ${Math.round(row.alpha.combinedAlphaScore)}，已反應 ${formatRiskLevel(row.pricedInRisk)}，下一步 ${formatNextAction(row.alpha.nextAction)}${note ? `。${note}` : ""}`).join("\n") || "- 無";
}

export function exportFullBackupJson(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

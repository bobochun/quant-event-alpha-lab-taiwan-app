import type { AlphaEngineResult, BackupPayload, Event, JournalEntry, Portfolio, ThemeHeatResult, TradePlan } from "./types";
import { tradePlanToMarkdown } from "./tradePlan";

function csvEscape(value: string | number | boolean | undefined): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportEventsCsv(events: Event[]): string {
  const rows = events.map((event) => [event.eventDate, event.symbol, event.name, event.eventType, event.eventTitle, event.confidence, event.expectedImpact, event.marketAwareness, event.dataSource, event.sourceNote]);
  return [["eventDate", "symbol", "name", "eventType", "eventTitle", "confidence", "expectedImpact", "marketAwareness", "dataSource", "sourceNote"], ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function exportTradePlansMarkdown(plans: TradePlan[]): string {
  return plans.map(tradePlanToMarkdown).join("\n---\n");
}

export function exportPortfolioCsv(portfolio: Portfolio): string {
  const rows = portfolio.positions.map((position) => [position.symbol, position.name, position.shares, position.averageCost, position.currentPrice, position.strategy, position.tags.join("|"), position.stopLoss, position.dataSource]);
  return [["symbol", "name", "shares", "averageCost", "currentPrice", "strategy", "tags", "stopLoss", "dataSource"], ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function exportJournalCsv(journal: JournalEntry[]): string {
  const rows = journal.map((entry) => [entry.date, entry.symbol, entry.name, entry.action, entry.strategy, entry.price, entry.shares, entry.wasEventPricedIn, entry.didChaseNews, entry.planFollowed, entry.pnl, entry.pnlPct, entry.mistakeType, entry.dataSource]);
  return [["date", "symbol", "name", "action", "strategy", "price", "shares", "wasEventPricedIn", "didChaseNews", "planFollowed", "pnl", "pnlPct", "mistakeType", "dataSource"], ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function exportWeeklyReportMarkdown(params: {
  themeHeat: ThemeHeatResult[];
  events: Event[];
  plans: TradePlan[];
  portfolio: Portfolio;
  dataQualityNote: string;
  alphaRows?: AlphaEngineResult[];
}): string {
  const topThemes = params.themeHeat.slice(0, 5).map((theme) => `- ${theme.theme}: ${Math.round(theme.heatScore)} (${theme.explanation})`).join("\n");
  const watchlist = params.events.slice(0, 10).map((event) => `- ${event.eventDate} ${event.symbol} ${event.name}: ${event.eventTitle} [${event.dataSource}]`).join("\n");
  const highScore = (params.alphaRows ?? []).filter((row) => row.alpha.combinedAlphaScore >= 65).slice(0, 8).map((row) => `- ${row.event.symbol} ${row.event.name}: alpha ${Math.round(row.alpha.combinedAlphaScore)}, catalyst ${Math.round(row.catalyst.totalCatalystScore)}, next ${row.alpha.nextAction}`).join("\n");
  const chaseRisk = (params.alphaRows ?? []).filter((row) => row.pricedInRisk === "high" || row.pricedInRisk === "critical" || row.overheatRisk === "high" || row.overheatRisk === "critical").slice(0, 8).map((row) => `- ${row.event.symbol} ${row.event.name}: priced-in ${row.pricedInRisk}, overheat ${row.overheatRisk}`).join("\n");
  const unplanned = params.events.filter((event) => !params.plans.some((plan) => plan.relatedEventId === event.id)).slice(0, 8).map((event) => `- ${event.symbol} ${event.name} ${event.eventTitle}`).join("\n");
  const exposure = params.portfolio.positions.map((position) => `- ${position.symbol} ${position.tags.join("/")} ${position.strategy}`).join("\n");
  return `# Weekly Event Alpha Report

This report is for personal research, strategy simulation, event tracking and risk control only. It is not investment advice.

## Top Themes
${topThemes || "- No data"}

## 7-Day Catalyst Watchlist
${watchlist || "- No data"}

## High-Score Event Rows
${highScore || "- No high-score rows"}

## Elevated Chase-Risk Rows
${chaseRisk || "- No elevated chase-risk rows"}

## Events Without Trade Plans
${unplanned || "- None"}

## Portfolio Event Exposure
${exposure || "- No positions"}

## Next Week Focus
- Check overheat and priced-in risk before creating plans.
- Prioritize high catalyst rows that still need trade plans.
- Review FOMO and plan-following discipline in the journal.

## Data Quality Reminder
${params.dataQualityNote}
`;
}

export function exportFullBackupJson(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

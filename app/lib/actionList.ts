import type { AlphaEngineResult, PortfolioExposureResult } from "./types";
import { formatNextAction, formatSymbolName, localizeTheme } from "./utils";

export type TodayActionType =
  | "highCatalystNoPlan"
  | "nearEventOverheated"
  | "lowConfidenceData"
  | "portfolioConcentration"
  | "stopLossBroken"
  | "missingJournal"
  | "weeklyReviewNeeded";

export interface TodayAction {
  id: string;
  type: TodayActionType;
  priority: "高優先" | "風險" | "資料" | "紀律" | "檢討";
  title: string;
  nextStep: string;
  href?: string;
}

const priorityRank: Record<TodayAction["priority"], number> = {
  風險: 0,
  高優先: 1,
  資料: 2,
  紀律: 3,
  檢討: 4
};

export function generateTodayActionList(params: {
  rows: AlphaEngineResult[];
  plannedEventIds: string[];
  exposure: PortfolioExposureResult;
  hasJournalToday?: boolean;
  ignoredIds?: string[];
  reviewedIds?: string[];
}): TodayAction[] {
  const planned = new Set(params.plannedEventIds);
  const ignored = new Set(params.ignoredIds ?? []);
  const reviewed = new Set(params.reviewedIds ?? []);
  const actions: TodayAction[] = [];

  params.rows.forEach((row) => {
    if (ignored.has(row.event.id) || reviewed.has(row.event.id)) return;
    const symbolName = formatSymbolName(row.event.symbol, row.event.name);
    if (row.alpha.combinedAlphaScore >= 65 && !planned.has(row.event.id)) {
      actions.push({
        id: `highCatalystNoPlan:${row.event.id}`,
        type: "highCatalystNoPlan",
        priority: "高優先",
        title: `${symbolName}：高催化但尚未建立交易計畫`,
        nextStep: "建立交易計畫，先確認停損、部位大小與事件失效條件。",
        href: `/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}`
      });
    }
    if (row.daysToEvent <= 3 && (row.overheatRisk === "high" || row.overheatRisk === "critical")) {
      actions.push({
        id: `nearEventOverheated:${row.event.id}`,
        type: "nearEventOverheated",
        priority: "風險",
        title: `${symbolName}：接近事件日但已過熱`,
        nextStep: "避免追高，等待回測或新的確認訊號。",
        href: "/event-radar"
      });
    }
    if (row.event.confidence < 50) {
      actions.push({
        id: `lowConfidenceData:${row.event.id}`,
        type: "lowConfidenceData",
        priority: "資料",
        title: `${symbolName}：事件資料可信度不足`,
        nextStep: "補齊來源與事件假設，再決定是否列入研究。",
        href: "/data-center"
      });
    }
  });

  Object.entries(params.exposure.themeExposure).forEach(([theme, value]) => {
    if (value > 40) {
      actions.push({
        id: `portfolioConcentration:${theme}`,
        type: "portfolioConcentration",
        priority: "風險",
        title: `${localizeTheme(theme)} 題材曝險 ${value}%，偏高`,
        nextStep: "避免新增同題材部位，優先檢查既有部位停損。",
        href: "/portfolio"
      });
    }
  });

  params.exposure.alerts.filter((alert) => alert.message.includes("below stop") || alert.message.includes("跌破停損")).forEach((alert) => {
    actions.push({
      id: `stopLossBroken:${alert.symbol ?? alert.id}`,
      type: "stopLossBroken",
      priority: "風險",
      title: `${alert.symbol ?? "投組"}：可能已跌破停損`,
      nextStep: formatNextAction("CheckRisk"),
      href: "/risk-center"
    });
  });

  if (!params.hasJournalToday) {
    actions.push({
      id: "missingJournal:today",
      type: "missingJournal",
      priority: "紀律",
      title: "今日尚未填寫交易日誌",
      nextStep: "新增研究紀錄，標記是否追新聞、是否遵守計畫。",
      href: "/journal"
    });
  }

  actions.push({
    id: "weeklyReviewNeeded:strategy",
    type: "weeklyReviewNeeded",
    priority: "檢討",
    title: "本週需檢討低基期事件催化與事件後回測策略",
    nextStep: "查看交易日誌與報告匯出，確認策略是否有效。",
    href: "/reports"
  });

  return Array.from(new Map(actions.map((action) => [action.id, action])).values())
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}

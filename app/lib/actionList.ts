import type { ActionState } from "./actionState";
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

function isIgnored(eventId: string, actionState?: ActionState): boolean {
  const ignoredUntil = actionState?.ignoredUntil[eventId];
  if (!ignoredUntil) return false;
  return ignoredUntil >= new Date().toISOString().slice(0, 10);
}

export function generateTodayActionList(params: {
  rows: AlphaEngineResult[];
  plannedEventIds: string[];
  exposure: PortfolioExposureResult;
  hasJournalToday?: boolean;
  ignoredIds?: string[];
  reviewedIds?: string[];
  actionState?: ActionState;
}): TodayAction[] {
  const planned = new Set([...params.plannedEventIds, ...(params.actionState?.createdTradePlanEventIds ?? [])]);
  const ignored = new Set(params.ignoredIds ?? []);
  const reviewed = new Set(params.reviewedIds ?? []);
  const actions: TodayAction[] = [];

  params.rows.forEach((row) => {
    if (ignored.has(row.event.id) || reviewed.has(row.event.id) || isIgnored(row.event.id, params.actionState)) return;
    const symbolName = formatSymbolName(row.event.symbol, row.event.name);
    const pricedInHigh = row.pricedInRisk === "high" || row.pricedInRisk === "critical";
    const overheatHigh = row.overheatRisk === "high" || row.overheatRisk === "critical" || params.actionState?.flaggedOverheated.includes(row.event.id);

    if (row.alpha.combinedAlphaScore >= 65 && !pricedInHigh && !planned.has(row.event.id)) {
      actions.push({
        id: `highCatalystNoPlan:${row.event.id}`,
        type: "highCatalystNoPlan",
        priority: "高優先",
        title: `${symbolName}：高催化且尚未建立交易計畫`,
        nextStep: "建立交易計畫，先計算停損、部位大小與風險報酬比。",
        href: `/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}`
      });
    }

    if (row.catalyst.totalCatalystScore >= 65 && pricedInHigh) {
      actions.push({
        id: `nearEventOverheated:${row.event.id}`,
        type: "nearEventOverheated",
        priority: "風險",
        title: `${symbolName}：催化強但已反應風險偏高`,
        nextStep: "可建立觀察計畫，但不追價，等待回測或新的確認訊號。",
        href: "/event-radar"
      });
    } else if (row.daysToEvent <= 3 && overheatHigh) {
      actions.push({
        id: `nearEventOverheated:${row.event.id}`,
        type: "nearEventOverheated",
        priority: "風險",
        title: `${symbolName}：接近事件日但已過熱`,
        nextStep: "避免追高，等待回測或量價降溫。",
        href: "/event-radar"
      });
    }

    if (row.event.confidence < 50) {
      actions.push({
        id: `lowConfidenceData:${row.event.id}`,
        type: "lowConfidenceData",
        priority: "資料",
        title: `${symbolName}：事件資料可信度不足`,
        nextStep: "補上來源或匯入更完整資料，再決定是否列入研究。",
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
        title: `${localizeTheme(theme)} 題材曝險 ${value}% 偏高`,
        nextStep: "避免新增同題材部位，優先檢查既有部位停損。",
        href: "/portfolio"
      });
    }
  });

  params.exposure.alerts.filter((alert) => alert.message.includes("跌破停損") || alert.message.includes("已跌破")).forEach((alert) => {
    actions.push({
      id: `stopLossBroken:${alert.symbol ?? alert.id}`,
      type: "stopLossBroken",
      priority: "風險",
      title: `${alert.symbol ?? "部位"}：可能已跌破停損`,
      nextStep: formatNextAction("CheckRisk"),
      href: "/risk-center"
    });
  });

  if (!params.hasJournalToday) {
    actions.push({
      id: "missingJournal:today",
      type: "missingJournal",
      priority: "紀律",
      title: "尚未填寫今日交易日誌",
      nextStep: "記錄今天是否追新聞、是否遵守計畫、是否買在已反應後。",
      href: "/journal"
    });
  }

  actions.push({
    id: "weeklyReviewNeeded:strategy",
    type: "weeklyReviewNeeded",
    priority: "檢討",
    title: "本週應檢查事件策略與交易紀律",
    nextStep: "匯出週報並檢查高催化、過熱暫避、尚未建立計畫清單。",
    href: "/reports"
  });

  return Array.from(new Map(actions.map((action) => [action.id, action])).values())
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}

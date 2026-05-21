import type { AlphaEngineResult, CatalystScoreResult, CombinedAlphaResult, NextAction, RiskLevel } from "./types";
import { formatNextAction, formatRiskLevel, round } from "./utils";

export function explainCatalystScore(result: CatalystScoreResult): string {
  const positives = [
    result.eventImportanceScore >= 70 ? `事件重要性 ${round(result.eventImportanceScore)} 分，屬於容易吸引資金注意的事件。` : "",
    result.timingScore >= 70 ? `事件時間接近，目前 timing 分數 ${round(result.timingScore)}，適合列入近期檢查。` : "",
    result.themeHeatScore >= 60 ? `相關題材熱度 ${round(result.themeHeatScore)}，代表題材仍有升溫跡象。` : "",
    result.flowConfirmationScore >= 58 ? `籌碼確認分數 ${round(result.flowConfirmationScore)}，法人或資金流向有初步支持。` : ""
  ].filter(Boolean);
  const risk = result.riskPenalty > 12 ? `但風險扣分 ${round(result.riskPenalty)}，代表可能已有部分反應或技術面偏熱。` : "目前風險扣分不高，但仍需確認價格位置與資料來源。";
  return `${positives.join(" ")} ${risk} 下一步：${formatNextAction(result.nextAction)}。`.trim();
}

export function explainCombinedAlphaScore(result: CombinedAlphaResult): string {
  const base = `綜合 Alpha 分數由事件催化、趨勢、籌碼、題材動能、相對強弱與市場狀態共同計算，目前為 ${round(result.combinedAlphaScore)} 分。`;
  const risk = result.pricedInPenalty + result.overheatPenalty > 18
    ? "已反應與過熱扣分偏高，不適合追價，應等待回測或更明確確認。"
    : "主要扣分尚可控，可列為研究優先名單，但仍不代表可直接進場。";
  return `${base} ${risk} 下一步：${formatNextAction(result.nextAction)}。`;
}

export function explainRiskLevel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: "風險低，仍需檢查資料來源與交易計畫。",
    medium: "風險中等，建議降低倉促決策，先確認停損與事件失效條件。",
    high: "風險偏高，可能已反應或波動放大，避免追高。",
    critical: "風險極高，應先停止新增風險，等待回測或重新評估。"
  };
  return `${formatRiskLevel(level)}：${labels[level]}`;
}

export function explainNextAction(action: NextAction): string {
  const labels: Record<NextAction, string> = {
    Observe: "先觀察，不急著建立部位，等待資料或價格結構更清楚。",
    WaitForConfirmation: "等待確認訊號，例如量價結構、法人流向或事件資訊更新。",
    CreateTradePlan: "可建立交易計畫，先算停損、部位大小與風險報酬比。",
    WaitForPullback: "不追價，等待回測均線或支撐後再重新評估。",
    AvoidChasing: "避免追高，目前更重要的是控風險而不是找進場理由。",
    CheckRisk: "先檢查投組曝險、停損與事件是否已反應。",
    ThemeTrackingOnly: "僅列入題材追蹤，暫不列為高研究優先標的。",
    InsufficientData: "資料不足，需補齊來源與可信度後再評估。"
  };
  return labels[action];
}

export function explainAlphaRow(row: AlphaEngineResult): string {
  return [
    explainCatalystScore(row.catalyst),
    explainCombinedAlphaScore(row.alpha),
    `已反應風險：${explainRiskLevel(row.pricedInRisk)}`,
    `過熱風險：${explainRiskLevel(row.overheatRisk)}`
  ].join(" ");
}

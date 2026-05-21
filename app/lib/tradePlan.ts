import type { DataSource, StrategyName, TradePlan } from "./types";
import { DEMO_SOURCE_NOTE, formatCurrencyNTD, formatDateTW, formatSharesLots, formatStrategy, round } from "./utils";

export interface GenerateTradePlanInput {
  symbol: string;
  name: string;
  strategy: StrategyName;
  relatedEventId?: string;
  eventDate?: string;
  capital: number;
  riskPerTradePct: number;
  maxPositionPct: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  eventInvalidationRule: string;
  timeStopRule: string;
  dataSource?: DataSource;
  eventDateDistanceDays?: number;
  preEventReturnPct?: number;
  confidence?: number;
  isAttentionStock?: boolean;
  isDispositionStock?: boolean;
}

export function generateTradePlan(input: GenerateTradePlanInput): TradePlan {
  const perShareRisk = input.entryPrice - input.stopLoss;
  if (perShareRisk <= 0) throw new Error("研究進場價必須高於停損價，否則無法計算風險。");
  const maxRiskAmount = input.capital * (input.riskPerTradePct / 100);
  const rawShares = Math.floor(maxRiskAmount / perShareRisk);
  const maxCost = input.capital * (input.maxPositionPct / 100);
  const suggestedShares = Math.max(0, Math.min(rawShares, Math.floor(maxCost / input.entryPrice)));
  const estimatedCost = suggestedShares * input.entryPrice;
  const positionPct = estimatedCost / input.capital * 100;
  const riskReward1 = (input.takeProfit1 - input.entryPrice) / perShareRisk;
  const riskReward2 = (input.takeProfit2 - input.entryPrice) / perShareRisk;
  const warnings = [
    riskReward1 < 1.5 ? "風險報酬比偏低，除非有更強的事件催化，否則不建議列為高優先研究。" : "",
    positionPct > 20 ? "部位比例超過 20%，請檢查單檔曝險。" : "",
    perShareRisk / input.entryPrice > 0.12 ? "停損距離偏遠，請確認波動假設與部位大小。" : "",
    typeof input.eventDateDistanceDays === "number" && input.eventDateDistanceDays <= 2 ? "事件日很接近，進一步研究前請確認交易計畫已完整。" : "",
    typeof input.preEventReturnPct === "number" && input.preEventReturnPct > 8 ? "事件前漲幅偏高，追高風險上升。" : "",
    typeof input.confidence === "number" && input.confidence < 50 ? "資料可信度偏低，建議降低部位或僅列入觀察。" : "",
    input.isAttentionStock ? "注意股：請檢查交易限制與波動風險。" : "",
    input.isDispositionStock ? "處置股：請檢查交易限制與流動性風險。" : "",
    input.dataSource === "Demo" ? "示範交易計畫，進入實際研究前請手動確認價格與資料來源。" : ""
  ].filter(Boolean);
  const now = new Date().toISOString();
  return {
    id: `plan-${Date.now()}`,
    ...input,
    dataSource: input.dataSource ?? "Manual",
    sourceNote: input.dataSource === "Demo" ? DEMO_SOURCE_NOTE : "手動建立的本機交易計畫。",
    suggestedShares,
    estimatedCost,
    positionPct: round(positionPct, 2),
    maxRiskAmount: round(maxRiskAmount, 0),
    riskReward1: round(riskReward1, 2),
    riskReward2: round(riskReward2, 2),
    warnings,
    createdAt: now,
    updatedAt: now
  };
}

export function tradePlanToMarkdown(plan: TradePlan): string {
  return `# 交易計畫 - ${plan.symbol} / ${plan.name}

- 策略：${formatStrategy(plan.strategy)}
- 事件日期：${plan.eventDate ? formatDateTW(plan.eventDate) : "未設定"}
- 研究進場價：${plan.entryPrice}
- 停損價：${plan.stopLoss}
- 第一 / 第二停利價：${plan.takeProfit1} / ${plan.takeProfit2}
- 建議股數：${formatSharesLots(plan.suggestedShares)}
- 預估投入金額：${formatCurrencyNTD(plan.estimatedCost)}
- 部位比例：${plan.positionPct}%
- 最大可能虧損：${formatCurrencyNTD(plan.maxRiskAmount)}
- 第一 / 第二停利風險報酬比：${plan.riskReward1} / ${plan.riskReward2}

## 事件失效條件
${plan.eventInvalidationRule}

## 時間停損
${plan.timeStopRule}

## 警示
${plan.warnings.map((warning) => `- ${warning}`).join("\n") || "- 無"}
`;
}

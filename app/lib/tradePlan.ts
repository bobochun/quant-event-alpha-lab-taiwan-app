import type { DataSource, StrategyName, TradePlan } from "./types";
import { DEMO_SOURCE_NOTE, round } from "./utils";

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
  if (perShareRisk <= 0) throw new Error("entryPrice must be greater than stopLoss.");
  const maxRiskAmount = input.capital * (input.riskPerTradePct / 100);
  const rawShares = Math.floor(maxRiskAmount / perShareRisk);
  const maxCost = input.capital * (input.maxPositionPct / 100);
  const suggestedShares = Math.max(0, Math.min(rawShares, Math.floor(maxCost / input.entryPrice)));
  const estimatedCost = suggestedShares * input.entryPrice;
  const positionPct = estimatedCost / input.capital * 100;
  const riskReward1 = (input.takeProfit1 - input.entryPrice) / perShareRisk;
  const riskReward2 = (input.takeProfit2 - input.entryPrice) / perShareRisk;
  const warnings = [
    riskReward1 < 1.5 ? "TP1 risk/reward is below 1.5." : "",
    positionPct > 20 ? "Position size is above 20%." : "",
    perShareRisk / input.entryPrice > 0.12 ? "Stop distance is wide; confirm volatility assumption." : "",
    typeof input.eventDateDistanceDays === "number" && input.eventDateDistanceDays <= 2 ? "Event date is close; confirm plan is ready before action." : "",
    typeof input.preEventReturnPct === "number" && input.preEventReturnPct > 8 ? "Pre-event return is elevated; chase risk is higher." : "",
    typeof input.confidence === "number" && input.confidence < 50 ? "Data confidence is low; reduce size or observe only." : "",
    input.isAttentionStock ? "Attention stock: check trading restrictions and volatility risk." : "",
    input.isDispositionStock ? "Disposition stock: check trading restrictions and liquidity risk." : "",
    input.dataSource === "Demo" ? "Demo plan only; verify real prices manually." : ""
  ].filter(Boolean);
  const now = new Date().toISOString();
  return {
    id: `plan-${Date.now()}`,
    ...input,
    dataSource: input.dataSource ?? "Manual",
    sourceNote: input.dataSource === "Demo" ? DEMO_SOURCE_NOTE : "Manual local trade plan.",
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
  return `# Trade Plan - ${plan.symbol} ${plan.name}

- Strategy: ${plan.strategy}
- Event Date: ${plan.eventDate ?? "N/A"}
- Entry: ${plan.entryPrice}
- Stop Loss: ${plan.stopLoss}
- TP1 / TP2: ${plan.takeProfit1} / ${plan.takeProfit2}
- Suggested Shares: ${plan.suggestedShares}
- Suggested Lots: ${Math.floor(plan.suggestedShares / 1000)} lots + ${plan.suggestedShares % 1000} shares
- Estimated Cost: ${Math.round(plan.estimatedCost)}
- Position %: ${plan.positionPct}%
- Max Risk: ${plan.maxRiskAmount}
- RR TP1 / TP2: ${plan.riskReward1} / ${plan.riskReward2}

## Invalidation
${plan.eventInvalidationRule}

## Time Stop
${plan.timeStopRule}

## Warnings
${plan.warnings.map((warning) => `- ${warning}`).join("\n") || "- None"}
`;
}

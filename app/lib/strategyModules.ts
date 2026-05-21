import type { AlphaEngineResult, StrategyName } from "./types";

export interface StrategySignal {
  strategy: StrategyName;
  symbol: string;
  name: string;
  score: number;
  matched: boolean;
  thesis: string;
  exitRule: string;
  risks: string[];
}

export function evaluateStrategyModules(results: AlphaEngineResult[]): StrategySignal[] {
  return results
    .flatMap((result) => {
      const stock = result.stock;
      if (!stock) return [];

      const common = {
        symbol: result.event.symbol,
        name: result.event.name,
        score: result.alpha.combinedAlphaScore
      };

      return [
        {
          ...common,
          strategy: "Pre-Earnings Drift" as const,
          matched:
            result.event.eventType === "earnings" &&
            result.daysToEvent >= 7 &&
            result.daysToEvent <= 14 &&
            result.catalyst.totalCatalystScore >= 68 &&
            stock.volumeRatio < 1.6 &&
            stock.relativeStrengthRank >= 70 &&
            result.alpha.flowConfirmationScore >= 58,
          thesis: "Earnings event is approaching, expectations appear to be improving, and price has not expanded into an obvious blow-off move.",
          exitRule: "Exit before the earnings event or within 1 to 3 sessions after the event, depending on price reaction and volume.",
          risks: ["Earnings surprise may reverse the thesis.", "The event may already be priced in before the report."]
        },
        {
          ...common,
          strategy: "ETF Rebalance Flow" as const,
          matched:
            result.event.eventType === "etfRebalance" &&
            stock.liquidityScore >= 70 &&
            result.overheatRisk !== "high" &&
            result.overheatRisk !== "critical" &&
            stock.volumeRatio >= 1.05,
          thesis: "ETF rebalance metadata suggests possible passive flow, while liquidity is sufficient and overheat risk is not extreme.",
          exitRule: "Review before the rebalance effective date and avoid holding only for stale passive-flow expectations.",
          risks: ["Passive flow may have entered early.", "The rebalance effective date can become a sell-the-news event."]
        },
        {
          ...common,
          strategy: "AI Theme Rotation" as const,
          matched:
            result.event.relatedThemes.includes("AI server") &&
            result.alpha.themeMomentumScore >= 62 &&
            result.overheatRisk !== "critical" &&
            stock.relativeStrengthRank >= 65,
          thesis: "AI theme rotation is improving, with preference for strengthening sub-groups rather than the most crowded leaders.",
          exitRule: "Reduce exposure if the theme becomes crowded, media attention spikes, or institutional flow turns negative.",
          risks: ["Theme rotation can reverse quickly.", "Crowded AI names can gap down when expectations cool."]
        },
        {
          ...common,
          strategy: "Low Base Catalyst" as const,
          matched:
            result.catalyst.totalCatalystScore >= 65 &&
            stock.twentyDayReturnPct < 12 &&
            result.alpha.themeMomentumScore >= 55 &&
            stock.institutionalFlow5d > 0 &&
            stock.ma20Slope > 0,
          thesis: "Low-base structure plus a credible event catalyst, improving theme heat, positive flow, and a rising MA20.",
          exitRule: "Use MA20 structure and event invalidation as the main review triggers.",
          risks: ["Low-base names may stay illiquid.", "The catalyst may remain low awareness or low confidence."]
        },
        {
          ...common,
          strategy: "Event Pullback" as const,
          matched:
            result.daysToEvent < 0 &&
            result.catalyst.totalCatalystScore >= 65 &&
            stock.ma20DistancePct < 4 &&
            stock.volumeRatio < 1.1,
          thesis: "Post-event pullback remains structurally healthy, with controlled volume and no major break in trend.",
          exitRule: "Review if MA20 fails, volume expands on decline, or event thesis is invalidated.",
          risks: ["Post-event drift can fade.", "A pullback can turn into distribution if volume expands."]
        }
      ];
    })
    .filter((signal) => signal.matched)
    .sort((a, b) => b.score - a.score);
}

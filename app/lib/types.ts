export type DataSource = "Real" | "Cached" | "Manual" | "Imported" | "Estimated" | "Demo" | "Missing";

export type EventType =
  | "investorConference"
  | "exDividend"
  | "monthlyRevenue"
  | "earnings"
  | "foreignBrokerReport"
  | "majorHolderChange"
  | "etfRebalance"
  | "attentionStock"
  | "dispositionStock"
  | "shareholderMeetingGift"
  | "productLaunch"
  | "aiServerNews"
  | "semiconductorNews"
  | "industryConference"
  | "policy"
  | "orderContract"
  | "buyback"
  | "capitalIncrease"
  | "convertibleBond"
  | "mergerAcquisition"
  | "supplyChainNews"
  | "other";

export type MarketRegime = "bullish" | "sideways" | "bearish" | "highVolatility" | "riskOff" | "unknown";
export type NextAction = "Observe" | "WaitForConfirmation" | "CreateTradePlan" | "WaitForPullback" | "AvoidChasing" | "CheckRisk" | "ThemeTrackingOnly" | "InsufficientData";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type StrategyName = "Pre-Earnings Drift" | "ETF Rebalance Flow" | "AI Theme Rotation" | "Low Base Catalyst" | "Event Pullback" | "Manual Event Research";

export interface DataTagged {
  dataSource: DataSource;
  sourceNote: string;
}

export interface Event extends DataTagged {
  id: string;
  symbol: string;
  name: string;
  eventType: EventType;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  source: string;
  sourceUrl?: string;
  confidence: number;
  expectedImpact: number;
  marketAwareness: number;
  relatedThemes: string[];
  createdAt: string;
  updatedAt: string;
  reviewed?: boolean;
  ignoredUntil?: string;
  flaggedOverheated?: boolean;
}

export interface Stock extends DataTagged {
  symbol: string;
  name: string;
  sector: string;
  themes: string[];
  price: number;
  previousClose: number;
  marketCapBillion: number;
  liquidityScore: number;
  rsi14: number;
  ma20DistancePct: number;
  ma20Slope: number;
  volumeRatio: number;
  sevenDayReturnPct: number;
  twentyDayReturnPct: number;
  relativeStrengthRank: number;
  institutionalFlow5d: number;
  foreignFlow5d: number;
  investmentTrustFlow5d: number;
  dealerFlow5d: number;
  limitUpCount10d: number;
  isAttentionStock?: boolean;
  isDispositionStock?: boolean;
  volatility20d: number;
  beta: number;
}

export interface Theme extends DataTagged {
  id: string;
  name: string;
  relatedSymbols: string[];
  sevenDayNewsCount: number;
  priorSevenDayNewsCount: number;
  sevenDayEventCount: number;
  institutionalFlowScore: number;
  synchronizedBreakoutCount: number;
  limitUpClusterCount: number;
  isOverheated: boolean;
  source?: string;
}

export interface TradePlan extends DataTagged {
  id: string;
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
  suggestedShares: number;
  estimatedCost: number;
  positionPct: number;
  maxRiskAmount: number;
  riskReward1: number;
  riskReward2: number;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Position extends DataTagged {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  tags: string[];
  strategy: StrategyName;
  relatedEventId?: string;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  notes?: string;
}

export interface Portfolio extends DataTagged {
  cash: number;
  positions: Position[];
  updatedAt: string;
}

export interface JournalEntry extends DataTagged {
  id: string;
  date: string;
  symbol: string;
  name: string;
  action: "planned" | "entered" | "exited" | "review";
  strategy: StrategyName;
  relatedEventId?: string;
  eventType?: EventType;
  price: number;
  shares: number;
  reason: string;
  eventThesis: string;
  eventOutcome?: string;
  wasEventPricedIn: boolean;
  didChaseNews: boolean;
  planFollowed: boolean;
  emotion: "calm" | "fomo" | "hesitant" | "revenge" | "disciplined";
  mistakeType?: string;
  pnl?: number;
  pnlPct?: number;
  review?: string;
}

export interface RiskAlert extends DataTagged {
  id: string;
  severity: RiskLevel;
  category: "Event Risk" | "Position Risk" | "Portfolio Risk" | "Behavior Risk" | "Data Risk";
  symbol?: string;
  message: string;
  suggestedAction: string;
  createdAt: string;
}

export interface DataStatus extends DataTagged {
  id: string;
  type: string;
  lastUpdated: string;
  source: string;
  sourceUrl?: string;
  missingFields: string[];
  warning?: string;
  confidence: number;
}

export interface CatalystScoreResult {
  totalCatalystScore: number;
  eventImportanceScore: number;
  timingScore: number;
  surprisePotentialScore: number;
  themeHeatScore: number;
  flowConfirmationScore: number;
  technicalSetupScore: number;
  riskPenalty: number;
  confidenceLevel: "low" | "medium" | "high";
  reason: string;
  warnings: string[];
  nextAction: NextAction;
}

export interface CombinedAlphaResult {
  combinedAlphaScore: number;
  catalystScore: number;
  quantTrendScore: number;
  flowConfirmationScore: number;
  themeMomentumScore: number;
  riskAdjustedMomentumScore: number;
  marketRegimeAlignmentScore: number;
  relativeStrengthScore: number;
  overheatPenalty: number;
  liquidityPenalty: number;
  dataQualityPenalty: number;
  dispositionPenalty: number;
  pricedInPenalty: number;
  nextAction: NextAction;
  explanation: string;
  warnings: string[];
}

export interface MarketRegimeResult extends DataTagged {
  regime: MarketRegime;
  suggestedGrossExposurePct: number;
  volatilityState: "low" | "normal" | "elevated" | "extreme";
  score: number;
  explanation: string;
}

export interface ThemeHeatResult extends DataTagged {
  theme: string;
  heatScore: number;
  momentum: number;
  relatedSymbols: string[];
  upcomingEvents: number;
  overheatedSymbols: string[];
  warnings: string[];
  explanation: string;
}

export interface BehaviorAnalyticsResult {
  behaviorScore: number;
  totalTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  profitFactor: number;
  mostCommonMistake: string;
  bestStrategy: string;
  worstStrategy: string;
  disciplineScore: number;
  bestEventType: string;
  worstEventType: string;
  warnings: string[];
  suggestions: string[];
}

export interface PortfolioExposureResult {
  totalAssetValue: number;
  cash: number;
  investedValue: number;
  investedPct: number;
  maxSinglePositionPct: number;
  themeExposure: Record<string, number>;
  strategyExposure: Record<string, number>;
  eventDateExposure: Record<string, number>;
  marketBetaExposure: number;
  volatilityExposure: number;
  correlationGroups: Record<string, number>;
  alerts: RiskAlert[];
  warnings: string[];
}

export interface PositionSizingResult {
  suggestedShares: number;
  suggestedPositionPct: number;
  riskAdjustedPositionPct: number;
  confidenceAdjustedSize: number;
  estimatedCost: number;
  maxRiskAmount: number;
  warnings: string[];
}

export interface ReportExport extends DataTagged {
  id: string;
  title: string;
  format: "Markdown" | "CSV" | "JSON";
  content: string;
  generatedAt: string;
}

export interface AlphaEngineResult {
  event: Event;
  stock?: Stock;
  catalyst: CatalystScoreResult;
  alpha: CombinedAlphaResult;
  daysToEvent: number;
  pricedInRisk: RiskLevel;
  overheatRisk: RiskLevel;
}

export interface AppSettings extends DataTagged {
  dataMode: DataSource;
  appVersion: string;
  enableDemoData: boolean;
  baseCapital: number;
  defaultRiskPerTradePct: number;
  timezone: "Asia/Taipei";
}

export interface BackupPayload {
  version: string;
  exportedAt: string;
  events: Event[];
  tradePlans: TradePlan[];
  portfolio: Portfolio;
  journal: JournalEntry[];
  settings: AppSettings;
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  dataSource: DataSource;
  sourceNote: string;
  generatedAt: string;
}

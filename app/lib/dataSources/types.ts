import type {
  DataSource,
  EarningsRecord,
  InstitutionalFlowRecord,
  MarketWarningRecord,
  MonthlyRevenueRecord,
  PriceSnapshot,
  SecurityMasterRecord,
  SourceHealth
} from "../types";

export type OfficialDatasetType =
  | "securityMaster"
  | "priceSnapshot"
  | "institutionalFlow"
  | "marketWarnings"
  | "monthlyRevenue"
  | "earnings"
  | "dividends"
  | "events"
  | "themeNews";

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSource;
  enabled: boolean;
  baseUrl?: string;
  documentationUrl?: string;
  supportedDatasets: OfficialDatasetType[];
  sourceNote: string;
}

export interface OfficialFetchResult<T> {
  ok: boolean;
  data: T[];
  health: SourceHealth;
  dataSource: DataSource;
  sourceNote: string;
}

export interface OfficialDataBundle {
  securityMaster: SecurityMasterRecord[];
  priceSnapshots: PriceSnapshot[];
  institutionalFlows: InstitutionalFlowRecord[];
  marketWarnings: MarketWarningRecord[];
  monthlyRevenues: MonthlyRevenueRecord[];
  earnings: EarningsRecord[];
  health: SourceHealth[];
}

"use client";

import { useEffect, useState } from "react";
import { CsvImportPanel } from "../components/import/CsvImportPanel";
import { ImportTemplatePanel } from "../components/import/ImportTemplatePanel";
import { DataSourceBadge, MiniMetricGrid, RiskBadge, SectionCard, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { fetchBackendEventProviders, type BackendEventProviderStatus } from "../lib/backendEventsApi";
import { fetchDeployReadiness, type DeployReadinessCheck } from "../lib/deployReadinessApi";
import { loadImportedDataset, type ImportSummary } from "../lib/importers";
import { fetchKLine, fetchLatestQuote, fetchMarketProviders, fetchMarketWarnings, type MarketProviderStatus, type MarketWarningItem } from "../lib/marketApi";
import { fetchQuantDiagnostics, type QuantDatasetDiagnostic, type QuantDiagnosticsPayload } from "../lib/quantApi";
import type { SourceHealth } from "../lib/types";
import { formatDateTW } from "../lib/utils";

type SourceRow = SourceHealth & { id: string };
type MarketProviderRow = MarketProviderStatus & { id: string };
type EventProviderRow = BackendEventProviderStatus & { id: string };
type DeployCheckRow = DeployReadinessCheck & { id: string };
type WarningRow = MarketWarningItem & { id: string };
type QuantDiagnosticRow = QuantDatasetDiagnostic & { id: string };
const initialHealth: SourceRow[] = [
  { id: "twse", sourceId: "twse", sourceName: "TWSE OpenAPI", status: "degraded", recordsFetched: 0, errorMessage: "尚未手動刷新。" },
  { id: "tpex", sourceId: "tpex", sourceName: "TPEx OpenAPI", status: "degraded", recordsFetched: 0, errorMessage: "尚未手動刷新。" },
  { id: "mops", sourceId: "mops", sourceName: "MOPS 公開資訊觀測站", status: "degraded", recordsFetched: 0, errorMessage: "placeholder：請使用 CSV 匯入或 metadata link。" },
  { id: "csv-import", sourceId: "csv-import", sourceName: "CSV 匯入", status: "degraded", recordsFetched: 0, errorMessage: "尚未匯入 CSV。" },
  { id: "demo", sourceId: "demo", sourceName: "Demo Data", status: "ok", recordsFetched: 0 }
];

export default function DataCenterPage() {
  const [version, setVersion] = useState(0);
  const [health, setHealth] = useState<SourceRow[]>(initialHealth);
  const [marketProviders, setMarketProviders] = useState<MarketProviderRow[]>([]);
  const [eventProviders, setEventProviders] = useState<EventProviderRow[]>([]);
  const [deployChecks, setDeployChecks] = useState<DeployCheckRow[]>([]);
  const [officialWarnings, setOfficialWarnings] = useState<WarningRow[]>([]);
  const [quantDiagnostics, setQuantDiagnostics] = useState<QuantDiagnosticsPayload | null>(null);
  const [message, setMessage] = useState("");
  const [marketMessage, setMarketMessage] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("官方注意股 / 處置股 endpoint 未測試。未設定 endpoint 時會顯示 Missing，不會使用 Demo 冒充官方警示。");
  const [quantMessage, setQuantMessage] = useState("尚未檢查後端量化分析就緒度。");
  const [deployMessage, setDeployMessage] = useState("尚未檢查部署就緒狀態。");
  const imported = loadImportedDataset();
  const summaries = imported.summaries;

  async function loadSourceHealth() {
    try {
      const response = await fetch("/api/data-sources");
      const body = await response.json();
      const rows = (body.data?.health ?? []) as SourceHealth[];
      setHealth(rows.map((row) => ({ ...row, id: row.sourceId })));
      setMessage(body.sourceNote ?? "");
    } catch {
      setHealth([]);
      setMessage("資料源狀態讀取失敗；頁面仍可使用 CSV 匯入與示範資料。");
    }
  }

  async function loadEventProviders() {
    const rows = await fetchBackendEventProviders();
    setEventProviders(rows.map((row) => ({ ...row, id: row.provider })));
  }

  async function loadQuantDiagnostics() {
    setQuantMessage("正在檢查後端量化分析就緒度...");
    try {
      const payload = await fetchQuantDiagnostics();
      setQuantDiagnostics(payload);
      setQuantMessage(`量化就緒度 ${Math.round(payload.readinessScore)} / ${payload.readinessLevel}。${payload.recommendations.join(" ")}`);
    } catch {
      setQuantDiagnostics(null);
      setQuantMessage("量化診斷 API 無法連線；請確認後端 /quant/diagnostics 與 NEXT_PUBLIC_BACKEND_URL。 ");
    }
  }

  async function loadDeployReadiness() {
    setDeployMessage("正在檢查部署就緒狀態...");
    try {
      const payload = await fetchDeployReadiness();
      setDeployChecks(payload.checks.map((row) => ({ ...row, id: row.id })));
      const errors = payload.checks.filter((row) => row.status === "error").length;
      const warnings = payload.checks.filter((row) => row.status === "warning").length;
      setDeployMessage(`部署檢查完成：${errors} 個錯誤、${warnings} 個提醒。Backend: ${payload.backendUrl}`);
    } catch {
      setDeployMessage("部署就緒檢查失敗，請確認 NEXT_PUBLIC_BACKEND_URL 與後端服務狀態。 ");
    }
  }

  useEffect(() => {
    void loadSourceHealth();
    void fetchMarketProviders().then((rows) => setMarketProviders(rows.map((row) => ({ ...row, id: row.provider }))));
    void loadEventProviders();
    void loadDeployReadiness();
    void loadQuantDiagnostics();
  }, []);

  async function refresh(sourceId?: string) {
    setMessage("正在刷新官方資料源...");
    try {
      const response = await fetch("/api/data-sources/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sourceId ? { sourceIds: [sourceId] } : {})
      });
      const body = await response.json();
      const rows = (body.data?.health ?? []) as SourceHealth[];
      setHealth(rows.map((row) => ({ ...row, id: row.sourceId })));
      setMessage("刷新完成。若官方端點不可用，狀態會顯示 degraded 或 error。");
    } catch {
      setMessage("刷新失敗；已保留 fallback，不影響網站使用。");
    }
  }

  const sourceColumns: Array<DataTableColumn<SourceRow>> = [
    { key: "name", header: "資料源", accessor: (row) => <span className="font-semibold text-slate-950">{row.sourceName}</span>, searchValue: (row) => row.sourceName },
    { key: "status", header: "狀態", accessor: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
    { key: "records", header: "筆數", accessor: (row) => row.recordsFetched, sortValue: (row) => row.recordsFetched },
    { key: "latency", header: "延遲", accessor: (row) => row.latencyMs ? `${row.latencyMs} ms` : "-", sortValue: (row) => row.latencyMs ?? 0 },
    { key: "success", header: "最後成功", accessor: (row) => row.lastSuccessAt ? formatDateTW(row.lastSuccessAt) : "-", sortValue: (row) => row.lastSuccessAt ?? "" },
    { key: "failure", header: "最後失敗", accessor: (row) => row.lastFailureAt ? formatDateTW(row.lastFailureAt) : "-", sortValue: (row) => row.lastFailureAt ?? "" },
    { key: "error", header: "錯誤訊息", accessor: (row) => <span className="text-amber-700">{row.errorMessage ?? "-"}</span>, searchValue: (row) => row.errorMessage ?? "" }
  ];

  const deployColumns: Array<DataTableColumn<DeployCheckRow>> = [
    { key: "label", header: "檢查項目", accessor: (row) => <span className="font-semibold text-slate-950">{row.label}</span>, searchValue: (row) => row.label },
    { key: "status", header: "狀態", accessor: (row) => <DeployStatusBadge status={row.status} />, sortValue: (row) => row.status },
    { key: "value", header: "目前值", accessor: (row) => row.value, searchValue: (row) => row.value },
    { key: "detail", header: "說明", accessor: (row) => <span className="text-slate-600">{row.detail}</span>, searchValue: (row) => row.detail }
  ];

  const importColumns: Array<DataTableColumn<ImportSummary>> = [
    { key: "type", header: "資料類型", accessor: (row) => row.templateId, searchValue: (row) => row.templateId },
    { key: "file", header: "檔案", accessor: (row) => row.fileName, searchValue: (row) => row.fileName },
    { key: "time", header: "匯入時間", accessor: (row) => formatDateTW(row.importedAt), sortValue: (row) => row.importedAt },
    { key: "success", header: "成功", accessor: (row) => row.successRows, sortValue: (row) => row.successRows },
    { key: "errors", header: "錯誤", accessor: (row) => row.errorRows, sortValue: (row) => row.errorRows },
    { key: "generated", header: "生成事件", accessor: (row) => row.generatedEvents, sortValue: (row) => row.generatedEvents }
  ];

  const quantDiagnosticColumns: Array<DataTableColumn<QuantDiagnosticRow>> = [
    { key: "dataset", header: "Dataset", accessor: (row) => <span className="font-semibold text-slate-950">{row.dataset}</span>, searchValue: (row) => row.dataset },
    { key: "status", header: "狀態", accessor: (row) => <QuantStatusBadge status={row.status} />, sortValue: (row) => row.status },
    { key: "records", header: "筆數", accessor: (row) => row.records.toLocaleString("zh-TW"), sortValue: (row) => row.records },
    { key: "demo", header: "Demo/Fallback", accessor: (row) => row.demoRecords.toLocaleString("zh-TW"), sortValue: (row) => row.demoRecords },
    { key: "latest", header: "最後更新", accessor: (row) => row.latestTimestamp ? formatDateTW(row.latestTimestamp) : "-", sortValue: (row) => row.latestTimestamp ?? "" },
    { key: "stale", header: "距今小時", accessor: (row) => typeof row.stalenessHours === "number" ? row.stalenessHours.toFixed(1) : "-", sortValue: (row) => row.stalenessHours ?? 999999 },
    { key: "warning", header: "提醒", accessor: (row) => <span className="text-amber-700">{row.warning ?? "-"}</span>, searchValue: (row) => row.warning ?? "" }
  ];

  const marketColumns: Array<DataTableColumn<MarketProviderRow>> = [
    { key: "provider", header: "Provider", accessor: (row) => <span className="font-semibold text-slate-950">{row.provider}</span>, searchValue: (row) => row.provider },
    { key: "status", header: "狀態", accessor: (row) => <StatusBadge status={row.status as SourceHealth["status"]} />, sortValue: (row) => row.status },
    { key: "latest", header: "最新價", accessor: (row) => row.supportsLatestQuote ? "支援" : "不支援" },
    { key: "intraday", header: "分 K", accessor: (row) => row.supportsIntraday ? "支援" : "不支援" },
    { key: "daily", header: "日 K", accessor: (row) => row.supportsDaily ? "支援" : "不支援" },
    { key: "realtime", header: "即時", accessor: (row) => row.isRealtime ? "是" : "否" },
    { key: "token", header: "Token", accessor: (row) => row.tokenConfigured ? "已設定" : "未設定" },
    { key: "error", header: "說明", accessor: (row) => <span className="text-amber-700">{row.errorMessage ?? "-"}</span>, searchValue: (row) => row.errorMessage ?? "" }
  ];

  const eventColumns: Array<DataTableColumn<EventProviderRow>> = [
    { key: "provider", header: "事件 Provider", accessor: (row) => <span className="font-semibold text-slate-950">{row.provider}</span>, searchValue: (row) => row.provider },
    { key: "status", header: "狀態", accessor: (row) => <StatusBadge status={row.status as SourceHealth["status"]} />, sortValue: (row) => row.status },
    { key: "events", header: "事件", accessor: (row) => row.supportsEvents ? "支援" : "不支援" },
    { key: "revenue", header: "月營收", accessor: (row) => row.supportsMonthlyRevenue ? "支援" : "不支援" },
    { key: "dividend", header: "股利", accessor: (row) => row.supportsDividends ? "支援" : "不支援" },
    { key: "conference", header: "法說會", accessor: (row) => row.supportsInvestorConference ? "metadata" : "不支援" },
    { key: "warning", header: "注意/處置", accessor: (row) => row.supportsAttentionDisposition ? "支援" : "不支援" },
    { key: "token", header: "Token", accessor: (row) => row.tokenConfigured ? "已設定" : "未設定" },
    { key: "records", header: "事件筆數", accessor: (row) => row.recordsFetched, sortValue: (row) => row.recordsFetched },
    { key: "note", header: "說明", accessor: (row) => <span className="text-amber-700">{row.errorMessage ?? row.sourceNote}</span>, searchValue: (row) => `${row.errorMessage ?? ""} ${row.sourceNote}` }
  ];

  const warningColumns: Array<DataTableColumn<WarningRow>> = [
    { key: "symbol", header: "代號", accessor: (row) => <span className="font-semibold text-slate-950">{row.symbol}</span>, searchValue: (row) => row.symbol },
    { key: "name", header: "名稱", accessor: (row) => row.name, searchValue: (row) => row.name },
    { key: "market", header: "市場", accessor: (row) => row.market, searchValue: (row) => row.market },
    { key: "type", header: "類型", accessor: (row) => row.warningType === "disposition" ? "處置" : row.warningType === "attention" ? "注意" : "未知", searchValue: (row) => row.warningType },
    { key: "severity", header: "嚴重度", accessor: (row) => <RiskBadge level={row.severity} />, sortValue: (row) => row.severity },
    { key: "date", header: "生效日", accessor: (row) => row.effectiveDate ?? "-", sortValue: (row) => row.effectiveDate ?? "" },
    { key: "provider", header: "Provider", accessor: (row) => row.provider, searchValue: (row) => row.provider },
    { key: "reason", header: "原因", accessor: (row) => <span className="block max-w-96 truncate" title={row.reason}>{row.reason}</span>, searchValue: (row) => row.reason }
  ];

  async function testMarket(kind: "quote" | "kline") {
    setMarketMessage("正在測試 2330 市場資料...");
    try {
      if (kind === "quote") {
        const quote = await fetchLatestQuote("2330");
        setMarketMessage(`2330 最新價測試完成：NT$ ${quote.price}，來源 ${quote.provider} / ${quote.dataSource}。`);
      } else {
        const payload = await fetchKLine("2330", "1d", "1y");
        setMarketMessage(`2330 日 K 測試完成：${payload.bars.length} 筆，來源 ${payload.provider} / ${payload.dataSource}。`);
      }
      void loadQuantDiagnostics();
    } catch {
      setMarketMessage("市場資料測試失敗；前端會保留 fallback，不影響頁面使用。");
    }
  }

  async function testWarnings() {
    setWarningMessage("正在測試官方注意股 / 處置股資料...");
    try {
      const payload = await fetchMarketWarnings(["2330", "2382", "3017", "3231"]);
      setOfficialWarnings(payload.items.map((row) => ({ ...row, id: `${row.provider}-${row.warningType}-${row.symbol}-${row.effectiveDate ?? row.fetchedAt}` })));
      const providerSummary = payload.providerStatus.map((row) => `${row.provider}:${row.status}${typeof row.recordsFetched === "number" ? `(${row.recordsFetched})` : ""}`).join("、");
      setWarningMessage(`官方警示測試完成：${payload.items.length} 筆。${providerSummary}。${payload.sourceNote}`);
    } catch {
      setWarningMessage("官方警示測試失敗；不會使用 Demo 冒充注意股 / 處置股。 ");
      setOfficialWarnings([]);
    }
  }

  async function testEvents() {
    setEventMessage("正在測試後端事件 provider...");
    try {
      const rows = await fetchBackendEventProviders();
      setEventProviders(rows.map((row) => ({ ...row, id: row.provider })));
      const records = rows.reduce((sum, row) => sum + row.recordsFetched, 0);
      setEventMessage(`事件 provider 測試完成：${rows.length} 個 provider，正式事件 ${records} 筆。若為 0，代表目前需使用 Imported / Manual / Demo fallback。`);
    } catch {
      setEventMessage("事件 provider 測試失敗；前端會保留 Imported / Manual / Demo fallback。");
    }
  }

  const quantRows = quantDiagnostics?.datasets.map((row) => ({ ...row, id: row.dataset })) ?? [];
  const qualityItems = [
    { label: "匯入事件", value: imported.events.length },
    { label: "後端事件 Provider", value: eventProviders.length },
    { label: "後端正式事件", value: eventProviders.reduce((sum, row) => sum + row.recordsFetched, 0) },
    { label: "股價快照", value: imported.priceSnapshots.length },
    { label: "法人籌碼", value: imported.institutionalFlows.length },
    { label: "注意 / 處置", value: imported.marketWarnings.length + officialWarnings.length },
    { label: "量化就緒", value: quantDiagnostics ? Math.round(quantDiagnostics.readinessScore) : 0 },
    { label: "財報 / 股利", value: imported.earnings.length + imported.dividends.length }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">DATA SOURCE CENTER</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">資料狀態中心</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">管理 TWSE / TPEx / MOPS placeholder、CSV 匯入、後端事件 provider、量化就緒度與 Demo fallback。官方資料讀取失敗時會顯示錯誤，不會造成白屏。</p>
      </section>

      <SectionCard title="部署就緒檢查" action={<button className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800" onClick={() => void loadDeployReadiness()}>重新檢查</button>}>
        <DataTable rows={deployChecks} columns={deployColumns} emptyMessage="尚未取得部署就緒檢查。" />
        <p className="mt-3 text-sm text-amber-700">{deployMessage}</p>
      </SectionCard>

      <SectionCard title="資料源總覽" action={<button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => void refresh()}>刷新全部可用官方資料</button>}>
        <DataTable rows={health} columns={sourceColumns} emptyMessage="尚未取得資料源狀態。" primaryAction={(row) => (
          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => void refresh(row.sourceId)}>刷新</button>
        )} />
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>

      <SectionCard title="資料品質摘要">
        <MiniMetricGrid items={qualityItems} />
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          <DataSourceBadge source="Official" />
          <span>官方與後端 provider 優先作為行情 / 事件 metadata 來源。</span>
          <DataSourceBadge source="Imported" />
          <span>CSV 匯入優先於示範資料。</span>
          <DataSourceBadge source="Demo" />
          <span>Hybrid 模式會在缺資料時使用示範 fallback，且不得假裝真實。</span>
        </div>
      </SectionCard>

      <SectionCard title="量化分析就緒度" action={<button className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800" onClick={() => void loadQuantDiagnostics()}>重新檢查量化資料</button>}>
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Readiness Score</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{quantDiagnostics ? Math.round(quantDiagnostics.readinessScore) : "-"}</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Readiness Level</div>
            <div className="mt-2"><QuantLevelBadge level={quantDiagnostics?.readinessLevel ?? "not_ready"} /></div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Datasets</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{quantRows.length}</div>
          </div>
        </div>
        <DataTable rows={quantRows} columns={quantDiagnosticColumns} emptyMessage="尚未取得量化資料診斷。" />
        <p className="mt-3 text-sm text-amber-700">{quantMessage}</p>
        <WarningList warnings={quantDiagnostics?.recommendations ?? []} />
      </SectionCard>

      <SectionCard title="事件資料源" action={<button className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800" onClick={() => void testEvents()}>測試事件 Provider</button>}>
        <DataTable rows={eventProviders} columns={eventColumns} emptyMessage="尚未取得事件 provider 狀態。" />
        <p className="mt-3 text-sm text-amber-700">{eventMessage || "FinMind 事件 adapter 需要 token；MOPS / TWSE / TPEx 目前保守顯示 provider 狀態與 metadata，不做激進爬蟲。"}</p>
      </SectionCard>

      <SectionCard title="官方注意股 / 處置股" action={<button className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800" onClick={() => void testWarnings()}>測試官方警示</button>}>
        <DataTable rows={officialWarnings} columns={warningColumns} emptyMessage="尚未取得官方注意股 / 處置股資料。若 endpoint 未設定，這裡會維持空白而不使用 Demo 冒充。" />
        <p className="mt-3 text-sm text-amber-700">{warningMessage}</p>
      </SectionCard>

      <SectionCard title="報價與 K 線資料源" action={<div className="flex flex-wrap gap-2"><button className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800" onClick={() => void testMarket("quote")}>測試 2330 最新價</button><button className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800" onClick={() => void testMarket("kline")}>測試 2330 日 K</button></div>}>
        <DataTable rows={marketProviders} columns={marketColumns} emptyMessage="尚未取得報價 provider 狀態。" />
        <p className="mt-3 text-sm text-amber-700">{marketMessage || "FinMind 未設定 token 時會自動停用；官方資料若只支援盤後，前端會明確標示為延遲或盤後資料。"}</p>
      </SectionCard>

      <SectionCard title="CSV 模板下載">
        <ImportTemplatePanel />
      </SectionCard>

      <SectionCard title="CSV 匯入與驗證">
        <CsvImportPanel onImported={() => setVersion(version + 1)} />
      </SectionCard>

      <SectionCard title="匯入紀錄">
        <DataTable rows={summaries} columns={importColumns} emptyMessage="尚未匯入 CSV 資料。" renderExpanded={(row) => (
          <div className="space-y-1 text-sm text-slate-600">
            {row.errors.length ? row.errors.map((error, index) => <div key={`${error.row}-${error.field}-${index}`}>第 {error.row} 列 {error.field}：{error.message}</div>) : "沒有錯誤。"}
          </div>
        )} />
      </SectionCard>
    </div>
  );
}

function StatusBadge({ status }: { status: SourceHealth["status"] }) {
  const level = status === "ok" ? "low" : status === "degraded" ? "medium" : "high";
  return <div className="flex items-center gap-2"><RiskBadge level={level} /><span className="text-xs text-slate-500">{status}</span></div>;
}

function QuantStatusBadge({ status }: { status: string }) {
  const level = status === "ok" ? "low" : status === "stale" || status === "degraded" ? "medium" : "high";
  return <div className="flex items-center gap-2"><RiskBadge level={level} /><span className="text-xs text-slate-500">{status}</span></div>;
}

function QuantLevelBadge({ level }: { level: string }) {
  const risk = level === "ready" ? "low" : level === "usable_with_warnings" ? "medium" : level === "limited" ? "high" : "critical";
  return <div className="flex items-center gap-2"><RiskBadge level={risk} /><span className="text-xs text-slate-600">{level}</span></div>;
}

function DeployStatusBadge({ status }: { status: DeployReadinessCheck["status"] }) {
  const level = status === "ok" ? "low" : status === "warning" ? "medium" : "high";
  return <div className="flex items-center gap-2"><RiskBadge level={level} /><span className="text-xs text-slate-500">{status}</span></div>;
}

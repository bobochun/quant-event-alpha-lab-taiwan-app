"use client";

import { useEffect, useState } from "react";
import { CsvImportPanel } from "../components/import/CsvImportPanel";
import { ImportTemplatePanel } from "../components/import/ImportTemplatePanel";
import { DataSourceBadge, MiniMetricGrid, RiskBadge, SectionCard } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { loadImportedDataset, type ImportSummary } from "../lib/importers";
import { fetchKLine, fetchLatestQuote, fetchMarketProviders, type MarketProviderStatus } from "../lib/marketApi";
import type { SourceHealth } from "../lib/types";
import { formatDateTW } from "../lib/utils";

type SourceRow = SourceHealth & { id: string };
type MarketProviderRow = MarketProviderStatus & { id: string };
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
  const [message, setMessage] = useState("");
  const [marketMessage, setMarketMessage] = useState("");
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

  useEffect(() => {
    void loadSourceHealth();
    void fetchMarketProviders().then((rows) => setMarketProviders(rows.map((row) => ({ ...row, id: row.provider }))));
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

  const importColumns: Array<DataTableColumn<ImportSummary>> = [
    { key: "type", header: "資料類型", accessor: (row) => row.templateId, searchValue: (row) => row.templateId },
    { key: "file", header: "檔案", accessor: (row) => row.fileName, searchValue: (row) => row.fileName },
    { key: "time", header: "匯入時間", accessor: (row) => formatDateTW(row.importedAt), sortValue: (row) => row.importedAt },
    { key: "success", header: "成功", accessor: (row) => row.successRows, sortValue: (row) => row.successRows },
    { key: "errors", header: "錯誤", accessor: (row) => row.errorRows, sortValue: (row) => row.errorRows },
    { key: "generated", header: "生成事件", accessor: (row) => row.generatedEvents, sortValue: (row) => row.generatedEvents }
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
    } catch {
      setMarketMessage("市場資料測試失敗；前端會保留 fallback，不影響頁面使用。");
    }
  }

  const qualityItems = [
    { label: "匯入事件", value: imported.events.length },
    { label: "股價快照", value: imported.priceSnapshots.length },
    { label: "法人籌碼", value: imported.institutionalFlows.length },
    { label: "注意 / 處置", value: imported.marketWarnings.length },
    { label: "月營收", value: imported.monthlyRevenues.length },
    { label: "財報 / 股利", value: imported.earnings.length + imported.dividends.length },
    { label: "題材 metadata", value: imported.themeNews.length },
    { label: "ETF 調整", value: imported.etfRebalances.length }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">DATA SOURCE CENTER</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">資料狀態中心</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">管理 TWSE / TPEx / MOPS placeholder、CSV 匯入與 Demo fallback。官方資料讀取失敗時會顯示錯誤，不會造成白屏。</p>
      </section>

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
          <span>官方資料優先作為行情 / 基本資料來源。</span>
          <DataSourceBadge source="Imported" />
          <span>CSV 匯入優先於官方與示範資料。</span>
          <DataSourceBadge source="Demo" />
          <span>Hybrid 模式會在缺資料時使用示範 fallback。</span>
        </div>
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

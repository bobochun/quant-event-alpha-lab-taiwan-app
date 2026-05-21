"use client";

import { useState } from "react";
import { CsvImportPanel } from "../components/import/CsvImportPanel";
import { ImportTemplatePanel } from "../components/import/ImportTemplatePanel";
import { DataSourceBadge, RiskBadge, SectionCard } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { loadImportedDataset, type ImportSummary } from "../lib/importers";
import { mockDataStatus } from "../lib/mockData";
import { formatDateTW } from "../lib/utils";

type StatusRow = typeof mockDataStatus[number] & { id: string };

export default function DataCenterPage() {
  const [version, setVersion] = useState(0);
  const imported = loadImportedDataset();
  const summaries = imported.summaries;
  const statusRows: StatusRow[] = mockDataStatus.map((item) => ({ ...item, id: item.id }));

  const statusColumns: Array<DataTableColumn<StatusRow>> = [
    { key: "type", header: "資料類型", accessor: (row) => <span className="font-semibold text-slate-950">{row.type}</span>, searchValue: (row) => row.type },
    { key: "source", header: "資料來源", accessor: (row) => <DataSourceBadge source={row.dataSource} />, searchValue: (row) => row.dataSource },
    { key: "confidence", header: "可信度", accessor: (row) => <RiskBadge level={row.confidence < 50 ? "high" : "medium"} />, sortValue: (row) => row.confidence },
    { key: "updated", header: "最後更新", accessor: (row) => formatDateTW(row.lastUpdated), sortValue: (row) => row.lastUpdated },
    { key: "missing", header: "缺漏欄位", accessor: (row) => row.missingFields.join(", "), searchValue: (row) => row.missingFields.join(" ") },
    { key: "warning", header: "提醒", accessor: (row) => <span className="text-amber-700">{row.warning}</span>, searchValue: (row) => row.warning ?? "" }
  ];

  const importColumns: Array<DataTableColumn<ImportSummary>> = [
    { key: "type", header: "資料類型", accessor: (row) => row.templateId, searchValue: (row) => row.templateId },
    { key: "file", header: "檔名", accessor: (row) => row.fileName, searchValue: (row) => row.fileName },
    { key: "time", header: "最後匯入", accessor: (row) => formatDateTW(row.importedAt), sortValue: (row) => row.importedAt },
    { key: "success", header: "成功列數", accessor: (row) => row.successRows, sortValue: (row) => row.successRows },
    { key: "errors", header: "錯誤列數", accessor: (row) => row.errorRows, sortValue: (row) => row.errorRows },
    { key: "missing", header: "缺失欄位", accessor: (row) => row.missingFields.join(", ") || "無", searchValue: (row) => row.missingFields.join(" ") }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">資料狀態中心</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">資料狀態中心</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">目前不接 API，但可以下載 CSV 模板並手動匯入。匯入資料會標示為「匯入」，請自行確認來源與正確性。</p>
      </section>

      <SectionCard title="CSV 模板下載">
        <ImportTemplatePanel />
      </SectionCard>

      <SectionCard title="CSV 匯入">
        <CsvImportPanel onImported={() => setVersion(version + 1)} />
      </SectionCard>

      <SectionCard title="匯入狀態">
        <DataTable rows={summaries} columns={importColumns} emptyMessage="尚未匯入 CSV 資料。" renderExpanded={(row) => (
          <div className="space-y-1 text-sm text-slate-600">
            {row.errors.length ? row.errors.map((error, index) => <div key={`${error.row}-${error.field}-${index}`}>第 {error.row} 列 {error.field}：{error.message}</div>) : "沒有錯誤列。"}
          </div>
        )} />
      </SectionCard>

      <SectionCard title="資料來源狀態">
        <DataTable rows={statusRows} columns={statusColumns} emptyMessage="目前沒有資料來源狀態。" />
      </SectionCard>
    </div>
  );
}

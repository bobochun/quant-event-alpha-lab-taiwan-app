"use client";

import { useMemo, useRef, useState } from "react";
import { importTemplates, type ImportTemplateId } from "../../lib/importTemplates";
import { importCsv, previewCsvImport, type ImportSummary } from "../../lib/importers";

export function CsvImportPanel({ onImported }: { onImported?: () => void }) {
  const [templateId, setTemplateId] = useState<ImportTemplateId>("events");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [generateEvents, setGenerateEvents] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRows = useMemo(() => text.split(/\r?\n/).filter(Boolean).slice(0, 11), [text]);

  async function readFile(file: File) {
    setText(await file.text());
  }

  function validateOnly() {
    try {
      setSummary(previewCsvImport(templateId, text, generateEvents).summary);
    } catch (error) {
      setSummary(makeFailedSummary(templateId, error));
    }
  }

  function submit() {
    try {
      const result = importCsv(templateId, text, fileRef.current?.files?.[0]?.name, { generateEvents });
      setSummary(result.summary);
      onImported?.();
    } catch (error) {
      setSummary(makeFailedSummary(templateId, error));
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[220px_1fr_auto_auto]">
        <select className="rounded-md border border-slate-200 bg-white p-2 text-sm" value={templateId} onChange={(event) => setTemplateId(event.target.value as ImportTemplateId)}>
          {importTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
        </select>
        <input ref={fileRef} className="rounded-md border border-slate-200 bg-white p-2 text-sm" type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] ? void readFile(event.target.files[0]) : undefined} />
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={validateOnly}>先驗證</button>
        <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={submit}>套用匯入</button>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={generateEvents} onChange={(event) => setGenerateEvents(event.target.checked)} />
        根據月營收、財報、除權息、注意 / 處置、ETF 調整與題材新聞自動產生事件
      </label>
      <textarea className="min-h-56 w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800" value={text} onChange={(event) => setText(event.target.value)} placeholder="貼上 CSV 內容，或選擇 CSV 檔案後先驗證再套用。" />
      {previewRows.length ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-600">預覽前 10 筆</div>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-700">{previewRows.join("\n")}</pre>
        </div>
      ) : null}
      {summary ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-slate-950">匯入結果：成功 {summary.successRows} 筆，錯誤 {summary.errorRows} 筆，跳過 {summary.skippedRows} 筆，自動產生事件 {summary.generatedEvents} 筆</div>
          {summary.errors.length ? (
            <ul className="mt-2 space-y-1 text-xs text-rose-700">
              {summary.errors.slice(0, 10).map((error, index) => <li key={`${error.row}-${error.field}-${index}`}>第 {error.row} 列 {error.field}：{error.message}</li>)}
            </ul>
          ) : <p className="mt-2 text-xs text-emerald-700">驗證通過。套用匯入後會存入瀏覽器 localStorage，並在 Event Radar 重新計分。</p>}
        </div>
      ) : null}
    </div>
  );
}

function makeFailedSummary(templateId: ImportTemplateId, error: unknown): ImportSummary {
  return {
    id: `failed-${Date.now()}`,
    templateId,
    fileName: "unknown",
    importedAt: new Date().toISOString(),
    successRows: 0,
    errorRows: 1,
    skippedRows: 0,
    duplicateRows: 0,
    generatedEvents: 0,
    missingFields: [],
    errors: [{ row: 0, field: "csv", message: error instanceof Error ? error.message : "匯入失敗。" }]
  };
}

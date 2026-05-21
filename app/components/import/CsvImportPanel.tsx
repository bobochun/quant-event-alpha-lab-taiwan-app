"use client";

import { useRef, useState } from "react";
import { importTemplates, type ImportTemplateId } from "../../lib/importTemplates";
import { importCsv, type ImportSummary } from "../../lib/importers";

export function CsvImportPanel({ onImported }: { onImported?: () => void }) {
  const [templateId, setTemplateId] = useState<ImportTemplateId>("events");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function readFile(file: File) {
    setText(await file.text());
  }

  function submit() {
    try {
      const result = importCsv(templateId, text, fileRef.current?.files?.[0]?.name);
      setSummary(result.summary);
      onImported?.();
    } catch (error) {
      setSummary({
        id: `failed-${Date.now()}`,
        templateId,
        fileName: "unknown",
        importedAt: new Date().toISOString(),
        successRows: 0,
        errorRows: 1,
        missingFields: [],
        errors: [{ row: 0, field: "csv", message: error instanceof Error ? error.message : "匯入失敗。" }]
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
        <select className="rounded-md border border-slate-200 bg-white p-2 text-sm" value={templateId} onChange={(event) => setTemplateId(event.target.value as ImportTemplateId)}>
          {importTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
        </select>
        <input ref={fileRef} className="rounded-md border border-slate-200 bg-white p-2 text-sm" type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] ? void readFile(event.target.files[0]) : undefined} />
        <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={submit}>匯入 CSV</button>
      </div>
      <textarea className="min-h-56 w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800" value={text} onChange={(event) => setText(event.target.value)} placeholder="可選擇 CSV 檔，或直接貼上 CSV 內容。" />
      {summary ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-slate-950">匯入結果：成功 {summary.successRows} 列，錯誤 {summary.errorRows} 列</div>
          {summary.errors.length ? (
            <ul className="mt-2 space-y-1 text-xs text-rose-700">
              {summary.errors.slice(0, 10).map((error, index) => <li key={`${error.row}-${error.field}-${index}`}>第 {error.row} 列 {error.field}：{error.message}</li>)}
            </ul>
          ) : <p className="mt-2 text-xs text-emerald-700">匯入完成。資料來源會標示為「匯入」。</p>}
        </div>
      ) : null}
    </div>
  );
}

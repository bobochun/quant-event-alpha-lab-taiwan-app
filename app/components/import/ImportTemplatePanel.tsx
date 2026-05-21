"use client";

import { importTemplates, templateToCsv } from "../../lib/importTemplates";

export function ImportTemplatePanel() {
  function download(fileName: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {importTemplates.map((template) => (
        <div key={template.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-950">{template.title}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{template.description}</p>
            </div>
            <button className="shrink-0 rounded-md bg-cyan-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => download(template.fileName, templateToCsv(template))}>下載</button>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            必填：{template.columns.filter((column) => column.required).map((column) => column.name).join(", ")}
          </div>
        </div>
      ))}
    </div>
  );
}

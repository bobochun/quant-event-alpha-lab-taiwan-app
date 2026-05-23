"use client";

import { importTemplates, templateToCsv } from "../../lib/importTemplates";

export function ImportTemplatePanel() {
  function download(fileName: string, content: string) {
    const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
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
        <button
          key={template.id}
          className="rounded-md border border-slate-200 bg-slate-50 p-3 text-left hover:border-emerald-300 hover:bg-emerald-50"
          onClick={() => download(template.fileName, templateToCsv(template))}
        >
          <div className="font-semibold text-slate-950">{template.title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">{template.description}</div>
          <div className="mt-2 text-[11px] text-slate-500">必填：{template.columns.filter((column) => column.required).map((column) => column.name).join(", ")}</div>
        </button>
      ))}
    </div>
  );
}

"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "../ui";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string;
  className?: string;
}

export function DataTable<T extends { id?: string }>({
  rows,
  columns,
  primaryAction,
  renderExpanded,
  emptyMessage = "目前沒有資料。"
}: {
  rows: T[];
  columns: Array<DataTableColumn<T>>;
  primaryAction?: (row: T) => ReactNode;
  renderExpanded?: (row: T) => ReactNode;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter((row) => columns.some((column) => (column.searchValue?.(row) ?? String(column.accessor(row) ?? "")).toLowerCase().includes(q))) : rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = column.sortValue?.(a) ?? "";
      const bv = column.sortValue?.(b) ?? "";
      const result = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? result : -result;
    });
  }, [columns, query, rows, sortDir, sortKey]);

  function toggleSort(key: string) {
    setSortKey(key);
    setSortDir(sortKey === key && sortDir === "asc" ? "desc" : "asc");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <input className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋代號、名稱、事件、題材..." />
        <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1 text-xs">
          {(["compact", "comfortable"] as const).map((value) => (
            <button key={value} className={`rounded px-3 py-1 ${density === value ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-500"}`} onClick={() => setDensity(value)}>{value === "compact" ? "緊湊" : "舒適"}</button>
          ))}
        </div>
      </div>
      {!visible.length ? <EmptyState message={emptyMessage} /> : (
        <div className="max-h-[720px] overflow-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs text-slate-500">
              <tr>
                {renderExpanded ? <th className="px-3 py-2">詳情</th> : null}
                {columns.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-3 py-2 font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => column.sortValue ? toggleSort(column.key) : undefined}>
                      {column.header}{sortKey === column.key ? <span>{sortDir === "asc" ? "↑" : "↓"}</span> : null}
                    </button>
                  </th>
                ))}
                {primaryAction ? <th className="px-3 py-2">操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => {
                const id = row.id ?? String(index);
                const isOpen = expanded === id;
                return (
                  <Fragment key={id}>
                    <tr className="border-t border-slate-100 text-slate-700 hover:bg-cyan-50/50">
                      {renderExpanded ? <td className="whitespace-nowrap px-3 py-2"><button className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700" onClick={() => setExpanded(isOpen ? null : id)}>{isOpen ? "收合" : "展開詳情"}</button></td> : null}
                      {columns.map((column) => <td key={column.key} className={`${density === "compact" ? "px-3 py-2" : "px-3 py-3"} ${column.className ?? ""}`}>{column.accessor(row)}</td>)}
                      {primaryAction ? <td className="whitespace-nowrap px-3 py-2">{primaryAction(row)}</td> : null}
                    </tr>
                    {isOpen && renderExpanded ? <tr className="border-t border-slate-100 bg-slate-50"><td colSpan={columns.length + (primaryAction ? 2 : 1)} className="px-3 py-3">{renderExpanded(row)}</td></tr> : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

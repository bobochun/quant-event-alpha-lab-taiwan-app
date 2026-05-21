"use client";

import type { AlphaEngineResult, DataSource, EventType, RiskAlert, RiskLevel, ThemeHeatResult, TradePlan } from "../lib/types";
import type { TodayAction } from "../lib/actionList";
import {
  EVENT_TYPE_LABELS,
  RISK_CATEGORY_LABELS,
  formatCurrencyNTD,
  formatDataSource,
  formatDateTW,
  formatNextAction,
  formatRiskLevel,
  formatSharesLots,
  formatStrategy,
  formatSymbolName,
  localizeTheme
} from "../lib/utils";
import type { ReactNode } from "react";

export function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-600">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({ label, value, helper }: { label: string; value: ReactNode; helper?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-950">{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
    </div>
  );
}

export function MiniMetricGrid({ items }: { items: Array<{ label: string; value: ReactNode; helper?: string }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <MetricCard key={item.label} {...item} />)}</div>;
}

export function ScoreBadge({ score }: { score: number }) {
  const rounded = Math.round(score);
  const tone = rounded >= 80 ? "border-emerald-300 bg-emerald-50 text-emerald-800" : rounded >= 65 ? "border-cyan-300 bg-cyan-50 text-cyan-800" : rounded >= 50 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-rose-300 bg-rose-50 text-rose-800";
  return <span className={`inline-flex min-w-12 justify-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold tabular-nums ${tone}`}>{rounded}</span>;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const tone = level === "critical" ? "border-rose-400 bg-rose-100 text-rose-900" : level === "high" ? "border-orange-300 bg-orange-50 text-orange-800" : level === "medium" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-300 bg-emerald-50 text-emerald-800";
  return <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${tone}`}>{formatRiskLevel(level)}</span>;
}

export function DataSourceBadge({ source }: { source: DataSource }) {
  const tone = source === "Demo" || source === "Estimated" ? "border-amber-300 bg-amber-50 text-amber-800" : source === "Missing" ? "border-rose-300 bg-rose-50 text-rose-800" : source === "Imported" ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-300 bg-slate-50 text-slate-700";
  return <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${tone}`}>{formatDataSource(source)}</span>;
}

export function EventTypeBadge({ type }: { type: EventType }) {
  return <span className="inline-flex whitespace-nowrap rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800">{EVENT_TYPE_LABELS[type] ?? type}</span>;
}

export const CatalystScoreBadge = ScoreBadge;

export function ThemeBadge({ label }: { label: string }) {
  return <span className="inline-flex whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{localizeTheme(label)}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">{message || "目前沒有資料。"}</div>;
}

export function LoadingState() {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">資料載入中...</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">{message || "處理時發生錯誤。"}</div>;
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return <ul className="space-y-1 text-xs text-amber-700">{warnings.map((warning) => <li key={warning}>- {warning}</li>)}</ul>;
}

export function CatalystTable({ rows, limit, actions }: { rows: AlphaEngineResult[]; limit?: number; actions?: (row: AlphaEngineResult) => ReactNode }) {
  const visible = typeof limit === "number" ? rows.slice(0, limit) : rows;
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-100 text-[11px] text-slate-500">
          <tr className="border-b border-slate-200">
            {["距事件日", "事件日期", "代號", "名稱", "事件類型", "事件標題", "催化分數", "綜合 Alpha", "已反應風險", "風險等級", "下一步", "資料來源"].map((head) => <th key={head} className="whitespace-nowrap px-3 py-2.5 font-medium">{head}</th>)}
            {actions ? <th className="px-3 py-2.5 font-medium">操作</th> : null}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.event.id} className="border-b border-slate-100 text-slate-700 hover:bg-cyan-50/60">
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{row.daysToEvent} 天</td>
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatDateTW(row.event.eventDate)}</td>
              <td className="px-3 py-2.5 font-semibold text-slate-950">{row.event.symbol}</td>
              <td className="px-3 py-2.5">{row.event.name}</td>
              <td className="px-3 py-2.5"><EventTypeBadge type={row.event.eventType} /></td>
              <td className="max-w-[340px] truncate px-3 py-2.5 text-slate-700" title={row.event.eventTitle}>{row.event.eventTitle}</td>
              <td className="px-3 py-2.5"><ScoreBadge score={row.catalyst.totalCatalystScore} /></td>
              <td className="px-3 py-2.5"><ScoreBadge score={row.alpha.combinedAlphaScore} /></td>
              <td className="px-3 py-2.5"><RiskBadge level={row.pricedInRisk} /></td>
              <td className="px-3 py-2.5"><RiskBadge level={row.overheatRisk} /></td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-900">{formatNextAction(row.alpha.nextAction)}</td>
              <td className="px-3 py-2.5"><DataSourceBadge source={row.event.dataSource} /></td>
              {actions ? <td className="px-3 py-2.5">{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ThemeHeatPanel({ themes }: { themes: ThemeHeatResult[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {themes.map((theme) => (
        <div key={theme.theme} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-950">{localizeTheme(theme.theme)}</div>
            <ScoreBadge score={theme.heatScore} />
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-500">{theme.explanation}</div>
          <div className="mt-3 flex flex-wrap gap-2">{theme.relatedSymbols.map((symbol) => <ThemeBadge key={symbol} label={symbol} />)}</div>
          {theme.warnings.length ? <div className="mt-3 text-xs text-amber-700">{theme.warnings.join(" ")}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function TradePlanCard({ plan }: { plan: TradePlan }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-950">{formatSymbolName(plan.symbol, plan.name)}</div>
          <div className="mt-1 text-xs text-slate-500">{formatStrategy(plan.strategy)} / {plan.eventDate ? formatDateTW(plan.eventDate) : "無事件日期"}</div>
        </div>
        <DataSourceBadge source={plan.dataSource} />
      </div>
      <MiniMetricGrid items={[
        { label: "建議股數", value: formatSharesLots(plan.suggestedShares) },
        { label: "預估投入", value: formatCurrencyNTD(plan.estimatedCost) },
        { label: "最大可能虧損", value: formatCurrencyNTD(plan.maxRiskAmount) },
        { label: "部位比例", value: `${Math.round(plan.positionPct * 10) / 10}%` },
        { label: "第一停利 R/R", value: plan.riskReward1.toFixed(2) },
        { label: "第二停利 R/R", value: plan.riskReward2.toFixed(2) }
      ]} />
      <div className="mt-3 grid gap-2 text-xs text-slate-600">
        <div>事件失效條件：{plan.eventInvalidationRule}</div>
        <div>時間停損：{plan.timeStopRule}</div>
      </div>
      <div className="mt-3"><WarningList warnings={plan.warnings} /></div>
    </div>
  );
}

export function RiskAlertPanel({ alerts }: { alerts: RiskAlert[] }) {
  if (!alerts.length) return <EmptyState message="目前沒有符合條件的風險警示。" />;
  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge level={alert.severity} />
            <span className="text-xs text-slate-500">{RISK_CATEGORY_LABELS[alert.category] ?? alert.category}</span>
            {alert.symbol ? <span className="text-xs font-semibold text-slate-800">{alert.symbol}</span> : null}
          </div>
          <div className="mt-2 text-sm text-slate-900">{alert.message}</div>
          <div className="mt-1 text-xs text-cyan-800">下一步：{alert.suggestedAction}</div>
        </div>
      ))}
    </div>
  );
}

export function ActionList({ items }: { items: Array<string | TodayAction> }) {
  return (
    <div className="grid gap-2">
      {items.map((item, index) => {
        const action = typeof item === "string" ? null : item;
        const key = action?.id ?? `${item}-${index}`;
        return (
          <div key={key} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            {action ? (
              <>
                <div className="text-sm font-medium text-slate-950">[{action.priority}] {action.title}</div>
                <div className="mt-1 text-xs text-cyan-800">下一步：{action.nextStep}</div>
              </>
            ) : (
              <div className="text-sm text-slate-700">{String(item)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function JsonBackupPanel({ value, onChange, onExport, onImport, onReset, onClearDemo }: { value: string; onChange: (text: string) => void; onExport: () => void; onImport: () => void; onReset: () => void; onClearDemo: () => void }) {
  return (
    <div className="space-y-3">
      <textarea className="min-h-64 w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 outline-none focus:border-cyan-500" value={value} onChange={(event) => onChange(event.target.value)} placeholder="在這裡貼上 JSON 備份，或先按「匯出全部資料 JSON」。" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BackupButton title="匯出全部資料 JSON" text="下載或複製完整 localStorage 備份。" onClick={onExport} tone="emerald" />
        <BackupButton title="匯入 JSON 備份" text="把另一台電腦匯出的 JSON 貼上後匯入。" onClick={onImport} tone="cyan" />
        <BackupButton title="清除示範資料" text="切換為手動資料模式。" onClick={onClearDemo} tone="amber" confirmText="確定清除示範資料？" />
        <BackupButton title="重置本機資料" text="清除本機所有 MVP 資料。" onClick={onReset} tone="rose" confirmText="確定重置本機資料？此操作無法復原。" />
      </div>
    </div>
  );
}

function BackupButton({ title, text, onClick, tone, confirmText }: { title: string; text: string; onClick: () => void; tone: "emerald" | "cyan" | "amber" | "rose"; confirmText?: string }) {
  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800"
  }[tone];
  return (
    <button className={`rounded-md border p-3 text-left ${toneClass}`} onClick={() => {
      if (confirmText && !window.confirm(confirmText)) return;
      onClick();
    }}>
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-xs leading-5 opacity-80">{text}</span>
    </button>
  );
}

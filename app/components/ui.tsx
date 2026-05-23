"use client";

import type { ReactNode } from "react";
import type { AlphaEngineResult, DataSource, EventType, RiskAlert, RiskLevel, ThemeHeatResult, TradePlan } from "../lib/types";
import type { TodayAction } from "../lib/actionList";
import { EVENT_TYPE_LABELS, RISK_CATEGORY_LABELS, formatCurrencyNTD, formatDataSource, formatDateTW, formatNextAction, formatRiskLevel, formatSharesLots, formatStrategy, formatSymbolName, localizeTheme } from "../lib/utils";

export function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="terminal-card rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-sm ring-1 ring-cyan-400/5">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({ label, value, helper }: { label: string; value: ReactNode; helper?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/90 bg-slate-950/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-50">{value}</div>
      {helper ? <div className="mt-1 text-xs leading-5 text-slate-400">{helper}</div> : null}
    </div>
  );
}

export function MiniMetricGrid({ items }: { items: Array<{ label: string; value: ReactNode; helper?: string }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <MetricCard key={item.label} {...item} />)}</div>;
}

export function ScoreBadge({ score }: { score: number }) {
  const rounded = Math.round(score);
  const tone = rounded >= 80 ? "border-emerald-400/60 bg-emerald-400/12 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.12)]" : rounded >= 65 ? "border-cyan-400/60 bg-cyan-400/12 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.1)]" : rounded >= 50 ? "border-amber-400/60 bg-amber-400/12 text-amber-200" : "border-rose-400/60 bg-rose-400/12 text-rose-200";
  return <span className={`inline-flex min-w-12 justify-center whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-bold tabular-nums ${tone}`}>{rounded}</span>;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const tone = level === "critical" ? "border-rose-400/70 bg-rose-500/15 text-rose-200" : level === "high" ? "border-orange-400/70 bg-orange-500/12 text-orange-200" : level === "medium" ? "border-amber-400/70 bg-amber-400/12 text-amber-200" : "border-emerald-400/60 bg-emerald-400/12 text-emerald-200";
  return <span className={`inline-flex whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-semibold ${tone}`}>{formatRiskLevel(level)}</span>;
}

export function DataSourceBadge({ source }: { source: DataSource }) {
  const tone = source === "Demo" || source === "Estimated" ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : source === "Missing" || source === "Error" ? "border-rose-400/60 bg-rose-400/12 text-rose-200" : source === "Imported" ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : source === "Official" ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200" : "border-slate-600 bg-slate-800/80 text-slate-300";
  return <span className={`inline-flex whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-medium ${tone}`}>{formatDataSource(source)}</span>;
}

export function EventTypeBadge({ type }: { type: EventType }) {
  return <span className="inline-flex whitespace-nowrap rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-xs font-medium text-cyan-200">{EVENT_TYPE_LABELS[type] ?? type}</span>;
}

export const CatalystScoreBadge = ScoreBadge;

export function ThemeBadge({ label }: { label: string }) {
  return <span className="inline-flex whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-300">{localizeTheme(label)}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/55 p-4 text-sm text-slate-400">{message || "目前沒有資料。"}</div>;
}

export function LoadingState() {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-400">資料載入中...</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-xl border border-rose-400/50 bg-rose-500/12 p-4 text-sm text-rose-200">{message || "發生錯誤，請稍後再試。"}</div>;
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return <ul className="space-y-1 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-xs leading-5 text-amber-200">{warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>;
}

export function CatalystTable({ rows, limit, actions }: { rows: AlphaEngineResult[]; limit?: number; actions?: (row: AlphaEngineResult) => ReactNode }) {
  const visible = typeof limit === "number" ? rows.slice(0, limit) : rows;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-950/95 text-[11px] uppercase tracking-wide text-cyan-200">
          <tr className="border-b border-slate-800">
            {["距事件日", "事件日期", "代號", "名稱", "事件類型", "事件標題", "催化分數", "綜合 Alpha", "已反應風險", "風險等級", "下一步", "資料來源"].map((head) => <th key={head} className="whitespace-nowrap px-3 py-2.5 font-medium">{head}</th>)}
            {actions ? <th className="px-3 py-2.5 font-medium">操作</th> : null}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.event.id} className="border-b border-slate-800/70 text-slate-300 hover:bg-cyan-400/8">
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{row.daysToEvent} 天</td>
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatDateTW(row.event.eventDate)}</td>
              <td className="px-3 py-2.5 font-semibold text-slate-50">{row.event.symbol}</td>
              <td className="px-3 py-2.5">{row.event.name}</td>
              <td className="px-3 py-2.5"><EventTypeBadge type={row.event.eventType} /></td>
              <td className="max-w-[340px] truncate px-3 py-2.5 text-slate-300" title={row.event.eventTitle}>{row.event.eventTitle}</td>
              <td className="px-3 py-2.5"><ScoreBadge score={row.catalyst.totalCatalystScore} /></td>
              <td className="px-3 py-2.5"><ScoreBadge score={row.alpha.combinedAlphaScore} /></td>
              <td className="px-3 py-2.5"><RiskBadge level={row.pricedInRisk} /></td>
              <td className="px-3 py-2.5"><RiskBadge level={row.overheatRisk} /></td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-100">{formatNextAction(row.alpha.nextAction)}</td>
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
  return <div className="grid gap-3 lg:grid-cols-2">{themes.map((theme) => (
    <div key={theme.theme} className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
      <div className="flex items-center justify-between gap-3"><div className="font-semibold text-slate-50">{localizeTheme(theme.theme)}</div><ScoreBadge score={theme.heatScore} /></div>
      <div className="mt-2 text-xs leading-5 text-slate-400">{theme.explanation}</div>
      <div className="mt-3 flex flex-wrap gap-2">{theme.relatedSymbols.map((symbol) => <ThemeBadge key={symbol} label={symbol} />)}</div>
      {theme.warnings.length ? <div className="mt-3 text-xs text-amber-200">{theme.warnings.join(" ")}</div> : null}
    </div>
  ))}</div>;
}

export function TradePlanCard({ plan }: { plan: TradePlan }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="font-semibold text-slate-50">{formatSymbolName(plan.symbol, plan.name)}</div><div className="mt-1 text-xs text-slate-400">{formatStrategy(plan.strategy)} / {plan.eventDate ? formatDateTW(plan.eventDate) : "未設定事件日期"}</div></div>
        <DataSourceBadge source={plan.dataSource} />
      </div>
      <MiniMetricGrid items={[
        { label: "建議股數", value: formatSharesLots(plan.suggestedShares) },
        { label: "預估投入", value: formatCurrencyNTD(plan.estimatedCost) },
        { label: "最大虧損", value: formatCurrencyNTD(plan.maxRiskAmount) },
        { label: "部位比例", value: `${Math.round(plan.positionPct * 10) / 10}%` },
        { label: "TP1 R/R", value: plan.riskReward1.toFixed(2) },
        { label: "TP2 R/R", value: plan.riskReward2.toFixed(2) }
      ]} />
      <div className="mt-3 grid gap-2 text-xs text-slate-400"><div>事件失效：{plan.eventInvalidationRule}</div><div>時間停損：{plan.timeStopRule}</div></div>
      <div className="mt-3"><WarningList warnings={plan.warnings} /></div>
    </div>
  );
}

export function RiskAlertPanel({ alerts }: { alerts: RiskAlert[] }) {
  if (!alerts.length) return <EmptyState message="目前沒有高優先風險提醒。" />;
  return <div className="space-y-2">{alerts.map((alert) => (
    <div key={alert.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
      <div className="flex flex-wrap items-center gap-2"><RiskBadge level={alert.severity} /><span className="text-xs text-slate-400">{RISK_CATEGORY_LABELS[alert.category] ?? alert.category}</span>{alert.symbol ? <span className="text-xs font-semibold text-slate-100">{alert.symbol}</span> : null}</div>
      <div className="mt-2 text-sm text-slate-100">{alert.message}</div>
      <div className="mt-1 text-xs text-cyan-200">下一步：{alert.suggestedAction}</div>
    </div>
  ))}</div>;
}

export function ActionList({ items }: { items: Array<string | TodayAction> }) {
  return <div className="grid gap-2">{items.map((item, index) => {
    const action = typeof item === "string" ? null : item;
    const key = action?.id ?? `${item}-${index}`;
    return <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">{action ? <><div className="text-sm font-medium text-slate-50">[{action.priority}] {action.title}</div><div className="mt-1 text-xs text-cyan-200">下一步：{action.nextStep}</div></> : <div className="text-sm text-slate-300">{String(item)}</div>}</div>;
  })}</div>;
}

export function JsonBackupPanel({ value, onChange, onExport, onImport, onReset, onClearDemo }: { value: string; onChange: (text: string) => void; onExport: () => void; onImport: () => void; onReset: () => void; onClearDemo: () => void }) {
  return (
    <div className="space-y-3">
      <textarea className="min-h-64 w-full rounded-xl border border-slate-800 bg-slate-950/80 p-3 font-mono text-xs text-slate-200 outline-none focus:border-cyan-400" value={value} onChange={(event) => onChange(event.target.value)} placeholder="匯出後會在這裡顯示 JSON；匯入時請貼上完整 JSON 備份內容。" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BackupButton title="匯出全部資料 JSON" text="匯出事件、交易計畫、投組、日誌與設定。" onClick={onExport} tone="emerald" />
        <BackupButton title="匯入 JSON 備份" text="貼上另一台電腦匯出的 JSON 備份並套用。" onClick={onImport} tone="cyan" />
        <BackupButton title="清除示範資料" text="保留架構，清除示範事件與示範操作資料。" onClick={onClearDemo} tone="amber" confirmText="確定要清除示範資料嗎？" />
        <BackupButton title="重置本機資料" text="清除所有本機 MVP 資料、匯入資料與操作狀態。" onClick={onReset} tone="rose" confirmText="確定要重置所有本機資料嗎？這個動作無法復原。" />
      </div>
    </div>
  );
}

function BackupButton({ title, text, onClick, tone, confirmText }: { title: string; text: string; onClick: () => void; tone: "emerald" | "cyan" | "amber" | "rose"; confirmText?: string }) {
  const toneClass = { emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100", cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100", amber: "border-amber-400/30 bg-amber-400/10 text-amber-100", rose: "border-rose-400/30 bg-rose-400/10 text-rose-100" }[tone];
  return <button className={`rounded-xl border p-3 text-left ${toneClass}`} onClick={() => { if (confirmText && !window.confirm(confirmText)) return; onClick(); }}><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 opacity-80">{text}</span></button>;
}

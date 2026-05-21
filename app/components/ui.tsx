import type { AlphaEngineResult, DataSource, EventType, RiskAlert, RiskLevel, ThemeHeatResult, TradePlan } from "../lib/types";
import { EVENT_TYPE_LABELS, formatNextAction } from "../lib/utils";
import type { ReactNode } from "react";

export function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800/90 bg-[#0d1520]/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.02]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a121c] p-3 shadow-inner shadow-black/10">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums text-white">{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
    </div>
  );
}

export function MiniMetricGrid({ items }: { items: Array<{ label: string; value: string | number; helper?: string }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <MetricCard key={item.label} {...item} />)}</div>;
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : score >= 65 ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" : score >= 50 ? "border-amber-400/50 bg-amber-400/10 text-amber-200" : "border-rose-400/50 bg-rose-400/10 text-rose-200";
  return <span className={`inline-flex min-w-14 justify-center rounded-md border px-2 py-1 text-xs font-semibold tabular-nums ${tone}`}>{Math.round(score)}</span>;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const tone = level === "critical" ? "border-rose-400/60 bg-rose-400/15 text-rose-200" : level === "high" ? "border-amber-400/60 bg-amber-400/15 text-amber-200" : level === "medium" ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" : "border-emerald-400/50 bg-emerald-400/10 text-emerald-200";
  return <span className={`rounded-md border px-2 py-1 text-xs font-medium ${tone}`}>{level}</span>;
}

export function DataSourceBadge({ source }: { source: DataSource }) {
  const tone = source === "Demo" ? "border-amber-400/50 bg-amber-400/10 text-amber-200" : source === "Missing" ? "border-rose-400/50 bg-rose-400/10 text-rose-200" : "border-cyan-400/50 bg-cyan-400/10 text-cyan-200";
  return <span className={`rounded-md border px-2 py-1 text-xs font-medium ${tone}`}>{source}</span>;
}

export function EventTypeBadge({ type }: { type: EventType }) {
  return <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">{EVENT_TYPE_LABELS[type]}</span>;
}

export const CatalystScoreBadge = ScoreBadge;

export function ThemeBadge({ label }: { label: string }) {
  return <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">{label}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-400">{message}</div>;
}

export function LoadingState() {
  return <div className="rounded-md border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">Loading local research data...</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-md border border-rose-400/50 bg-rose-400/10 p-4 text-sm text-rose-200">{message}</div>;
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return <ul className="space-y-1 text-xs text-amber-200">{warnings.map((warning) => <li key={warning}>- {warning}</li>)}</ul>;
}

export function CatalystTable({ rows, limit, actions }: { rows: AlphaEngineResult[]; limit?: number; actions?: (row: AlphaEngineResult) => ReactNode }) {
  const visible = typeof limit === "number" ? rows.slice(0, limit) : rows;
  return (
    <div className="table-scroll border border-slate-800 bg-[#08101a]">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wide text-slate-500">
          <tr className="border-b border-slate-800">
            {["D", "Date", "Symbol", "Name", "Type", "Event", "Catalyst", "Alpha", "Priced-In", "Risk", "Next", "Source"].map((head) => <th key={head} className="px-3 py-2.5 font-medium">{head}</th>)}
            {actions ? <th className="px-3 py-2.5 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.event.id} className="border-b border-slate-800/80 text-slate-300 hover:bg-slate-800/35">
              <td className="px-3 py-2.5 tabular-nums">{row.daysToEvent}</td>
              <td className="px-3 py-2.5 tabular-nums">{row.event.eventDate}</td>
              <td className="px-3 py-2.5 font-semibold text-white">{row.event.symbol}</td>
              <td className="px-3 py-2.5">{row.event.name}</td>
              <td className="px-3 py-2.5"><EventTypeBadge type={row.event.eventType} /></td>
              <td className="max-w-[340px] px-3 py-2.5 text-slate-300">{row.event.eventTitle}</td>
              <td className="px-3 py-2.5"><ScoreBadge score={row.catalyst.totalCatalystScore} /></td>
              <td className="px-3 py-2.5"><ScoreBadge score={row.alpha.combinedAlphaScore} /></td>
              <td className="px-3 py-2.5"><RiskBadge level={row.pricedInRisk} /></td>
              <td className="px-3 py-2.5"><RiskBadge level={row.overheatRisk} /></td>
              <td className="px-3 py-2.5 text-slate-200">{formatNextAction(row.alpha.nextAction)}</td>
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
        <div key={theme.theme} className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-white">{theme.theme}</div>
            <ScoreBadge score={theme.heatScore} />
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-400">{theme.explanation}</div>
          <div className="mt-3 flex flex-wrap gap-2">{theme.relatedSymbols.map((symbol) => <ThemeBadge key={symbol} label={symbol} />)}</div>
          {theme.warnings.length ? <div className="mt-3 text-xs text-amber-200">{theme.warnings.join(" ")}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function TradePlanCard({ plan }: { plan: TradePlan }) {
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-white">{plan.symbol} {plan.name}</div>
        <DataSourceBadge source={plan.dataSource} />
      </div>
      <div className="mt-1 text-xs text-slate-500">{plan.strategy}</div>
      <div className="mt-3">
        <MiniMetricGrid items={[
          { label: "Shares", value: plan.suggestedShares },
          { label: "Lots", value: `${Math.floor(plan.suggestedShares / 1000)} lots + ${plan.suggestedShares % 1000} sh` },
          { label: "Cost", value: Math.round(plan.estimatedCost).toLocaleString() },
          { label: "Position", value: `${plan.positionPct}%` },
          { label: "RR TP2", value: plan.riskReward2 }
        ]} />
      </div>
      <div className="mt-3"><WarningList warnings={plan.warnings} /></div>
    </div>
  );
}

export function RiskAlertPanel({ alerts }: { alerts: RiskAlert[] }) {
  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-md border border-slate-800 bg-[#0a121c] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white">{alert.symbol ? `${alert.symbol} ` : ""}{alert.message}</div>
            <RiskBadge level={alert.severity} />
          </div>
          <div className="mt-1 text-xs text-slate-500">{alert.category} | {formatNextAction(alert.suggestedAction)}</div>
        </div>
      ))}
    </div>
  );
}

export function ActionList({ items }: { items: string[] }) {
  return <ul className="space-y-2 text-sm">{items.map((item) => <li key={item} className="rounded-md border border-slate-800 bg-[#0a121c] px-3 py-2 text-slate-300">{item}</li>)}</ul>;
}

export function JsonBackupPanel({ value, onChange, onExport, onImport, onReset, onClearDemo }: { value: string; onChange: (text: string) => void; onExport: () => void; onImport: () => void; onReset: () => void; onClearDemo: () => void }) {
  return (
    <div className="space-y-3">
      <textarea className="min-h-64 w-full rounded-md border border-slate-800 bg-[#07101a] p-3 font-mono text-xs text-slate-200" value={value} onChange={(event) => onChange(event.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button className="rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950" onClick={onExport}>Export JSON</button>
        <button className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950" onClick={onImport}>Import JSON</button>
        <button className="rounded-md border border-amber-400/70 px-3 py-2 text-sm text-amber-200" onClick={onClearDemo}>Clear Demo Data</button>
        <button className="rounded-md border border-rose-400/70 px-3 py-2 text-sm text-rose-200" onClick={onReset}>Reset Local Data</button>
      </div>
    </div>
  );
}

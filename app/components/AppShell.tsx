"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  Home,
  LineChart,
  Radar,
  RefreshCw,
  Settings,
  ShieldAlert,
  WalletCards,
  Workflow
} from "lucide-react";
import type { ReactNode } from "react";
import { useAutoRefresh } from "./AutoRefreshProvider";

const nav = [
  ["/", "每日主控台", Home, "3 分鐘工作流"],
  ["/market", "即時報價與 K 線", LineChart, "價格圖表"],
  ["/event-radar", "事件催化雷達", Radar, "未來 7 天"],
  ["/signal-radar", "訊號雷達", Gauge, "量化模式"],
  ["/ai-intelligence", "AI 情報", Bot, "事件抽取"],
  ["/theme-radar", "題材熱度雷達", Activity, "升溫題材"],
  ["/trade-plan", "交易計畫", ClipboardList, "部位試算"],
  ["/portfolio", "投組風控", WalletCards, "曝險檢查"],
  ["/risk-center", "風控中心", ShieldAlert, "風險警示"],
  ["/journal", "交易日誌", BookOpen, "紀律檢討"],
  ["/reports", "報告匯出", FileText, "週報備份"],
  ["/data-center", "資料狀態中心", Database, "來源品質"],
  ["/settings", "設定與備份", Settings, "JSON 移轉"],
  ["/backtest-lab", "回測實驗室", BarChart3, "即將推出"],
  ["/event-study", "事件研究", FlaskConical, "即將推出"],
  ["/strategy-studio", "策略工作室", Workflow, "即將推出"],
  ["/event-calendar", "事件行事曆", CalendarDays, "即將推出"]
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="terminal-skin min-h-screen bg-slate-950 text-slate-100">
      <Sidebar pathname={pathname} />
      <div className="lg:pl-72">
        <TopBar />
        <MobileNav pathname={pathname} />
        <main className="mx-auto max-w-[1680px] px-3 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-4">{children}</main>
      </div>
    </div>
  );
}

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-800/90 bg-slate-950/94 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl lg:block">
      <div className="relative overflow-hidden border-b border-slate-800/90 px-5 py-4">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-500/12 blur-2xl" />
        <div className="absolute -bottom-10 left-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative">
          <div className="inline-flex rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold tracking-[0.2em] text-emerald-300">QEAL-TW</div>
          <div className="mt-3 text-sm font-semibold tracking-wide text-slate-100">Quant Event Alpha Lab Taiwan</div>
          <div className="mt-1 text-xs text-slate-400">台股量化事件研究室</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-cyan-200">Event-driven</span>
            <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-200">Risk-first</span>
          </div>
        </div>
      </div>
      <nav className="h-[calc(100vh-132px)] space-y-1 overflow-y-auto p-3">
        {nav.map(([href, label, Icon, helper]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                active
                  ? "border-cyan-400/35 bg-cyan-400/12 text-cyan-50 shadow-[inset_3px_0_0_#22d3ee,0_0_30px_rgba(34,211,238,0.08)]"
                  : "border-transparent text-slate-400 hover:border-slate-700/80 hover:bg-slate-900/80 hover:text-slate-100"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-cyan-300" : "text-slate-500 group-hover:text-emerald-300"}`} />
              <span className="flex-1">
                <span className="block leading-4">{label}</span>
                <span className="block text-[11px] leading-4 text-slate-500 group-hover:text-slate-400">{helper}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function TopBar() {
  const autoRefresh = useAutoRefresh();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/86 px-3 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100 lg:hidden">台股量化事件研究室</div>
          <p className="max-w-5xl truncate text-[11px] leading-5 text-slate-400 md:text-xs" title="本工具僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議。所有交易請自行判斷並承擔風險。">
            本工具僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議。所有交易請自行判斷並承擔風險。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <AutoRefreshPill autoRefresh={autoRefresh} />
          <StatusPill tone="amber">研究資料</StatusPill>
          <StatusPill tone="cyan">Asia/Taipei</StatusPill>
          <StatusPill tone="emerald">No broker API</StatusPill>
        </div>
      </div>
    </header>
  );
}

function AutoRefreshPill({ autoRefresh }: { autoRefresh: ReturnType<typeof useAutoRefresh> }) {
  const label = autoRefresh.running ? "更新中" : autoRefresh.enabled ? "自動更新" : "自動更新關閉";
  const last = autoRefresh.lastRunAt ? new Date(autoRefresh.lastRunAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) : "尚未更新";
  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200 disabled:opacity-60"
      onClick={() => void autoRefresh.refreshNow(true)}
      disabled={!autoRefresh.enabled || autoRefresh.running}
      title="點擊立即刷新一次：報價、法人籌碼、量化掃描與來源摘要"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh.running ? "animate-spin" : ""}`} />
      <span>{label}</span>
      <span className="text-cyan-100/70">{last}</span>
    </button>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <div className="border-b border-slate-800/80 bg-slate-950/72 px-3 py-2 backdrop-blur-xl lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {nav.slice(0, 9).map(([href, label, Icon]) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs ${active ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100" : "border-slate-800 bg-slate-900/70 text-slate-400"}`}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "amber" | "cyan" | "emerald" | "slate" }) {
  const toneClass = {
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    slate: "border-slate-700 bg-slate-900/80 text-slate-300"
  }[tone];
  return <span className={`rounded-full border px-2 py-0.5 ${toneClass}`}>{children}</span>;
}

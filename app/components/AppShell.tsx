"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  Home,
  LineChart,
  Radar,
  Settings,
  ShieldAlert,
  WalletCards,
  Workflow
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  ["/", "每日主控台", Home, "3 分鐘工作流"],
  ["/market", "即時報價與 K 線", LineChart, "價格圖表"],
  ["/event-radar", "事件催化雷達", Radar, "未來 7 天"],
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
  ["/signal-radar", "訊號雷達", Gauge, "即將推出"],
  ["/event-calendar", "事件行事曆", CalendarDays, "即將推出"]
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Sidebar pathname={pathname} />
      <div className="lg:pl-72">
        <TopBar />
        <main className="mx-auto max-w-[1640px] px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur lg:block">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="text-xs font-semibold tracking-[0.18em] text-emerald-700">台股量化事件研究室</div>
        <div className="mt-2 text-base font-semibold text-slate-950">Quant Event Alpha Lab Taiwan</div>
        <div className="mt-1 text-xs text-slate-500">個人事件研究與風控終端</div>
      </div>
      <nav className="h-[calc(100vh-96px)] space-y-1 overflow-y-auto p-3">
        {nav.map(([href, label, Icon, helper]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                active ? "border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-[inset_3px_0_0_#059669]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-emerald-700" : "text-slate-400 group-hover:text-cyan-700"}`} />
              <span className="flex-1">
                <span className="block leading-4">{label}</span>
                <span className="block text-[11px] leading-4 text-slate-500">{helper}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950 lg:hidden">台股量化事件研究室</div>
          <p className="max-w-5xl text-xs leading-5 text-slate-600">
            本工具僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議。所有交易請自行判斷並承擔風險。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-800">示範資料，非即時行情</span>
          <span className="rounded border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-800">Asia/Taipei</span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">不接券商 API</span>
        </div>
      </div>
    </header>
  );
}

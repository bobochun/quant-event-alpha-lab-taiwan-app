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
  Radar,
  Settings,
  ShieldAlert,
  WalletCards,
  Workflow
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  ["/", "Command Center", Home, "Daily workflow"],
  ["/event-radar", "Event Radar", Radar, "7-day catalysts"],
  ["/theme-radar", "Theme Radar", Activity, "Theme heat"],
  ["/trade-plan", "Trade Plan", ClipboardList, "Sizing"],
  ["/portfolio", "Portfolio", WalletCards, "Exposure"],
  ["/risk-center", "Risk Center", ShieldAlert, "Alerts"],
  ["/journal", "Journal", BookOpen, "Behavior"],
  ["/reports", "Reports", FileText, "Exports"],
  ["/data-center", "Data Center", Database, "Sources"],
  ["/settings", "Settings", Settings, "Backup"],
  ["/backtest-lab", "Backtest Lab", BarChart3, "Strategy QA"],
  ["/event-study", "Event Study", FlaskConical, "Post-event"],
  ["/strategy-studio", "Strategy Studio", Workflow, "Playbooks"],
  ["/signal-radar", "Signal Radar", Gauge, "Factor scores"],
  ["/event-calendar", "Event Calendar", CalendarDays, "Schedule"]
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#070b10] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_34rem),linear-gradient(135deg,rgba(56,189,248,0.08),transparent_30rem)]" />
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-800/80 bg-[#0a1119]/95 backdrop-blur lg:block">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Quant Research</div>
        <div className="mt-2 text-base font-semibold text-white">Quant Event Alpha Lab Taiwan</div>
        <div className="mt-1 text-xs text-slate-400">Personal event alpha terminal</div>
      </div>
      <nav className="h-[calc(100vh-96px)] space-y-1 overflow-y-auto p-3">
        {nav.map(([href, label, Icon, helper]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                active ? "border border-emerald-400/30 bg-emerald-400/10 text-white shadow-[inset_3px_0_0_#34d399]" : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-emerald-300" : "text-slate-500 group-hover:text-cyan-300"}`} />
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
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#070b10]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-sm font-semibold text-white lg:hidden">Quant Event Alpha Lab Taiwan</div>
          <p className="max-w-5xl text-xs leading-5 text-slate-400">
            This tool is for personal research, strategy simulation, event tracking, and risk control only. It is not investment advice. All trades require your own judgment and risk responsibility.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-amber-200">Demo data visible</span>
          <span className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-200">Asia/Taipei</span>
          <span className="rounded border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-slate-300">No broker API</span>
        </div>
      </div>
    </header>
  );
}

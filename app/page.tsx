"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { analyzePortfolioExposure, calculateThemeHeat, classifyMarketRegime } from "./lib/alphaEngine";
import { mockEvents, mockPortfolio, mockStocks, mockThemes, mockTradePlans, mockSettings } from "./lib/mockData";
import { generateTodayActionList } from "./lib/actionList";
import { daysBetween, formatDataSource, MARKET_REGIME_LABELS, todayTaipei, VOLATILITY_LABELS, localizeTheme } from "./lib/utils";
import { ActionList, CatalystTable, DataSourceBadge, MiniMetricGrid, SectionCard, ThemeHeatPanel } from "./components/ui";
import { loadActionState, type ActionState } from "./lib/actionState";
import { fetchBackendPriceSnapshots } from "./lib/backendMarketSnapshots";
import { loadImportedDataset, mergeDemoImportedManualEvents, mergeStocksWithImported } from "./lib/importers";
import { recomputeEventScores } from "./lib/recomputeScores";
import { loadEvents, loadSettings, saveSettings } from "./lib/storage";
import type { AppSettings, PriceSnapshot } from "./lib/types";

const defaultWidgets = ["market", "snapshot", "topTable", "actions", "themeHeat", "portfolioRisk", "journal"];

export default function CommandCenterPage() {
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [settings, setSettings] = useState<AppSettings>(mockSettings);
  const [backendSnapshots, setBackendSnapshots] = useState<PriceSnapshot[]>([]);
  const [backendMarketNote, setBackendMarketNote] = useState("正在嘗試由後端行情 API 取得價格與 K 線資料...");

  useEffect(() => {
    setActionState(loadActionState());
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    const imported = loadImportedDataset();
    const manualEvents = loadEvents().filter((event) => event.dataSource === "Manual");
    const effectiveEvents = mergeDemoImportedManualEvents(mockEvents, imported.events, manualEvents);
    const symbols = effectiveEvents
      .filter((event) => daysBetween(todayTaipei(), event.eventDate) <= 7)
      .map((event) => event.symbol)
      .slice(0, 12);
    void fetchBackendPriceSnapshots(symbols).then((result) => {
      setBackendSnapshots(result.priceSnapshots);
      setBackendMarketNote(result.sourceNote);
    }).catch(() => {
      setBackendMarketNote("後端行情 API 暫時不可用；目前保留示範 / 匯入 fallback。資料來源會明確標示。");
    });
  }, []);

  const imported = loadImportedDataset();
  const manualEvents = loadEvents().filter((event) => event.dataSource === "Manual");
  const events = mergeDemoImportedManualEvents(mockEvents, imported.events, manualEvents);
  const baseStocks = mergeStocksWithImported(mockStocks, imported.stocks);
  const upcoming = events.filter((event) => daysBetween(todayTaipei(), event.eventDate) <= 7);
  const priceSnapshots = [...backendSnapshots, ...imported.priceSnapshots];
  const recomputed = recomputeEventScores({
    events: upcoming,
    stocks: baseStocks,
    themes: mockThemes,
    priceSnapshots,
    institutionalFlows: imported.institutionalFlows,
    marketWarnings: imported.marketWarnings
  });
  const rows = recomputed.enrichedEvents.sort((a, b) => b.alpha.combinedAlphaScore - a.alpha.combinedAlphaScore);
  const stocks = rows.map((row) => row.stock).filter((stock): stock is NonNullable<typeof stock> => Boolean(stock));
  const regime = classifyMarketRegime(stocks.length ? stocks : baseStocks);
  const themes = calculateThemeHeat(mockThemes, events, stocks.length ? stocks : baseStocks);
  const exposure = analyzePortfolioExposure(mockPortfolio);
  const widgets = settings.dashboardWidgets ?? defaultWidgets;
  const backendDataCount = backendSnapshots.filter((snapshot) => snapshot.dataSource !== "Demo").length;

  const actions = generateTodayActionList({
    rows,
    plannedEventIds: mockTradePlans.map((plan) => plan.relatedEventId).filter((id): id is string => Boolean(id)),
    exposure,
    hasJournalToday: false,
    actionState: actionState ?? undefined
  });

  const unpricedCandidates = rows.filter((row) => row.alpha.combinedAlphaScore >= 65 && (row.pricedInRisk === "low" || row.pricedInRisk === "medium")).length;
  const confirmCandidates = rows.filter((row) => row.catalyst.totalCatalystScore >= 65 && (row.pricedInRisk === "high")).length;
  const overheated = rows.filter((row) => row.pricedInRisk === "critical" || row.overheatRisk === "high" || row.overheatRisk === "critical").length;

  function completeOnboarding() {
    const next = { ...settings, onboardingCompleted: true };
    setSettings(next);
    saveSettings(next);
  }

  const workflow = [
    ["檢查市場狀態", "確認今天總水位與風險環境", "/"],
    ["查看事件催化雷達", "先看未來 7 天事件與已反應風險", "/event-radar"],
    ["挑 1–3 檔研究標的", "只保留尚未完全反應或待確認候選", "/event-radar"],
    ["建立交易計畫", "先算最大虧損、股數與張數", "/trade-plan"],
    ["檢查投組曝險", "避免同題材、同事件日過度集中", "/portfolio"],
    ["寫入交易日誌", "記錄是否追高、是否遵守計畫", "/journal"]
  ] as const;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-700">每日主控台</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">台股量化事件研究室</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">用事件催化、題材熱度、量化分數與風控紀律，找出未來 7 天值得研究的台股標的。</p>
            <p className="mt-3 max-w-5xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">本工具僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議。所有交易請自行判斷並承擔風險。</p>
            <p className="mt-2 text-xs text-cyan-800">{backendMarketNote} 事件資料若未匯入正式來源，仍會標示為 Demo / Imported / Manual。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DataSourceBadge source={backendDataCount ? "Cached" : imported.summaries.length ? "Imported" : "Demo"} />
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">後端行情 {backendDataCount || backendSnapshots.length} 檔</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">不做自動下單</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">不接券商 API</span>
          </div>
        </div>
      </section>

      {!settings.onboardingCompleted ? <OnboardingCard onDone={completeOnboarding} /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["今日市場狀態", MARKET_REGIME_LABELS[regime.regime], `建議總水位 ${regime.suggestedGrossExposurePct}%`],
          ["高催化事件", rows.filter((row) => row.catalyst.totalCatalystScore >= 70).length, `${upcoming.length} 筆事件待檢查`],
          ["尚未反應候選", unpricedCandidates, "Alpha >= 65 且已反應風險 <= 中"],
          ["待確認候選", confirmCandidates, "催化 >= 65 但已反應風險高"],
          ["過熱暫避", overheated, "避免追高，等待回測"],
          ["今日待辦", actions.length, "依優先級處理"]
        ].map(([label, value, helper]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
            <div className="mt-1 text-xs text-slate-500">{helper}</div>
          </div>
        ))}
      </div>

      <SectionCard title="3 分鐘工作流">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflow.map(([title, helper, href], index) => (
            <Link key={title} href={href} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 hover:border-emerald-300 hover:bg-emerald-50">
              <div className="text-xs font-semibold text-emerald-700">步驟 {index + 1}</div>
              <div className="mt-1 font-semibold text-slate-950">{title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">{helper}</div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        {widgets.includes("market") ? (
          <SectionCard title="今日市場狀態">
            <MiniMetricGrid items={[
              { label: "市場狀態", value: MARKET_REGIME_LABELS[regime.regime] },
              { label: "建議總水位", value: `${regime.suggestedGrossExposurePct}%` },
              { label: "波動狀態", value: VOLATILITY_LABELS[regime.volatilityState] },
              { label: "資料來源", value: formatDataSource(regime.dataSource) }
            ]} />
          </SectionCard>
        ) : null}

        {widgets.includes("snapshot") ? (
          <SectionCard title="未來 7 天事件快照">
            <MiniMetricGrid items={[
              { label: "事件總數", value: upcoming.length },
              { label: "高催化事件", value: rows.filter((row) => row.catalyst.totalCatalystScore >= 70).length },
              { label: "待確認候選", value: confirmCandidates },
              { label: "低可信度", value: rows.filter((row) => row.event.confidence < 50).length }
            ]} />
            <div className="mt-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">目前最熱題材：{themes[0] ? localizeTheme(themes[0].theme) : "無資料"}</div>
          </SectionCard>
        ) : null}

        <SectionCard title="快速操作">
          <div className="grid gap-2 text-sm">
            <Link className="rounded-md bg-emerald-600 px-3 py-2 font-semibold text-white" href="/event-radar">檢查事件催化雷達</Link>
            <Link className="rounded-md bg-cyan-600 px-3 py-2 font-semibold text-white" href="/trade-plan">建立交易計畫</Link>
            <Link className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50" href="/data-center">下載匯入模板</Link>
            <Link className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50" href="/settings">匯出 / 匯入 JSON 備份</Link>
          </div>
        </SectionCard>
      </div>

      {widgets.includes("themeHeat") ? <SectionCard title="題材熱度"><ThemeHeatPanel themes={themes.slice(0, 4)} /></SectionCard> : null}
      {widgets.includes("topTable") ? <SectionCard title="高催化事件清單"><CatalystTable rows={rows} limit={10} /></SectionCard> : null}
      {widgets.includes("actions") ? <SectionCard title="今日待辦事項"><ActionList items={actions} /></SectionCard> : null}
    </div>
  );
}

function OnboardingCard({ onDone }: { onDone: () => void }) {
  return (
    <SectionCard title="第一次使用">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="text-sm leading-6 text-slate-600">
          <p>目前行情與技術分數會優先使用後端 API；事件資料若尚未匯入正式來源，仍以 Demo 明確標示。可到資料狀態中心下載 CSV 模板補事件、月營收、股利、ETF 調整等資料。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href="/event-radar">檢查事件雷達</Link>
          <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" href="/market?symbol=2330">查看報價與 K 線</Link>
          <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" href="/data-center">下載匯入模板</Link>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" onClick={onDone}>不再顯示</button>
        </div>
      </div>
    </SectionCard>
  );
}

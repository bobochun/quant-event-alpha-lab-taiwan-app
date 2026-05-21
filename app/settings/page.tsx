"use client";

import { useEffect, useState } from "react";
import { exportFullBackupJson } from "../lib/exporters";
import { mockSettings } from "../lib/mockData";
import { clearDemoData, exportAllData, importAllData, loadSettings, resetLocalData, saveSettings } from "../lib/storage";
import type { AppSettings, BackupPayload } from "../lib/types";
import { JsonBackupPanel, MiniMetricGrid, SectionCard } from "../components/ui";
import { formatDataSource } from "../lib/utils";
import { resetActionState } from "../lib/actionState";
import { resetImportedDataset } from "../lib/importers";

const widgetOptions = [
  ["market", "市場狀態"],
  ["snapshot", "7-Day Catalyst Snapshot"],
  ["topTable", "Top Catalyst Table"],
  ["actions", "Today Action List"],
  ["themeHeat", "Theme Heat"],
  ["portfolioRisk", "Portfolio Risk"],
  ["journal", "Journal Discipline"]
] as const;

export default function SettingsPage() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<AppSettings>(mockSettings);

  useEffect(() => setSettings(loadSettings()), []);

  function refreshSettings() {
    setSettings(loadSettings());
  }

  function exportJson() {
    setText(exportFullBackupJson(exportAllData()));
    setMessage("已匯出本機 JSON 備份。");
    refreshSettings();
  }
  function importJson() {
    try {
      if (!text.trim()) return;
      importAllData(JSON.parse(text) as BackupPayload);
      setMessage("已匯入 JSON 備份，資料模式已改為匯入資料。");
      refreshSettings();
    } catch {
      setMessage("JSON 解析或匯入失敗，請檢查備份格式。");
    }
  }
  function reset() {
    resetLocalData();
    resetActionState();
    resetImportedDataset();
    setMessage("本機資料、action state 與匯入資料已重置。");
    refreshSettings();
  }
  function clearDemo() {
    clearDemoData();
    resetActionState();
    setMessage("示範資料已清除，已切換為手動資料模式。");
    refreshSettings();
  }
  function toggleWidget(widget: string) {
    const current = settings.dashboardWidgets ?? widgetOptions.map(([value]) => value);
    const nextWidgets = current.includes(widget) ? current.filter((item) => item !== widget) : [...current, widget];
    const next = { ...settings, dashboardWidgets: nextWidgets };
    setSettings(next);
    saveSettings(next);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">設定與備份</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">設定與備份</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">本機資料儲存在瀏覽器中，換電腦前請先匯出 JSON 備份。</p>
      </section>
      <SectionCard title="目前狀態">
        <MiniMetricGrid items={[
          { label: "目前資料模式", value: formatDataSource(settings.dataMode) },
          { label: "App 版本", value: settings.appVersion },
          { label: "時區", value: settings.timezone },
          { label: "示範資料啟用", value: settings.enableDemoData ? "是" : "否" }
        ]} />
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>
      <SectionCard title="首頁 Widget 顯示">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {widgetOptions.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" checked={(settings.dashboardWidgets ?? widgetOptions.map(([item]) => item)).includes(value)} onChange={() => toggleWidget(value)} />
              {label}
            </label>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="設定與備份說明">
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          <p>本機資料儲存在瀏覽器 localStorage 中，換電腦前請先匯出 JSON 備份。</p>
          <p>程式碼靠 GitHub 保存。使用者資料靠 JSON 備份移動。Vercel 部署只保存程式，不會自動同步你的 localStorage 資料。</p>
          <p>Action state 包含已檢查、7 天內忽略、使用者標記過熱、已建立交易計畫與已有日誌狀態。</p>
        </div>
      </SectionCard>
      <SectionCard title="JSON 備份 / 匯入">
        <JsonBackupPanel value={text} onChange={setText} onExport={exportJson} onImport={importJson} onReset={reset} onClearDemo={clearDemo} />
      </SectionCard>
    </div>
  );
}

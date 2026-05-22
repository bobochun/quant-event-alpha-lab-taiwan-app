"use client";

import { useEffect, useState } from "react";
import { exportFullBackupJson } from "../lib/exporters";
import { mockSettings } from "../lib/mockData";
import { clearDemoData, exportAllData, importAllData, loadSettings, resetLocalData, saveSettings } from "../lib/storage";
import type { AppDataMode, AppSettings, BackupPayload } from "../lib/types";
import { JsonBackupPanel, MiniMetricGrid, SectionCard } from "../components/ui";
import { formatDataSource } from "../lib/utils";
import { resetActionState } from "../lib/actionState";
import { resetImportedDataset } from "../lib/importers";

const widgetOptions = [
  ["market", "市場狀態"],
  ["snapshot", "7 日事件摘要"],
  ["topTable", "高催化事件"],
  ["actions", "今日待辦"],
  ["themeHeat", "題材熱度"],
  ["portfolioRisk", "投組風控"],
  ["journal", "紀律統計"]
] as const;

const dataModes: Array<{ value: AppDataMode; title: string; text: string }> = [
  { value: "DemoOnly", title: "Demo only", text: "只用示範資料，適合展示與測試流程。" },
  { value: "Hybrid", title: "Hybrid", text: "手動 / 匯入 / 官方優先，缺資料時用 Demo fallback。" },
  { value: "RealImportedOnly", title: "Real / Imported only", text: "只用手動、匯入、官方資料，不使用 Demo fallback。" }
];

export default function SettingsPage() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<AppSettings>(mockSettings);

  useEffect(() => setSettings(loadSettings()), []);

  function persist(next: AppSettings) {
    setSettings(next);
    saveSettings(next);
  }

  function exportJson() {
    setText(exportFullBackupJson(exportAllData()));
    setMessage("已產生完整 JSON 備份。");
  }
  function importJson() {
    try {
      if (!text.trim()) return;
      importAllData(JSON.parse(text) as BackupPayload);
      setSettings(loadSettings());
      setMessage("已匯入 JSON 備份。");
    } catch {
      setMessage("JSON 格式不正確，請確認備份內容。");
    }
  }
  function reset() {
    resetLocalData();
    resetActionState();
    resetImportedDataset();
    setSettings(mockSettings);
    setMessage("已重置本機資料、action state 與匯入資料。");
  }
  function clearDemo() {
    clearDemoData();
    resetActionState();
    setSettings(loadSettings());
    setMessage("已清除示範資料，資料模式切換為 Real / Imported only。");
  }
  function toggleWidget(widget: string) {
    const current = settings.dashboardWidgets ?? widgetOptions.map(([value]) => value);
    persist({ ...settings, dashboardWidgets: current.includes(widget) ? current.filter((item) => item !== widget) : [...current, widget] });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">SETTINGS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">設定與備份</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">本機資料儲存在瀏覽器 localStorage。程式碼靠 GitHub 保存，使用者資料靠 JSON 備份移動；Vercel 部署不會自動同步你的 localStorage。</p>
      </section>

      <SectionCard title="目前狀態">
        <MiniMetricGrid items={[
          { label: "資料模式", value: formatDataSource(settings.dataMode) },
          { label: "App 版本", value: settings.appVersion },
          { label: "時區", value: settings.timezone },
          { label: "示範資料", value: settings.enableDemoData ? "啟用" : "停用" }
        ]} />
        <p className="mt-3 text-sm text-amber-700">{message}</p>
      </SectionCard>

      <SectionCard title="資料模式">
        <div className="grid gap-3 md:grid-cols-3">
          {dataModes.map((mode) => (
            <label key={mode.value} className={`rounded-md border p-3 text-sm ${settings.dataMode === mode.value ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center gap-2 font-semibold text-slate-950">
                <input type="radio" checked={settings.dataMode === mode.value} onChange={() => persist({ ...settings, dataMode: mode.value, enableDemoData: mode.value !== "RealImportedOnly" })} />
                {mode.title}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{mode.text}</p>
            </label>
          ))}
        </div>
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

      <SectionCard title="換電腦流程">
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          <p>1. 在舊電腦匯出完整 JSON 備份。</p>
          <p>2. 程式碼以 GitHub / Vercel 保存與部署。</p>
          <p>3. 在新電腦開啟網站後匯入 JSON 備份，即可恢復事件、交易計畫、投組、日誌與設定。</p>
        </div>
      </SectionCard>

      <SectionCard title="JSON 備份 / 匯入">
        <JsonBackupPanel value={text} onChange={setText} onExport={exportJson} onImport={importJson} onReset={reset} onClearDemo={clearDemo} />
      </SectionCard>
    </div>
  );
}

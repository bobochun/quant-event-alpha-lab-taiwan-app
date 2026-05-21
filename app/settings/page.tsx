"use client";

import { useEffect, useState } from "react";
import { exportFullBackupJson } from "../lib/exporters";
import { mockSettings } from "../lib/mockData";
import { clearDemoData, exportAllData, importAllData, loadSettings, resetLocalData } from "../lib/storage";
import type { AppSettings, BackupPayload } from "../lib/types";
import { JsonBackupPanel, MiniMetricGrid, SectionCard } from "../components/ui";
import { formatDataSource } from "../lib/utils";

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
    setMessage("本機資料已重置。尚未儲存新資料前，會回到示範資料。");
    refreshSettings();
  }
  function clearDemo() {
    clearDemoData();
    setMessage("示範資料已清除，已切換為手動資料模式。");
    refreshSettings();
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
      <SectionCard title="設定與備份說明">
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          <p>本機資料儲存在瀏覽器 localStorage 中，換電腦前請先匯出 JSON 備份。</p>
          <p>程式碼靠 GitHub 保存。使用者資料靠 JSON 備份移動。Vercel 部署只保存程式，不會自動同步你的 localStorage 資料。</p>
          <p>換電腦流程：推送程式碼到 GitHub，於新電腦 clone 專案並啟動，打開設定與備份頁後匯入 JSON。</p>
        </div>
      </SectionCard>
      <SectionCard title="JSON 備份 / 匯入">
        <JsonBackupPanel value={text} onChange={setText} onExport={exportJson} onImport={importJson} onReset={reset} onClearDemo={clearDemo} />
      </SectionCard>
    </div>
  );
}

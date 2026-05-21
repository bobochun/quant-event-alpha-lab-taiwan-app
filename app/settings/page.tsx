"use client";

import { useEffect, useState } from "react";
import { exportFullBackupJson } from "../lib/exporters";
import { mockSettings } from "../lib/mockData";
import { clearDemoData, exportAllData, importAllData, loadSettings, resetLocalData } from "../lib/storage";
import type { AppSettings, BackupPayload } from "../lib/types";
import { JsonBackupPanel, MiniMetricGrid, SectionCard } from "../components/ui";

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
    setMessage("Exported local JSON backup.");
    refreshSettings();
  }
  function importJson() {
    try {
      if (!text.trim()) return;
      importAllData(JSON.parse(text) as BackupPayload);
      setMessage("Imported JSON backup. Data mode is now Imported.");
      refreshSettings();
    } catch {
      setMessage("JSON parse/import failed.");
    }
  }
  function reset() {
    resetLocalData();
    setMessage("Local data reset. Demo fallback will be used until new data is saved.");
    refreshSettings();
  }
  function clearDemo() {
    clearDemoData();
    setMessage("Demo data cleared. Manual mode enabled.");
    refreshSettings();
  }
  return (
    <div className="space-y-4">
      <SectionCard title="Settings">
        <MiniMetricGrid items={[
          { label: "Data Mode", value: settings.dataMode },
          { label: "App Version", value: settings.appVersion },
          { label: "Timezone", value: settings.timezone },
          { label: "Demo Enabled", value: String(settings.enableDemoData) }
        ]} />
        <p className="mt-3 text-sm text-amber">{message}</p>
      </SectionCard>
      <SectionCard title="JSON Backup / Import">
        <JsonBackupPanel value={text} onChange={setText} onExport={exportJson} onImport={importJson} onReset={reset} onClearDemo={clearDemo} />
      </SectionCard>
    </div>
  );
}

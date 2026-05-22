import type { AppSettings, BackupPayload, Event, JournalEntry, Portfolio, TradePlan } from "./types";
import { mockEvents, mockJournal, mockPortfolio, mockSettings, mockTradePlans } from "./mockData";

const keys = {
  events: "qealt.events",
  tradePlans: "qealt.tradePlans",
  portfolio: "qealt.portfolio",
  journal: "qealt.journal",
  settings: "qealt.settings"
};

export function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const loadEvents = () => loadJson<Event[]>(keys.events, mockEvents);
export const saveEvents = (events: Event[]) => saveJson(keys.events, events);
export const loadTradePlans = () => loadJson<TradePlan[]>(keys.tradePlans, mockTradePlans);
export const saveTradePlans = (plans: TradePlan[]) => saveJson(keys.tradePlans, plans);
export const loadPortfolio = () => loadJson<Portfolio>(keys.portfolio, mockPortfolio);
export const savePortfolio = (portfolio: Portfolio) => saveJson(keys.portfolio, portfolio);
export const loadJournal = () => loadJson<JournalEntry[]>(keys.journal, mockJournal);
export const saveJournal = (journal: JournalEntry[]) => saveJson(keys.journal, journal);
export const loadSettings = () => loadJson<AppSettings>(keys.settings, mockSettings);
export const saveSettings = (settings: AppSettings) => saveJson(keys.settings, settings);

export function exportAllData(): BackupPayload {
  return {
    version: "1",
    exportedAt: new Date().toISOString(),
    events: loadEvents(),
    tradePlans: loadTradePlans(),
    portfolio: loadPortfolio(),
    journal: loadJournal(),
    settings: loadSettings()
  };
}

export function importAllData(payload: BackupPayload): void {
  saveEvents(payload.events);
  saveTradePlans(payload.tradePlans);
  savePortfolio(payload.portfolio);
  saveJournal(payload.journal);
  saveSettings({ ...payload.settings, dataMode: payload.settings.dataMode ?? "Hybrid" });
}

export function resetLocalData(): void {
  if (!canUseStorage()) return;
  Object.values(keys).forEach((key) => window.localStorage.removeItem(key));
}

export function clearDemoData(): void {
  saveEvents([]);
  saveTradePlans([]);
  savePortfolio({ ...mockPortfolio, positions: [], cash: 0, dataSource: "Manual", sourceNote: "手動資料模式，已清除示範投組。" });
  saveJournal([]);
  saveSettings({ ...mockSettings, dataMode: "RealImportedOnly", enableDemoData: false, dataSource: "Manual", sourceNote: "手動資料模式，已清除示範資料。" });
}

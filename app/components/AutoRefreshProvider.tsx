"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAutoRefreshIntervalMs, isFrontendAutoRefreshEnabled, runAutoRefreshCycle, type AutoRefreshJobResult } from "../lib/autoRefreshApi";

type AutoRefreshContextValue = {
  enabled: boolean;
  running: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  results: AutoRefreshJobResult[];
  warnings: string[];
  refreshNow: (includeHeavyJobs?: boolean) => Promise<void>;
};

const AutoRefreshContext = createContext<AutoRefreshContextValue | null>(null);

export function AutoRefreshProvider({ children }: { children: ReactNode }) {
  const enabled = isFrontendAutoRefreshEnabled();
  const intervalMs = getAutoRefreshIntervalMs();
  const [running, setRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);
  const [results, setResults] = useState<AutoRefreshJobResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const startedRef = useRef(false);

  async function refreshNow(includeHeavyJobs = false) {
    if (!enabled || running) return;
    setRunning(true);
    try {
      const jobResults = await runAutoRefreshCycle({ includeHeavyJobs });
      const now = new Date().toISOString();
      setResults(jobResults);
      setWarnings(jobResults.filter((row) => !row.ok).map((row) => `${row.jobName}: ${row.message}`));
      setLastRunAt(now);
      setNextRunAt(new Date(Date.now() + intervalMs).toISOString());
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;
    const startTimer = window.setTimeout(() => void refreshNow(false), 2000);
    const interval = window.setInterval(() => void refreshNow(false), intervalMs);
    setNextRunAt(new Date(Date.now() + intervalMs).toISOString());
    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);

  const value = useMemo<AutoRefreshContextValue>(() => ({ enabled, running, lastRunAt, nextRunAt, results, warnings, refreshNow }), [enabled, running, lastRunAt, nextRunAt, results, warnings]);

  return <AutoRefreshContext.Provider value={value}>{children}</AutoRefreshContext.Provider>;
}

export function useAutoRefresh(): AutoRefreshContextValue {
  const context = useContext(AutoRefreshContext);
  if (!context) {
    return { enabled: false, running: false, lastRunAt: null, nextRunAt: null, results: [], warnings: [], refreshNow: async () => undefined };
  }
  return context;
}

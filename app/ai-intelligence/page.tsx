"use client";

import { useEffect, useState } from "react";
import { DataSourceBadge, ScoreBadge, SectionCard, WarningList } from "../components/ui";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { analyzeSourceDigest, extractEventFactors, fetchAIStatus, type AIEventFactor, type AIStatus } from "../lib/aiApi";

const inputClass = "rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-cyan-500";

export default function AIIntelligencePage() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [symbolsText, setSymbolsText] = useState("2330,2382,2317");
  const [themesText, setThemesText] = useState("AI server,CoWoS,Semiconductor");
  const [manualText, setManualText] = useState("2330 台積電將舉辦法說會，市場關注 AI server 與 CoWoS 需求。請僅抽取研究因子，不要給買賣建議。");
  const [rows, setRows] = useState<AIEventFactor[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState("AI Intelligence 會把 source digest 或手動摘要轉成結構化 AI factors；預設只顯示，不納入 alpha score。");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchAIStatus().then(setStatus).catch((error) => setWarnings([error instanceof Error ? error.message : "AI status failed"]));
  }, []);

  async function runSourceDigest() {
    setLoading(true);
    setMessage("正在分析 source digest metadata...");
    try {
      const payload = await analyzeSourceDigest(splitInput(symbolsText), splitInput(themesText), 8);
      setRows(payload.factors);
      setWarnings(payload.warnings);
      setMessage(`完成 ${payload.factors.length} 筆 AI factor 抽取；模型：${payload.model}。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "AI source digest analysis failed"]);
      setMessage("AI source digest analysis 失敗，請確認 backend 已啟動。 ");
    } finally {
      setLoading(false);
    }
  }

  async function runManualExtraction() {
    setLoading(true);
    setMessage("正在分析手動輸入文字...");
    try {
      const payload = await extractEventFactors({ text: manualText, symbols: splitInput(symbolsText), themes: splitInput(themesText) });
      setRows(payload.factors);
      setWarnings(payload.warnings);
      setMessage(`完成手動文字 AI factor 抽取；模型：${payload.model}。`);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "AI extraction failed"]);
      setMessage("AI extraction 失敗，請確認 backend 已啟動。 ");
    } finally {
      setLoading(false);
    }
  }

  const columns: Array<DataTableColumn<AIEventFactor>> = [
    { key: "symbol", header: "代號", accessor: (row) => <span className="font-semibold text-slate-950">{row.symbol}</span>, searchValue: (row) => row.symbol },
    { key: "event", header: "事件", accessor: (row) => row.eventType, searchValue: (row) => row.eventType },
    { key: "score", header: "AI資訊分", accessor: (row) => <ScoreBadge score={row.aiInformationScore} />, sortValue: (row) => row.aiInformationScore },
    { key: "confidence", header: "信心", accessor: (row) => `${Math.round(row.confidence * 100)}%`, sortValue: (row) => row.confidence },
    { key: "method", header: "方法", accessor: (row) => row.extractionMethod === "openai" ? "OpenAI" : "Fallback", searchValue: (row) => row.extractionMethod },
    { key: "alpha", header: "納入Alpha", accessor: (row) => row.shouldIncludeInAlpha ? <span className="text-emerald-700">可納入</span> : <span className="text-slate-500">顯示用</span>, sortValue: (row) => row.shouldIncludeInAlpha ? 1 : 0 },
    { key: "themes", header: "題材", accessor: (row) => <span className="block max-w-60 truncate" title={row.relatedThemes.join("、")}>{row.relatedThemes.join("、")}</span>, searchValue: (row) => row.relatedThemes.join(" ") },
    { key: "risk", header: "Risk Flags", accessor: (row) => <span className="block max-w-60 truncate text-amber-700" title={row.riskFlags.join("、")}>{row.riskFlags.join("、") || "-"}</span>, searchValue: (row) => row.riskFlags.join(" ") }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">AI QUANT INTELLIGENCE</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">AI 輔助事件量化情報</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">把非量化資料轉成可驗證的 AI factors：事件新鮮度、驚喜度、市場知曉度、來源可信度、題材關聯與風險旗標。AI 不直接輸出買賣建議，預設也不納入最終 alpha score。</p>
      </section>

      <SectionCard title="AI 狀態">
        {status ? <div className="grid gap-3 md:grid-cols-4">
          <StatusMetric label="ENABLE_AI_QUANT" value={status.enabled ? "on" : "off"} />
          <StatusMetric label="OPENAI_API_KEY" value={status.hasApiKey ? "已設定" : "未設定"} />
          <StatusMetric label="模型" value={status.hasApiKey ? status.model : "rule fallback"} />
          <StatusMetric label="納入 Alpha" value={status.scoreInAlpha ? "on" : "off"} />
        </div> : <p className="text-sm text-slate-500">正在讀取 AI 狀態...</p>}
        <p className="mt-3 text-xs leading-5 text-amber-700">{status?.note ?? "ChatGPT 訂閱不會被後端自動使用；後端自動化需 OPENAI_API_KEY，否則使用 rule fallback。"}</p>
      </SectionCard>

      <SectionCard title="Source Digest AI 分析">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="grid gap-1 text-xs text-slate-500">股票代號<input className={inputClass} value={symbolsText} onChange={(event) => setSymbolsText(event.target.value)} /></label>
          <label className="grid gap-1 text-xs text-slate-500">題材<input className={inputClass} value={themesText} onChange={(event) => setThemesText(event.target.value)} /></label>
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={loading} onClick={() => void runSourceDigest()}>{loading ? "分析中..." : "分析官方來源摘要"}</button>
        </div>
      </SectionCard>

      <SectionCard title="手動摘要 AI 抽取">
        <textarea className={`${inputClass} min-h-28 w-full`} value={manualText} onChange={(event) => setManualText(event.target.value)} />
        <div className="mt-3 flex justify-end"><button className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 disabled:opacity-50" disabled={loading} onClick={() => void runManualExtraction()}>{loading ? "抽取中..." : "抽取 AI Factors"}</button></div>
      </SectionCard>

      <SectionCard title="AI Factors">
        <p className="mb-3 text-sm text-amber-700">{message}</p>
        <DataTable rows={rows} columns={columns} emptyMessage="尚未執行 AI 分析。" renderExpanded={(row) => <FactorDetails row={row} />} />
        <WarningList warnings={warnings} />
      </SectionCard>
    </div>
  );
}

function FactorDetails({ row }: { row: AIEventFactor }) {
  return (
    <div className="grid gap-3 text-sm text-slate-600 lg:grid-cols-2">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="font-semibold text-slate-950">分數拆解</div>
        <ul className="mt-2 space-y-1 text-xs">
          <li>事件新鮮度：{row.eventNoveltyScore}</li>
          <li>驚喜潛力：{row.surprisePotentialScore}</li>
          <li>市場知曉度：{row.marketAwarenessScore}</li>
          <li>來源可信度：{row.sourceCredibilityScore}</li>
          <li>題材關聯：{row.themeRelevanceScore}</li>
          <li>風險懲罰：-{row.riskFlagPenalty}</li>
        </ul>
        <p className="mt-3 text-xs leading-5">{row.explanation}</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="font-semibold text-slate-950">Evidence / Warnings</div>
        {row.evidence.map((item) => <div key={`${item.sourceUrl}-${item.sourceTitle}`} className="mt-2 rounded bg-white p-2 text-xs leading-5"><div className="font-semibold text-slate-900">{item.sourceTitle}</div><div className="text-slate-500">{item.sourceUrl}</div><div>{item.evidenceSnippet}</div></div>)}
        <WarningList warnings={row.warnings} />
        <div className="mt-2"><DataSourceBadge source="Estimated" /></div>
      </div>
    </div>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-950">{value}</div></div>;
}

function splitInput(value: string): string[] {
  return value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean);
}

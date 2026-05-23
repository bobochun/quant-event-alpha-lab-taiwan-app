"use client";

import { useMemo, useState } from "react";
import type { KLineBar, KLinePayload } from "../../lib/marketApi";

export function KLineChart({ payload, loading }: { payload: KLinePayload | null; loading?: boolean }) {
  const [hovered, setHovered] = useState<KLineBar | null>(null);
  const chart = useMemo(() => buildChart(payload?.bars ?? []), [payload]);

  if (loading && !payload) return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">正在載入 K 線...</div>;
  if (!payload || payload.bars.length === 0) return <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-500 shadow-sm">目前沒有可顯示的 K 線資料。</div>;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700">K 線圖</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{payload.symbol} / {payload.name}</h2>
          <p className="mt-1 text-xs text-slate-500">週期：{formatInterval(payload.interval)}，區間：{formatRange(payload.range)}，指標：{payload.indicatorSource}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {hovered ? (
            <div className="grid gap-1">
              <span>{hovered.time}</span>
              <span>O {hovered.open} / H {hovered.high} / L {hovered.low} / C {hovered.close}</span>
              <span>量 {hovered.volume.toLocaleString("zh-TW")}</span>
            </div>
          ) : "滑過 K 棒查看 OHLC"}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox="0 0 1080 460" className="min-w-[760px] rounded-md border border-slate-200 bg-slate-950">
          <g transform="translate(48 22)">
            {chart.grid.map((line) => <line key={line} x1="0" x2="1000" y1={line} y2={line} stroke="#334155" strokeDasharray="4 4" />)}
            {chart.candles.map((candle, index) => (
              <g key={`${candle.time}-${index}`} onMouseEnter={() => setHovered(candle.raw)} onMouseLeave={() => setHovered(null)}>
                <line x1={candle.x} x2={candle.x} y1={candle.highY} y2={candle.lowY} stroke={candle.up ? "#ef4444" : "#10b981"} strokeWidth="1.5" />
                <rect x={candle.x - chart.bodyWidth / 2} y={Math.min(candle.openY, candle.closeY)} width={chart.bodyWidth} height={Math.max(Math.abs(candle.openY - candle.closeY), 2)} fill={candle.up ? "#ef4444" : "#10b981"} opacity="0.92" />
                <rect x={candle.x - chart.step / 2} y="0" width={chart.step} height="360" fill="transparent" />
              </g>
            ))}
            <Polyline points={chart.ma5} color="#facc15" />
            <Polyline points={chart.ma20} color="#38bdf8" />
            <Polyline points={chart.ma60} color="#c084fc" />
            <text x="0" y="390" fill="#94a3b8" fontSize="12">{payload.bars[0]?.time}</text>
            <text x="880" y="390" fill="#94a3b8" fontSize="12">{payload.bars[payload.bars.length - 1]?.time}</text>
          </g>
          <g transform="translate(48 400)">
            {chart.volumeBars.map((bar, index) => <rect key={index} x={bar.x - chart.bodyWidth / 2} y={bar.y} width={chart.bodyWidth} height={bar.height} fill={bar.up ? "#ef4444" : "#10b981"} opacity="0.45" />)}
          </g>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        <Legend color="bg-yellow-400" label="MA5" />
        <Legend color="bg-sky-400" label="MA20" />
        <Legend color="bg-purple-400" label="MA60" />
        <span>資料來源：{payload.provider} / {payload.dataSource}</span>
      </div>
    </section>
  );
}

function Polyline({ points, color }: { points: string; color: string }) {
  return points ? <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /> : null;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2 w-4 rounded ${color}`} />{label}</span>;
}

function buildChart(bars: KLineBar[]) {
  const width = 1000;
  const height = 360;
  const values = bars.flatMap((bar) => [bar.high, bar.low, bar.ma5, bar.ma20, bar.ma60].filter((value): value is number => typeof value === "number"));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.08, 1);
  const low = min - pad;
  const high = max + pad;
  const step = bars.length > 1 ? width / (bars.length - 1) : width;
  const bodyWidth = Math.max(3, Math.min(12, step * 0.56));
  const y = (value: number) => height - ((value - low) / (high - low)) * height;
  const x = (index: number) => (bars.length === 1 ? width / 2 : index * step);
  const volumeMax = Math.max(...bars.map((bar) => bar.volume), 1);
  return {
    step,
    bodyWidth,
    grid: [0, 90, 180, 270, 360],
    candles: bars.map((bar, index) => ({
      raw: bar,
      time: bar.time,
      x: x(index),
      openY: y(bar.open),
      closeY: y(bar.close),
      highY: y(bar.high),
      lowY: y(bar.low),
      up: bar.close >= bar.open
    })),
    ma5: linePoints(bars, "ma5", x, y),
    ma20: linePoints(bars, "ma20", x, y),
    ma60: linePoints(bars, "ma60", x, y),
    volumeBars: bars.map((bar, index) => {
      const heightValue = (bar.volume / volumeMax) * 48;
      return { x: x(index), y: 52 - heightValue, height: heightValue, up: bar.close >= bar.open };
    })
  };
}

function linePoints(bars: KLineBar[], key: "ma5" | "ma20" | "ma60", x: (index: number) => number, y: (value: number) => number): string {
  return bars.map((bar, index) => typeof bar[key] === "number" ? `${x(index)},${y(bar[key] as number)}` : "").filter(Boolean).join(" ");
}

function formatRange(range: string): string {
  return ({ "1d": "1日", "5d": "5日", "1m": "1個月", "3m": "3個月", "6m": "6個月", ytd: "今年以來", "1y": "1年", "3y": "3年", "5y": "5年", custom: "自訂" } as Record<string, string>)[range] ?? range;
}

function formatInterval(interval: string): string {
  return ({ "1m": "1分", "5m": "5分", "15m": "15分", "1d": "日K", "1w": "週K", "1mo": "月K" } as Record<string, string>)[interval] ?? interval;
}

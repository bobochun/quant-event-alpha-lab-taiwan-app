"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateThemeHeat } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { SectionCard, ThemeHeatPanel } from "../components/ui";
import { localizeTheme } from "../lib/utils";

export default function ThemeRadarPage() {
  const themes = calculateThemeHeat(mockThemes, mockEvents, mockStocks);
  const chartData = themes.slice(0, 12).map((theme) => ({ ...theme, 題材: localizeTheme(theme.theme), 熱度分數: Math.round(theme.heatScore) }));
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">題材熱度雷達</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">題材熱度雷達</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          找出剛開始升溫、但尚未全面過熱的台股題材。不是越熱門越好，而是「剛升溫但還沒過熱」最值得研究。
        </p>
      </section>
      <SectionCard title="題材熱度分布">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="題材" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} />
              <Bar dataKey="熱度分數" fill="#0891b2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
      <SectionCard title="題材明細">
        <ThemeHeatPanel themes={themes} />
      </SectionCard>
    </div>
  );
}

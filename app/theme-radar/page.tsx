"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateThemeHeat } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { SectionCard, ThemeHeatPanel } from "../components/ui";

export default function ThemeRadarPage() {
  const themes = calculateThemeHeat(mockThemes, mockEvents, mockStocks);
  return (
    <div className="space-y-4">
      <SectionCard title="Theme Heat Radar">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={themes.slice(0, 12)}>
              <CartesianGrid stroke="#2b3748" />
              <XAxis dataKey="theme" stroke="#8ea0b7" fontSize={11} />
              <YAxis stroke="#8ea0b7" />
              <Tooltip contentStyle={{ background: "#111923", border: "1px solid #2b3748" }} />
              <Bar dataKey="heatScore" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
      <SectionCard title="Theme Details">
        <ThemeHeatPanel themes={themes} />
      </SectionCard>
    </div>
  );
}

import { mockDataStatus } from "../lib/mockData";
import { DataSourceBadge, RiskBadge, SectionCard } from "../components/ui";
import { formatDateTW } from "../lib/utils";

export default function DataCenterPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">資料狀態中心</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">資料狀態中心</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">所有示範資料都必須明確標示，避免誤認為真實即時市場資料。</p>
      </section>
      <SectionCard title="資料來源狀態">
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-500">
              <tr>{["資料類型", "資料來源", "可信度", "最後更新", "來源", "缺漏欄位", "提醒"].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {mockDataStatus.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-950">{item.type}</td>
                  <td className="px-3 py-2"><DataSourceBadge source={item.dataSource} /></td>
                  <td className="px-3 py-2"><RiskBadge level={item.confidence < 50 ? "high" : "medium"} /></td>
                  <td className="px-3 py-2">{formatDateTW(item.lastUpdated)}</td>
                  <td className="px-3 py-2">{item.source}</td>
                  <td className="px-3 py-2">{item.missingFields.join(", ")}</td>
                  <td className="px-3 py-2 text-amber-700">{item.warning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

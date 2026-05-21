import { mockDataStatus } from "../lib/mockData";
import { DataSourceBadge, RiskBadge, SectionCard } from "../components/ui";

export default function DataCenterPage() {
  return (
    <SectionCard title="Data Status Center">
      <div className="table-scroll">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>{["Type", "Status", "Confidence", "Last Updated", "Source", "Missing Fields", "Warning"].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr>
          </thead>
          <tbody>
            {mockDataStatus.map((item) => (
              <tr key={item.id} className="border-border border-t">
                <td className="px-3 py-2 font-semibold text-white">{item.type}</td>
                <td className="px-3 py-2"><DataSourceBadge source={item.dataSource} /></td>
                <td className="px-3 py-2"><RiskBadge level={item.confidence < 50 ? "high" : "medium"} /></td>
                <td className="px-3 py-2">{item.lastUpdated}</td>
                <td className="px-3 py-2">{item.source}</td>
                <td className="px-3 py-2">{item.missingFields.join(", ")}</td>
                <td className="px-3 py-2 text-amber">{item.warning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

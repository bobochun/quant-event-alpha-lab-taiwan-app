import { ComingSoonPage } from "../components/ComingSoonPage";

export default function EventStudyPage() {
  return (
    <ComingSoonPage
      title="事件回測研究 Coming Soon"
      description="未來可分析法說會、月營收、除權息、ETF 調整等事件前後報酬。目前可先使用事件催化雷達與交易日誌手動追蹤。"
      features={["T-10 到 T+10 報酬路徑", "事件前是否已反應檢查", "過熱事件與健康回檔樣本比較", "事件類型最佳化分析"]}
      alternatives={[{ label: "事件催化雷達", href: "/event-radar" }, { label: "題材熱度雷達", href: "/theme-radar" }, { label: "交易日誌", href: "/journal" }]}
    />
  );
}

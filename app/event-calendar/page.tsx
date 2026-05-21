import { ComingSoonPage } from "../components/ComingSoonPage";

export default function EventCalendarPage() {
  return (
    <ComingSoonPage
      title="事件行事曆 Coming Soon"
      description="未來可用日曆視圖查看法說會、月營收、除權息、ETF 調整與注意 / 處置股事件。目前請先使用事件催化雷達的 7 / 14 / 30 天篩選。"
      features={["月曆與週曆切換", "同一天事件曝險提醒", "事件後檢討提醒", "與交易日誌自動連動"]}
      alternatives={[{ label: "事件催化雷達", href: "/event-radar" }, { label: "每日主控台", href: "/" }, { label: "報告匯出", href: "/reports" }]}
    />
  );
}

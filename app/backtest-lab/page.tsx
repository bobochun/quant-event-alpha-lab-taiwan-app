import { ComingSoonPage } from "../components/ComingSoonPage";

export default function BacktestLabPage() {
  return (
    <ComingSoonPage
      title="回測實驗室 Coming Soon"
      description="未來可用匯入的歷史事件、價格與成交量資料，驗證法說會、月營收、ETF 調整等事件策略。目前先用事件雷達與交易日誌手動追蹤。"
      features={["事件前後報酬分布", "策略勝率與期望值", "不同市場狀態下的策略表現", "交易紀律與回測結果交叉檢查"]}
      alternatives={[{ label: "事件催化雷達", href: "/event-radar" }, { label: "交易日誌", href: "/journal" }, { label: "報告匯出", href: "/reports" }]}
    />
  );
}

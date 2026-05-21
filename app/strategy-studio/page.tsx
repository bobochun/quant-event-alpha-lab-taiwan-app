import { ComingSoonPage } from "../components/ComingSoonPage";

export default function StrategyStudioPage() {
  return (
    <ComingSoonPage
      title="策略工作室 Coming Soon"
      description="未來可調整事件策略權重、建立 playbook 與檢查策略風險。目前 Alpha Engine 權重已內建於事件雷達與交易計畫流程。"
      features={["策略權重調整", "Low Base Catalyst 規則編輯", "Event Pullback 條件模板", "策略版本與週報連動"]}
      alternatives={[{ label: "事件催化雷達", href: "/event-radar" }, { label: "交易計畫", href: "/trade-plan" }, { label: "風控中心", href: "/risk-center" }]}
    />
  );
}

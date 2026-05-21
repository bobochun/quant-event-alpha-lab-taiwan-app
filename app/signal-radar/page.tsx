import { ComingSoonPage } from "../components/ComingSoonPage";

export default function SignalRadarPage() {
  return (
    <ComingSoonPage
      title="訊號雷達 Coming Soon"
      description="未來會把事件催化、趨勢、籌碼、題材與風控訊號整合成更細的訊號佇列。目前可在事件催化雷達查看同樣的綜合 Alpha 分數。"
      features={["多因子訊號佇列", "籌碼確認分數拆解", "相對強弱排序", "已反應與過熱風險快速排除"]}
      alternatives={[{ label: "事件催化雷達", href: "/event-radar" }, { label: "題材熱度雷達", href: "/theme-radar" }, { label: "投組風控", href: "/portfolio" }]}
    />
  );
}

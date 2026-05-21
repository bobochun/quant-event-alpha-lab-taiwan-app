# 架構

- Next.js App Router：頁面與 API Route Handlers。
- TypeScript：所有資料模型、評分引擎與匯出流程。
- Tailwind CSS：淺色系、高資訊密度金融研究介面。
- Recharts：題材熱度視覺化。
- `localStorage`：MVP 本機資料儲存。
- JSON 匯出 / 匯入：換電腦或換瀏覽器時移動使用者資料。

## 重要模組

- `app/lib/types.ts`：領域型別。
- `app/lib/mockData.ts`：明確標示的示範資料。
- `app/lib/eventScoring.ts`：事件催化分數。
- `app/lib/alphaEngine.ts`：綜合 Alpha、市場狀態、已反應 / 過熱風險、投組與行為分析。
- `app/lib/positionSizing.ts`：自適應部位試算。
- `app/lib/actionList.ts`：今日待辦事項去重、排序與下一步。
- `app/lib/explanations.ts`：分數與風險中文解釋。
- `app/lib/storage.ts`：client-only localStorage。
- `app/lib/exporters.ts`：CSV / Markdown / JSON 匯出。

## 資料原則

目前不使用資料庫、不接券商 API、不做自動下單。Vercel 只部署程式，使用者資料留在瀏覽器 localStorage，必須靠 JSON 備份移動。

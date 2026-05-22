# 台股量化事件研究室

Quant Event Alpha Lab Taiwan 是個人用台股事件驅動研究終端，用來追蹤未來 7 天事件催化、題材熱度、綜合 Alpha 分數、已反應風險、部位大小、投組曝險與交易紀律。

本工具僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議。所有交易請自行判斷並承擔風險。

## 目前內容

- Next.js App Router、TypeScript、Tailwind CSS、Recharts
- 每日主控台、事件催化雷達、題材熱度雷達、交易計畫、投組風控、風控中心、交易日誌、報告匯出、資料狀態中心、設定與備份
- Alpha Engine、事件評分、已反應 / 過熱風險、Adaptive Position Sizing
- MVP 使用瀏覽器 `localStorage` 儲存資料
- JSON 匯出 / 匯入，方便換電腦移動使用者資料
- CSV 模板下載與手動資料匯入（events.csv 等）
- 獨立 FastAPI 後端骨架：最新報價、K 線、provider health、SQLite local fallback
- `/market` 即時報價與 K 線頁：最新價、成交量、資料來源、日/週/月 K 與區間切換
- Playwright smoke / screenshot 測試
- 示範資料明確標示：`示範資料，不是真實即時市場資料。`

## 本機啟動

需求：

- Node.js 20 LTS 或更新
- npm
- Git

```bash
npm install
npm run dev
```

打開：

```text
http://localhost:3000
```

## 後端啟動（報價與 K 線）

後端位於 `backend/`，可獨立部署。若只跑前端，`/market` 會使用示範 fallback，不會白屏。

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

常用 API：

```text
GET http://localhost:8000/health
GET http://localhost:8000/quotes/latest/2330
GET http://localhost:8000/kline/2330?interval=1d&range=1y
GET http://localhost:8000/market-data/providers
```

## 檢查與 Build

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

後端：

```bash
cd backend
pytest
python -m compileall app
```

## 部署到 Vercel

方法 A：GitHub + Vercel Dashboard

1. 將專案 push 到 GitHub。
2. 到 Vercel Dashboard 匯入 GitHub repo。
3. Framework 選 Next.js。
4. Build command：`npm run build`。
5. Output directory：`.next`。
6. 加入 `.env.example` 內的環境變數。
7. Deploy。

前端 Vercel 不需要後端 build 才能部署。若後端另行部署，請在前端設定：

```bash
NEXT_PUBLIC_BACKEND_URL=https://<YOUR_BACKEND_HOST>
```

方法 B：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel deploy
vercel deploy --prod
```

## GitHub 存檔

```bash
git add .
git commit -m "Update Quant Event Alpha Lab"
git push
```

程式碼靠 GitHub 保存，Vercel 只部署程式，不會同步瀏覽器裡的 localStorage 使用者資料。

## 換電腦繼續修改

1. 在舊電腦 push 程式碼到 GitHub。
2. 在 `/settings` 匯出全部資料 JSON。
3. 新電腦 clone GitHub repo。
4. 執行 `npm install` 與 `npm run dev`。
5. 到 `/settings` 匯入 JSON 備份。

## JSON 備份 / 匯入

MVP 使用 `localStorage` 儲存：

- events
- tradePlans
- portfolio
- journal
- settings

換瀏覽器或換電腦前，請先到「設定與備份」匯出完整 JSON。

## 資料狀態

目前仍是 demo data，不是真實即時市場資料。未來可規劃匯入或串接公開資料：

- TWSE / TPEx 股價與成交量
- 月營收、財報、除權息、法說會
- ETF 成分調整
- 注意股 / 處置股
- 手動整理的題材與事件資料

不接券商 API，不做自動下單。

## CSV 匯入

到 `/data-center` 可以下載 UTF-8 CSV 模板並匯入。已支援模板包含事件資料、股價快照、法人籌碼、月營收、財報、除權息、注意 / 處置股、題材新聞 metadata、ETF 成分調整、大戶持股變化。

匯入資料會標示為 `Imported`，來源說明為「使用者匯入 CSV 資料，請自行確認來源與正確性。」

## 主要文件

- `DEPLOYMENT.md`
- `DEPLOYMENT_STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/DATA_SOURCES.md`
- `docs/MANUAL_TESTING.md`
- `docs/PR_REVIEW_CHECKLIST.md`
- `docs/REALTIME_AND_KLINE.md`
- `docs/API_ROUTES.md`
- `docs/LOCAL_DATA_TEMPLATES.md`

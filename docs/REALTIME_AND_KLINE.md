# 即時報價、K 線與事件資料

本階段新增獨立 FastAPI 後端與前端 `/market` 頁，聚焦最新報價、延遲報價、合法即時報價 adapter 介面、K 線圖顯示，以及 Level 1 / Level 2 事件來源 pipeline。

## 即時行情限制

真正即時台股行情通常需要合法授權、API key 或付費資料源。免費官方公開資料多數是盤後、延遲或統計資料，不應標示為 tick-level 即時行情。

本專案遵守：

- 不接券商交易 API
- 不做自動下單
- 不把免費資料假裝成即時
- 不抓付費外資報告全文
- 不抓新聞全文
- 不對 MOPS / 新聞網站做激進爬蟲

## Provider 分層

資料優先順序：

Licensed Realtime > FinMind > Official > Imported / Manual > yfinance Research Fallback > Demo

目前支援：

- Licensed Realtime Placeholder：預留合法即時資料 provider 介面，未設定授權時停用
- FinMind Provider：需 `FINMIND_API_TOKEN`，部分即時資料可能需要 sponsor 權限
- TWSE / TPEx Official Provider：官方公開資料，標示為盤後或延遲，不假裝即時
- yfinance Research Fallback：非官方研究資料，可能延遲或不穩定
- Demo Fallback：provider 不可用時讓 UI 可操作，明確標示示範資料

## 事件資料 Level 1 / Level 2

### Level 1：Backend event provider API

後端新增：

```text
GET /events/upcoming?days=30&symbols=2330,2382
GET /events/providers
```

目前實作：

- `finmind-events`：若 `ENABLE_FINMIND=true` 且 `FINMIND_API_TOKEN` 存在，嘗試用 FinMind dataset 產生月營收 / 股利 metadata 事件。
- `mops-metadata`：保守 placeholder，顯示 MOPS 可作事件 metadata 來源，但本階段不做激進爬蟲。
- `twse-tpex-official-events`：保守 placeholder，顯示除權息、注意股、處置股等可接官方資料，但本階段先以 provider status 呈現。

沒有 token 或 provider 沒有回資料時，`events` 會是空陣列，並回傳清楚的 `sourceNote`。這是正確行為，不應改成假資料。

### Level 2：Frontend backend-first event merge

前端新增：

```text
app/lib/backendEventsApi.ts
```

首頁 `/` 與 `/event-radar` 事件來源順序：

```text
Backend events → Imported events → Manual events → Demo fallback
```

行情與技術面來源順序：

```text
Backend quote/kline → Imported price snapshot → Demo fallback
```

前端必須分開顯示：

- 事件來源：Official / Imported / Manual / Demo
- 行情來源：Backend provider / yfinance fallback / Demo fallback

## FinMind Token

`.env` 或部署環境設定：

```bash
ENABLE_FINMIND=true
FINMIND_API_TOKEN=<YOUR_TOKEN>
```

若 token 未設定，FinMind provider 狀態會顯示 disabled，系統會 fallback 到其他來源。

## Backend API

啟動：

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

常用端點：

```text
GET /health
GET /version
GET /quotes/latest/2330
GET /quotes/latest?symbols=2330,2382,2317
GET /kline/2330?interval=1d&range=1y
GET /events/upcoming?days=30&symbols=2330,2382
GET /events/providers
POST /market-data/refresh-quotes
POST /market-data/refresh-kline
GET /market-data/providers
GET /market-data/source-health
```

Quote / Kline API 回傳會包含：

- provider
- dataSource
- isRealtime
- delayMinutes
- licenseNote
- fetchedAt

Event API 回傳會包含：

- events
- providers
- sourceNote
- generatedAt

## K 線支援

區間：

- 1日
- 5日
- 1個月
- 3個月
- 6個月
- YTD
- 1年
- 3年
- 5年
- 自訂

週期：

- 1分
- 5分
- 15分
- 日K
- 週K
- 月K

若 provider 不支援分 K，前端會 disabled 或回傳明確錯誤，不會白屏。

## 技術指標

後端 `backend/app/quant/indicators.py` 會計算：

- MA5
- MA20
- MA60
- RSI14

資料不足時指標為 `null`，`indicatorSource` 會顯示 insufficient data。

## Frontend 連接後端

Next.js 前端預設會呼叫：

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

本機開發時建議開兩個 terminal：

```bash
# terminal 1: backend
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# terminal 2: frontend
npm install
npm run dev
```

打開：

```text
http://localhost:3000/market?symbol=2330
http://localhost:3000/event-radar
http://localhost:3000/data-center
```

若後端連不上，前端會顯示明確標示的 Demo / Imported / Manual fallback，不會白屏，也不會宣稱是即時行情或正式事件。

## 部署建議

前端與後端分開部署：

- Frontend：Vercel，build Next.js，不需要 build FastAPI backend。
- Backend：Render / Railway / Fly.io / Zeabur 皆可，啟動指令通常是 `uvicorn app.main:app --host 0.0.0.0 --port $PORT`。

部署後在 Vercel 設定：

```bash
NEXT_PUBLIC_BACKEND_URL=https://<YOUR_BACKEND_HOST>
```

後端 secrets 不進 git，請在後端平台設定：

```bash
DATABASE_URL=<POSTGRES_OR_SQLITE_URL>
ENABLE_FINMIND=false
FINMIND_API_TOKEN=
ENABLE_OFFICIAL_DATA=false
ENABLE_YFINANCE=true
ENABLE_DEMO_FALLBACK=true
BACKEND_CORS_ORIGINS=https://<YOUR_FRONTEND>.vercel.app,http://localhost:3000
```

## 後端測試

```bash
cd backend
python -m pip install -r requirements.txt
pytest
python -m compileall app
```

## 前端測試

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## 驗收重點

- `/quotes/latest/2330` 有回應，且包含 `provider` / `dataSource` / `isRealtime` / `delayMinutes`。
- `/kline/2330?interval=1d&range=1y` 有回應，且 bars 包含 OHLCV、MA5、MA20、MA60、RSI14。
- `/events/upcoming?days=30&symbols=2330,2382` 有回應，無 token 時不 crash。
- `/events/providers` 有回應，能看到 finmind-events / mops-metadata / twse-tpex-official-events 狀態。
- `/market?symbol=2330` 可顯示報價卡與 K 線圖。
- `/event-radar` 可分開顯示事件來源與行情來源。
- `/data-center` 可顯示事件 provider、行情 provider 與 CSV 匯入狀態。
- 不支援的 interval 不 crash，應 fallback 或顯示清楚錯誤。
- 免費、官方、fallback、demo 資料都不可標示成正式即時行情或完整正式事件源。

## Codex 下一階段建議

1. 補 `attentionStock` / `dispositionStock` 官方 adapter。
2. 補除權息官方 adapter，產生 `exDividend` events。
3. 補 MOPS 法說會 metadata adapter，但避免抓全文與高頻爬蟲。
4. 補 FinMind dataset 欄位 normalizer，避免不同欄位名稱造成空事件。
5. 增加 `/events/refresh` job，將事件 provider 結果寫入資料庫。
6. Data Center 增加每個事件 dataset 的 last success / last error / records fetched。

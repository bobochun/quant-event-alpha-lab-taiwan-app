# 即時報價與 K 線資料

本階段新增獨立 FastAPI 後端與前端 `/market` 頁，聚焦最新報價、延遲報價、合法即時報價 adapter 介面，以及 K 線圖顯示。

## 即時行情限制

真正即時台股行情通常需要合法授權、API key 或付費資料源。免費官方公開資料多數是盤後、延遲或統計資料，不應標示為 tick-level 即時行情。

本專案遵守：

- 不接券商交易 API
- 不做自動下單
- 不把免費資料假裝成即時
- 不抓付費外資報告全文
- 不抓新聞全文

## Provider 分層

資料優先順序：

Licensed Realtime > FinMind > Official > Imported / Manual > yfinance Research Fallback > Demo

目前支援：

- Licensed Realtime Placeholder：預留合法即時資料 provider 介面，未設定授權時停用
- FinMind Provider：需 `FINMIND_API_TOKEN`，部分即時資料可能需要 sponsor 權限
- TWSE / TPEx Official Provider：官方公開資料，標示為盤後或延遲，不假裝即時
- yfinance Research Fallback：非官方研究資料，可能延遲或不穩定
- Demo Fallback：provider 不可用時讓 UI 可操作，明確標示示範資料

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
POST /market-data/refresh-quotes
POST /market-data/refresh-kline
GET /market-data/providers
GET /market-data/source-health
```

API 回傳會包含：

- provider
- dataSource
- isRealtime
- delayMinutes
- licenseNote
- fetchedAt

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

## 前端測試

打開：

```text
http://localhost:3000/market?symbol=2330
```

確認：

- 最新報價卡有價格、漲跌、成交量、更新時間與資料來源
- K 線圖有 OHLC、成交量與 MA 線
- 可切換 1M / 3M / 1Y
- 非即時資料會顯示延遲或 fallback 提醒

## 部署注意

Next.js 前端不依賴後端 build。後端可獨立部署，前端透過：

```bash
NEXT_PUBLIC_BACKEND_URL=https://<BACKEND_HOST>
```

連線。未設定或後端不可用時，前端會使用明確標示的 Demo fallback。

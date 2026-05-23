# 部署說明

本專案目前是前後端分離架構：

- Frontend：Next.js，建議部署到 Vercel。
- Backend：FastAPI，建議部署到 Render、Railway、Fly.io、Zeabur 或自有 VPS。
- 使用者個人資料：MVP 仍主要存在瀏覽器 localStorage，跨電腦靠 `/settings` JSON 匯出 / 匯入。
- 市場資料與量化資料：後端可用 SQLite fallback；正式部署建議 PostgreSQL。

> 本工具僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議。所有交易請自行判斷並承擔風險。

## 需求

- Node.js 20 LTS 或更新
- npm
- Git
- GitHub 帳號
- Vercel 帳號
- Python 3.11+
- 可選：PostgreSQL

## 本機啟動

Terminal 1：後端

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2：前端

```bash
npm install
npm run dev
```

打開：

```text
http://localhost:3000
http://localhost:3000/market?symbol=2330
http://localhost:3000/data-center
http://localhost:3000/signal-radar
```

## 本機檢查

```bash
cd backend
pytest
python -m compileall app

cd ..
npm run typecheck
npm run lint
npm run build
```

## Frontend env：Vercel 必填

Vercel frontend 專案請至少設定：

```bash
NEXT_PUBLIC_APP_NAME=Quant Event Alpha Lab Taiwan
NEXT_PUBLIC_DATA_MODE=Demo
NEXT_PUBLIC_ENABLE_DEMO_DATA=true
NEXT_PUBLIC_BACKEND_URL=https://<YOUR_FASTAPI_BACKEND_HOST>
```

重要：部署到 Vercel 後，`NEXT_PUBLIC_BACKEND_URL` 不可以是 `http://localhost:8000`。瀏覽器中的 localhost 會指向使用者自己的電腦，不是你的 FastAPI 後端。

## Backend env：FastAPI 必填 / 建議

後端平台請設定：

```bash
APP_ENV=production
APP_VERSION=0.1.0
DATABASE_URL=<POSTGRES_URL_OR_EMPTY_FOR_SQLITE>

ENABLE_FINMIND=false
FINMIND_API_TOKEN=

ENABLE_OFFICIAL_DATA=false
TWSE_ATTENTION_ENDPOINT=
TWSE_DISPOSITION_ENDPOINT=
TPEX_ATTENTION_ENDPOINT=
TPEX_DISPOSITION_ENDPOINT=

ENABLE_YFINANCE=true
ENABLE_DEMO_FALLBACK=true

ENABLE_PUBLIC_WEB_CRAWLER=false
ENABLE_AI_QUANT=false
OPENAI_API_KEY=
ENABLE_AI_SCORE_IN_ALPHA=false

ENABLE_BACKEND_SCHEDULER=false
SCHEDULER_SYMBOLS=2330,2382,2317,2308,3017,3231

BACKEND_CORS_ORIGINS=https://<YOUR_FRONTEND>.vercel.app,http://localhost:3000
```

### 重要 env 說明

| 變數 | 用途 | 建議 |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | 前端呼叫 FastAPI 的網址 | Vercel 必填正式後端 URL |
| `DATABASE_URL` | 後端資料庫 | 正式部署建議 PostgreSQL |
| `ENABLE_FINMIND` / `FINMIND_API_TOKEN` | FinMind 資料來源 | 沒 token 就關閉，不要硬開 |
| `ENABLE_OFFICIAL_DATA` | TWSE / TPEx 官方 endpoint | endpoint 尚未驗證前可關閉 |
| `TWSE_ATTENTION_ENDPOINT` 等 | 注意股 / 處置股官方資料 | 實測後再填，不使用 Demo 冒充 |
| `ENABLE_YFINANCE` | yfinance research fallback | 可開，但前端會標示非官方 |
| `ENABLE_DEMO_FALLBACK` | 缺資料時維持 UI 可用 | 個人研究可開；正式展示可考慮關 |
| `OPENAI_API_KEY` | API 版 AI 輔助 | ChatGPT Plus 不能直接取代 API key |
| `ENABLE_AI_SCORE_IN_ALPHA` | AI 分數是否納入 Alpha | 建議維持 false，等回測驗證後再開 |
| `ENABLE_BACKEND_SCHEDULER` | 後端內建排程 | serverless/免費平台建議先 false，用外部 cron |
| `BACKEND_CORS_ORIGINS` | 允許前端來源 | 必須包含 Vercel 前端網址 |

## FastAPI 後端部署

Production 建議：

- Python 3.11+
- 安裝指令：`pip install -r backend/requirements.txt`
- Start command：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Root directory：若平台支援，設定為 `backend`；否則 start command 要從 repo root 指到 `backend`。
- Secrets 不進 GitHub。

部署後請測：

```text
GET https://<BACKEND_HOST>/health
GET https://<BACKEND_HOST>/diagnostics
GET https://<BACKEND_HOST>/quotes/latest/2330
GET https://<BACKEND_HOST>/kline/2330?interval=1d&range=1y
GET https://<BACKEND_HOST>/quant/diagnostics
```

## 方法 A：GitHub + Vercel Dashboard

1. Push 到 GitHub。
2. 打開 Vercel Dashboard。
3. Add New Project。
4. 匯入 GitHub repo。
5. Framework 選 Next.js。
6. Build command：`npm run build`。
7. Output directory：`.next`。
8. 加入 `NEXT_PUBLIC_BACKEND_URL` 等前端環境變數。
9. Deploy。

Vercel 連上 GitHub 後，後續 push 到設定的 production branch 會自動部署。

## 方法 B：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel deploy
vercel deploy --prod
```

## 前後端連線 smoke test

前端部署後打開：

```text
/data-center
/market?symbol=2330
/signal-radar
/event-radar
/backtest-lab
/trade-plan?symbol=2330
/ai-intelligence
```

在 `/data-center` 檢查：

- 部署就緒檢查：Backend `/health` 與 `/diagnostics` 應為 ok。
- 報價與 K 線資料源：能測試 2330 最新價與 2330 日 K。
- 量化分析就緒度：能讀 `/quant/diagnostics`。
- 官方注意 / 處置：endpoint 未設定時應顯示 Missing，不可用 Demo 冒充。

## Jobs / 排程

後端支援：

```text
POST /jobs/run
```

常用 jobName：

```text
refresh_latest_quotes
refresh_watchlist_quotes
refresh_daily_kline
refresh_factor_scores
quant_scan_daily
data_quality_check
theme_strength_scan
source_digest_collect
refresh_institutional_flow
ai_source_digest_analysis
```

`refresh_daily_kline` 會逐檔刷新 request symbols 的日 K，不再只處理第一檔。若 provider 不可用，單檔結果會標示 fallback 來源。

範例：

```bash
curl -X POST https://<BACKEND_HOST>/jobs/run \
  -H "content-type: application/json" \
  -d '{"jobName":"refresh_daily_kline","symbols":["2330","2382","2317"]}'
```

## GitHub 更新流程

```bash
git add .
git commit -m "Update Quant Event Alpha Lab"
git push
```

## 換電腦注意事項

程式碼靠 GitHub 保存。使用者資料靠 JSON 備份移動。Vercel 部署只保存程式，不會自動同步瀏覽器 localStorage。

換電腦前：

1. 到 `/settings` 匯出完整 JSON。
2. Push 程式碼到 GitHub。
3. 新電腦 clone repo。
4. 執行 `npm install`。
5. 到 `/settings` 匯入 JSON。

## 不建議做的事

- 不要把券商帳密或交易 token 放進本專案。
- 不要把 OpenAI / FinMind / 其他 API key commit 到 GitHub。
- 不要把 yfinance 或 Demo fallback 標示為正式即時資料。
- 不要在未回測前把 AI score 納入最終 Alpha score。
- 不要在 serverless 平台硬開長駐 scheduler；可改用外部 cron 打 `/jobs/run`。

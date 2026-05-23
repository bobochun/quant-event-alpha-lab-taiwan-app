# PR / Preview / Merge 檢查清單

本清單適用於 `backend-realtime-price-kline`。這支分支已經包含 FastAPI 後端、行情 / K 線、事件資料源、AI Intelligence、研究工具與全站深色 UI。Merge 前不要只看畫面，必須同時確認資料來源、fallback、測試與部署設定。

## 0. 不可違反的產品原則

- [ ] 全站仍清楚顯示「僅供個人研究、策略模擬、事件追蹤與風險控管，不構成投資建議」。
- [ ] 沒有使用「必買、必賣、明牌、保證獲利、跟單、強烈買進」等字眼。
- [ ] 沒有自動下單、沒有券商交易 API、沒有宣稱免費資料是即時。
- [ ] Demo / Official / Cached / Imported / Manual / Estimated / Missing 標示清楚。
- [ ] AI 分析僅作為 evidence / factor 參考，`ENABLE_AI_SCORE_IN_ALPHA` 預設保持 `false`。

## 1. 本機後端驗證

```bash
cd backend
source .venv/bin/activate
pytest
python -m compileall app
```

- [ ] `pytest` 通過。
- [ ] `python -m compileall app` 通過。
- [ ] pytest 不會啟動 APScheduler 背景 job。
- [ ] `/health` 可回應。
- [ ] `/diagnostics` 可回應，且不暴露 secret。
- [ ] `/quotes/latest/2330` 可回應。
- [ ] `/quotes/latest?symbols=2330,2382,2317` 可回應。
- [ ] `/kline/2330?interval=1d&range=1y` 可回應。
- [ ] `/market-data/providers` 可回應。
- [ ] `/events/upcoming?days=30&symbols=2330,2382` 可回應。
- [ ] `/quant/analyze/2330` 可回應。
- [ ] `/quant/systematic-scan?mode=riskFirst&symbols=2330,2382` 可回應。
- [ ] `/research/cross-section?symbols=2330,2382` 可回應。
- [ ] `/research/theme-strength?symbols=2330,2382` 可回應。
- [ ] `/research/data-quality` 可回應。
- [ ] `/ai/status` 可回應，未設定 key 時不白屏。

## 2. 本機前端驗證

```bash
npm run typecheck
npm run lint
npm run build
```

- [ ] `npm run typecheck` 通過。
- [ ] `npm run lint` 通過，或只有可接受 warning 且已記錄。
- [ ] `npm run build` 通過。
- [ ] `NEXT_PUBLIC_ENABLE_AUTO_REFRESH=false` 時 build 不會依賴後端存活。
- [ ] `NEXT_PUBLIC_BACKEND_URL` 未設定時會 fallback 到 `http://localhost:8000`。

## 3. GitHub Actions / CI

- [ ] CI backend job 通過：install backend requirements、pytest、compileall。
- [ ] CI frontend job 通過：npm install、typecheck、lint、build。
- [ ] CI 觸發 branch 包含 `backend-realtime-price-kline`。
- [ ] CI 環境沒有使用真實 OpenAI / FinMind secret。

## 4. Data Center / 部署就緒

進入 `/data-center`：

- [ ] 「部署就緒檢查」可顯示 `NEXT_PUBLIC_BACKEND_URL`。
- [ ] Backend `/health` 顯示 ok。
- [ ] Backend `/diagnostics` 顯示 ok。
- [ ] FinMind token 未設定時顯示 warning，不白屏。
- [ ] OpenAI key 未設定時顯示 warning，不白屏。
- [ ] Scheduler 狀態顯示 enabled / disabled / disabledForPytest。
- [ ] Demo fallback 顯示 warning，讓使用者知道缺資料時可能使用示範資料。
- [ ] 「測試 2330 最新價」可回應並顯示 provider / dataSource。
- [ ] 「測試 2330 日 K」可回應並顯示 provider / dataSource。
- [ ] 「測試事件 Provider」可回應。
- [ ] CSV 模板可下載。
- [ ] CSV 匯入 validation 錯誤能清楚顯示。

## 5. 核心頁面人工 QA

### `/`
- [ ] 首頁不是 landing page，而是每日研究主控台。
- [ ] 顯示市場狀態、7 日事件摘要、Top Catalyst、Today Action List。
- [ ] 後端事件 / 行情不可用時仍可用 fallback，且標示清楚。

### `/market?symbol=2330`
- [ ] 報價卡顯示最新價、漲跌、成交量、更新時間、provider、dataSource、是否即時 / 延遲。
- [ ] K 線圖可顯示 OHLC / volume / MA5 / MA20 / MA60 / RSI。
- [ ] 1D / 5D / 1M / 3M / 6M / YTD / 1Y / 3Y / 5Y 可切換。
- [ ] 日 K / 週 K / 月 K 可切換。
- [ ] 不支援的分 K 不應造成白屏。
- [ ] 手動刷新可用；非即時來源不應鼓勵 10 秒無意義刷新。

### `/event-radar`
- [ ] 後端事件與 imported/manual/demo 事件合併正常。
- [ ] 可切換 7 / 14 / 30 天。
- [ ] 可隱藏已過熱 / 低可信度。
- [ ] 每列「查看 K 線」導向 `/market?symbol=`。
- [ ] 每列 dataSource / confidence / quote source 顯示清楚。

### `/theme-radar`
- [ ] 使用後端 `/research/theme-strength` 優先。
- [ ] 後端不可用時才 demo fallback，且有提示。
- [ ] 題材強弱矩陣可搜尋 / 排序。
- [ ] 過熱題材有 warning，不把越熱越高分當作唯一依據。

### `/signal-radar`
- [ ] 可執行 quant batch / systematic scan。
- [ ] 可切換不同 quant mode。
- [ ] 結果有 score explanation / warnings / nextAction。

### `/ai-intelligence`
- [ ] 未設定 API key 時顯示 rule fallback，不白屏。
- [ ] 設定 API key 後可呼叫 API 版 AI 分析。
- [ ] AI 結果有 evidence、confidence、warnings。

### `/trade-plan`
- [ ] 可按「帶入最新價」抓後端 quote。
- [ ] 清楚提示最新價不是建議進場。
- [ ] entry <= stopLoss 時顯示錯誤。
- [ ] 建議股數 / 張數 / 成本 / 最大虧損 / R:R 可正確計算。
- [ ] 可存 localStorage，可加入 Journal。

### `/portfolio`
- [ ] 進頁自動用後端 batch quote 同步 currentPrice。
- [ ] 手動新增持股後可再次同步報價。
- [ ] averageCost / shares / notes 不會被 quote sync 改掉。
- [ ] 每檔持股顯示 dataSource。
- [ ] 單檔 / 題材 / 策略 / 事件曝險正常顯示。

### `/risk-center`
- [ ] 使用後端 events、riskFirst systematic scan、data-quality。
- [ ] 本機 portfolio / journal 風險仍可顯示。
- [ ] Event Risk / Position Risk / Portfolio Risk / Behavior Risk / Data Risk 分類正常。

### `/journal`
- [ ] 本機日誌可新增 / 儲存。
- [ ] 行為分析能回答是否追高、是否追事件、是否遵守計畫。
- [ ] 清除 demo 後不應讓使用者誤以為 mock journal 是自己的紀錄。

### `/reports`
- [ ] Weekly report 優先使用後端 events / quant / theme / data-quality。
- [ ] Backend summary Markdown 可輸出。
- [ ] CSV / Markdown / JSON 格式可複製。
- [ ] 報告開頭或資料品質段落清楚列資料來源。

### `/backtest-lab`
- [ ] 可執行 cross-section、trading cost、portfolio optimize、walk-forward、data-quality。
- [ ] 結果標示研究用途，不是交易建議。

### `/event-study`
- [ ] 可載入後端事件。
- [ ] 可執行單事件 abnormal return。
- [ ] 資料不足時顯示 warning。

### `/strategy-studio`
- [ ] 可切換 6 種量化模式。
- [ ] 可產生 strategy playbook。
- [ ] K 線 / 交易計畫快捷入口可用。

### `/event-calendar`
- [ ] 可依日期分組事件。
- [ ] 同日事件集中、低 confidence、高 awareness 提醒正常。

### `/settings`
- [ ] JSON backup 可匯出。
- [ ] JSON backup 可匯入。
- [ ] 可清除 demo data。
- [ ] 可重置本機資料。

## 6. 部署環境檢查

### Frontend Vercel
- [ ] 設定 `NEXT_PUBLIC_BACKEND_URL` 指向後端公開 URL。
- [ ] `NEXT_PUBLIC_ENABLE_AUTO_REFRESH` 視部署狀況設定，preview 可先 `false`。
- [ ] Vercel build command: `npm run build`。
- [ ] Output directory: `.next`。

### Backend
- [ ] 單 instance 後端可開 `ENABLE_BACKEND_SCHEDULER=true`。
- [ ] Serverless / 多 instance 後端建議 `ENABLE_BACKEND_SCHEDULER=false`，改用外部 cron 呼叫 `/jobs/run`。
- [ ] SQLite 僅建議本機 / demo；正式多裝置建議 PostgreSQL。
- [ ] `DATABASE_URL` 不進 git。
- [ ] `OPENAI_API_KEY` 不進 git。
- [ ] `FINMIND_API_TOKEN` 不進 git。

## 7. Merge 前最後確認

- [ ] PR diff 已 review，沒有 secret。
- [ ] CI 全綠。
- [ ] Vercel preview 可開。
- [ ] 後端 public URL 可被前端連線。
- [ ] Data Center 部署就緒檢查可讀。
- [ ] Demo fallback 的頁面都有明確提示。
- [ ] 使用者同意後才 merge main；不要自動 merge。

# 資料來源與導入策略

本專案採前後端分離架構：Next.js 前端負責研究終端與本機資料，FastAPI 後端負責行情、K 線、事件 metadata、量化研究 API、source digest 與 AI factor extraction。

## 重要原則

資料不可混淆：

- `Real`：合法即時 provider，需授權或付費 API；目前只預留 interface。
- `Official`：官方或授權資料源，例如 TWSE / TPEx / FinMind dataset；不一定即時。
- `Cached`：後端或前端快取後的研究資料。
- `Imported`：使用者 CSV / JSON 匯入。
- `Manual`：使用者手動建立。
- `Estimated`：由公開資料或 fallback 估算，不可當成真實行情。
- `Demo`：示範資料，只供流程測試。
- `Missing` / `Error`：缺資料或資料源錯誤。

所有前端頁面必須顯示資料來源，不可讓 Demo / fallback 看起來像真實資料。

## 後端 Provider 優先順序

```text
Licensed Realtime > FinMind > TWSE / TPEx Official > Manual / Imported > yfinance Research Fallback > Demo
```

目前 FastAPI provider registry 包含：

- `licensed`：合法即時報價 placeholder
- `finmind`：FinMind 日資料 / 事件 / 法人籌碼
- `twse`：TWSE official placeholder / health check
- `tpex`：TPEx official placeholder / health check
- `manual`：預留 manual provider
- `yfinance`：研究 fallback
- `demo`：功能保底 fallback

## FinMind 設定

在 `backend/.env` 或部署平台環境變數設定：

```bash
ENABLE_FINMIND=true
FINMIND_API_TOKEN=你的_FinMind_token
```

建議同步設定：

```bash
ENABLE_DEMO_FALLBACK=true
ENABLE_OFFICIAL_DATA=true
```

未設定 token 時：

- FinMind provider status = `disabled`
- quote / kline 會 fallback 到 official / yfinance / demo
- event / institutional flow 會 fallback，並在 UI 顯示 warning

權限不足時：

- API 不會 crash
- 會回傳清楚錯誤，例如 sponsor / token 權限不足
- 前端仍可操作，但會標示 fallback

## FinMind 目前支援

### 1. 台股日資料 / K 線

Dataset：

```text
TaiwanStockPrice
```

用途：

- 日 K `1d`
- latest quote 的盤後 / 日資料 fallback
- OHLCV / volume / trading value

限制：

- 不標示為即時
- 不支援 `1m / 5m / 15m`
- 欄位與權限依 FinMind 版本與帳號而定

### 2. 月營收事件

Dataset：

```text
TaiwanStockMonthRevenue
```

用途：

- 生成 `monthlyRevenue` event metadata
- 計算 expectedImpact / relatedThemes 的初步事件資料

限制：

- 事件日期用資料日期推估，需和公告實際時間再校準
- 不構成交易建議

### 3. 股利 / 除息事件

Dataset：

```text
TaiwanStockDividend
```

用途：

- 生成 `exDividend` event metadata

限制：

- 欄位名稱可能依版本不同
- 需和交易所除權息公告交叉檢查

### 4. 法人籌碼

Dataset：

```text
TaiwanStockInstitutionalInvestorsBuySell
```

目前 normalizer 會處理：

- 外資 `foreignNetBuyShares`
- 投信 `investmentTrustNetBuyShares`
- 自營商 `dealerNetBuyShares`
- 三大法人合計
- 外資 / 投信 / 自營商連買連賣天數
- `flowConfirmationScore`
- `flowBias`: accumulation / distribution / mixed / neutral / unknown
- 資料過舊 warning

欄位相容：

- date / trade_date / TradeDate
- name / institutional_investor / type / InvestorType
- buy / buy_shares / Buy / buy_volume
- sell / sell_shares / Sell / sell_volume
- net_buy_sell / buy_sell / NetBuySell / net / diff

限制：

- 仍需實際 token 測試欄位與權限
- 不同 dataset 版本可能需再擴充欄位 mapping
- 目前未建立完整長期法人歷史表，主要用於 latest flow 與量化確認

## TWSE OpenAPI

用途：

- 上市股票 / ETF 基本資料
- 上市收盤或 price snapshot
- 三大法人或市場法人資料
- 注意股 / 處置股

目前前端舊架構有：

- `app/lib/dataSources/twse.ts`
- 可設定 base URL：`TWSE_OPENAPI_BASE_URL`
- fetch timeout：`OFFICIAL_DATA_TIMEOUT_MS`
- revalidate：`OFFICIAL_DATA_REVALIDATE_SECONDS`
- 失敗時回傳 `degraded` / `error`，不讓 UI 白屏

目前 FastAPI 後端 `twse-official`：

- 主要提供 provider health check
- 不假裝即時報價
- `1d` daily support 為能力標示，實際 K 線 normalizer 待補

未完成：

- 後端 official 日 K normalizer
- 注意股 / 處置股 official adapter
- 官方三大法人 normalizer
- security master 正式後端 API

## TPEx OpenAPI

用途：

- 上櫃股票基本資料
- 上櫃 price snapshot
- 上櫃法人 / 市場統計資料
- 上櫃注意股 / 處置股

目前 FastAPI 後端 `tpex-official`：

- 主要提供 provider health check
- 不假裝即時報價
- `1d` daily support 為能力標示，實際 K 線 normalizer 待補

未完成：

- 上櫃日 K normalizer
- 上櫃注意股 / 處置股 adapter
- 上櫃法人籌碼 normalizer

## MOPS / 公開資訊觀測站

目前只做：

- data source status placeholder
- metadata link
- CSV import mapping
- source digest / AI extraction 的安全入口
- 未來 connector 架構

第一版不做激進爬蟲，不抓完整頁面內容，不假裝有穩定 JSON API。

月營收、財報、除權息、法說會、重大訊息可先用：

- FinMind dataset
- CSV 匯入
- manual event
- source digest metadata

## CSV Import

支援模板：

- `events.csv`
- `price_snapshot.csv`
- `institutional_flow.csv`
- `monthly_revenue.csv`
- `earnings.csv`
- `dividends.csv`
- `market_warnings.csv`
- `theme_news.csv`
- `etf_rebalance.csv`
- `major_holder_changes.csv`

Validation：

- 必填欄位缺少
- 日期格式錯誤
- 數字欄位錯誤
- eventType / warningType / action / holderTier enum 錯誤

匯入後：

- `price_snapshot` 會影響 technical / overheat / priced-in / relative strength
- `institutional_flow` 會影響 flow confirmation
- `market_warnings` 會提高注意 / 處置風險
- `monthly_revenue` / `earnings` / `dividends` / `theme_news` / `etf_rebalance` 可選擇自動產生事件

## yfinance Research Fallback

用途：

- 研究 fallback
- 日 K / 週 K / 月 K
- 若支援則提供部分 intraday

限制：

- 非官方台股資料
- 可能延遲、不穩定、欄位不完整
- UI 必須顯示「非官方研究資料，可能延遲或不穩定」
- 不可作為正式即時報價

## Demo Data

Demo data 僅供流程測試，不是真實即時市場資料。

Hybrid 模式會在缺資料時使用 Demo fallback，Reports / Data Center / Badges 會明確標示。

## AI / Source Digest

AI Intelligence Layer 用於：

- 從 source digest metadata 或手動摘要抽取 AI event factors
- 生成 eventNoveltyScore / surprisePotentialScore / marketAwarenessScore / sourceCredibilityScore / themeRelevanceScore
- 保留 evidence / riskFlags / warnings / confidence

限制：

- 使用 ChatGPT app 付費訂閱不等於後端可自動使用
- 後端自動化需要 `OPENAI_API_KEY`
- 沒有 key 時使用 rule fallback
- `ENABLE_AI_SCORE_IN_ALPHA=false` 預設保持關閉
- 未累積回測前，不建議將 AI score 直接納入 alpha

## 版權與合規

- 不接券商 API
- 不做自動下單
- 不抓付費外資報告全文
- 不抓新聞全文
- 新聞與外資報告僅允許 metadata、sourceUrl、title、userSummary、relatedSymbols、relatedThemes
- 本工具僅供個人研究、策略模擬、事件追蹤與風險控管

## 下一階段資料源優先順序

1. 設定並實測 `FINMIND_API_TOKEN`
2. 實測 FinMind institutional flow 欄位與權限
3. 補 TWSE official 日 K / 注意股 / 處置股 normalizer
4. 補 TPEx official 日 K / 注意股 / 處置股 normalizer
5. 補 MOPS 法說會 / 重大訊息 metadata connector
6. 建立長期法人籌碼與 factor_scores persistence
7. 用 event study 驗證 AI factor 與法人籌碼 factor 是否有效

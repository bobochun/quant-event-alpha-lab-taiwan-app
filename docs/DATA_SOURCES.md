# 資料來源與導入策略

本專案採 Vercel-first、無必要資料庫架構。資料優先順序為：

Manual > Imported > Official > Demo

## TWSE OpenAPI

用途：
- 上市股票 / ETF 基本資料
- 上市收盤或 price snapshot
- 三大法人或市場法人資料
- 注意股 / 處置股

目前實作：
- `app/lib/dataSources/twse.ts`
- 可設定 base URL：`TWSE_OPENAPI_BASE_URL`
- fetch timeout：`OFFICIAL_DATA_TIMEOUT_MS`
- revalidate：`OFFICIAL_DATA_REVALIDATE_SECONDS`
- 失敗時回傳 `degraded` / `error`，不讓 UI 白屏

目前支援資料集：
- `securityMaster`
- `priceSnapshot`
- `institutionalFlow`
- `marketWarnings`

未支援：
- 長期歷史行情
- 即時行情
- 需要登入或付費資料

## TPEx OpenAPI

用途：
- 上櫃股票基本資料
- 上櫃 price snapshot
- 上櫃法人 / 市場統計資料
- 上櫃注意股 / 處置股

目前實作：
- `app/lib/dataSources/tpex.ts`
- TPEx 各資料集路徑可能因版本調整，因此 adapter 使用可調 endpoint 與安全 fallback
- 若端點失敗，只會更新 source health，不會阻斷頁面

## MOPS / 公開資訊觀測站

目前只做：
- data source status placeholder
- metadata link
- CSV import mapping
- 未來 connector 架構

第一版不做激進爬蟲，不抓完整頁面內容，不假裝有穩定 JSON API。月營收、財報、除權息、法說會、重大訊息可先用 CSV 匯入或 metadata link 補齊。

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

## Demo Data

Demo data 僅供流程測試，不是真實即時市場資料。Hybrid 模式會在缺資料時使用 Demo fallback，Reports 會明確標示。

## 版權與合規

- 不接券商 API
- 不做自動下單
- 不抓付費外資報告全文
- 不抓新聞全文
- 新聞與外資報告僅允許 metadata、sourceUrl、title、userSummary、relatedSymbols、relatedThemes
- 本工具僅供個人研究、策略模擬、事件追蹤與風險控管

## 未來可做

- API connector 設定 UI
- scheduled import
- database / cloud sync
- auth
- 更多官方資料集 normalization

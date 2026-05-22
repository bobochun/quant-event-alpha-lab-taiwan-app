# 手動測試清單

1. 執行 `npm run dev`，打開 `http://localhost:3000`。
2. 打開 `/`，確認首頁主要文字為繁體中文，且有「3 分鐘工作流」與免責聲明。
3. 打開 `/event-radar`，切換 7 / 14 / 30 天，測試事件類型、題材、最低分數、隱藏過熱、隱藏低可信度與只看未建立計畫。
4. 在 `/event-radar` 測試建立交易計畫、加入日誌、標記已檢查、7 天內忽略、標記過熱。
5. 打開 `/theme-radar`，確認題材名稱中文化，且說明「剛升溫但還沒過熱」。
6. 打開 `/trade-plan`，輸入研究進場價與停損價，確認建議股數、張數、成本、最大虧損與風險報酬比。
7. 在 `/trade-plan` 測試 `研究進場價 <= 停損價` 是否顯示中文錯誤。
8. 打開 `/portfolio`，新增手動持股，確認題材、策略、事件與相關性曝險更新。
9. 打開 `/risk-center`，確認事件風險、部位風險、投組風險、行為風險、資料風險都有中文下一步。
10. 打開 `/journal`，新增日誌，確認行為分析與紀律分數更新。
11. 打開 `/reports`，切換所有報告格式，確認 Markdown / CSV 內容為繁體中文。
12. 打開 `/settings`，測試匯出 JSON、匯入 JSON、清除示範資料、重置本機資料。
13. 打開 `/data-center`，確認所有示範資料都明確標示不是即時市場資料。
14. 打開 Coming Soon 頁，確認有中文用途、未來功能與替代連結。
15. 打開 `/data-center`，下載 `events.csv` 模板，貼回 CSV 匯入區並確認可匯入。
16. 修改 `events.csv` 的 eventType 為錯誤值，確認匯入錯誤以中文顯示。
17. 在 `/event-radar` 點「展開詳情」與「研究詳情」，確認分數拆解不會撐爆表格。
18. 從 `/event-radar` 點「建立交易計畫」，確認 `/trade-plan` 自動帶入股票、事件、日期與分數摘要。
19. 在 `/settings` 勾選 / 取消首頁 Widget，回首頁確認顯示狀態改變。
20. 參照 `docs/PR_REVIEW_CHECKLIST.md` 檢查 PR preview。

## 報價與 K 線

1. 啟動後端：`cd backend && uvicorn app.main:app --reload --port 8000`。
2. 打開 `/market?symbol=2330`，確認有「即時報價與 K 線」標題。
3. 搜尋 `2382`，確認報價卡更新。
4. 切換 1個月 / 3個月 / 1年，確認 K 線資料更新。
5. 切換 日K / 週K / 月K，確認圖表不白屏。
6. 未設定 FinMind token 時，確認資料來源顯示 fallback 或 disabled，不標示為正式即時。
7. 在 `/event-radar` 點「查看 K 線」，確認導到 `/market?symbol=`。
8. 在 `/trade-plan` 點「帶入最新價作為研究進場價」，確認有資料來源與風險提示。
9. 在 `/data-center` 查看「報價與 K 線資料源」，測試 2330 最新價與日 K。
## Official Data Source / Hybrid Mode

- 開啟 `/data-center`，確認 TWSE OpenAPI、TPEx OpenAPI、MOPS、CSV 匯入、Demo Data 狀態有顯示。
- 點「刷新全部可用官方資料」，官方 fetch 失敗時應顯示 degraded/error，不可白屏。
- 匯入 `price_snapshot.csv` 後回到 `/event-radar`，確認重新計分摘要的匯入股價筆數增加。
- 匯入 `institutional_flow.csv` 後確認法人籌碼筆數增加。
- 匯入 `market_warnings.csv` 後確認風險警示筆數增加，事件列風險會提高。
- 到 `/settings` 切換 Demo only / Hybrid / Real / Imported only，回 `/event-radar` 確認資料模式可用。

## Playwright

第一次在本機跑測試：

```bash
npm run test:e2e:install
npm run test:e2e
```

後端測試：

```bash
cd backend
pytest
python -m compileall app
```

若環境無法下載 browser，先確認 `npm run typecheck` 與 `npm run build` 通過，並在 PR 說明中記錄原因。

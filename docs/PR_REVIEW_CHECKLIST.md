# PR / Preview / Merge 檢查清單

## 流程

1. 建立 branch：`git switch -c <branch-name>`
2. 本機驗證：
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - `npm run test:e2e:install`
   - `npm run test:e2e`
3. Push branch：`git push origin <branch-name>`
4. 在 GitHub 建立 PR。
5. 等待 Vercel 產生 preview deployment。
6. 開啟 preview URL，確認沒有白屏與 critical console error。
7. 手動測試首頁、Event Radar、Trade Plan、Data Center、Settings、Reports。
8. 確認 JSON backup / restore。
9. 確認 CSV template download 與 CSV validation。
10. 通過後再由使用者決定是否 merge main；不要自動 merge。

## PR Checklist

- [ ] 首頁可用
- [ ] 事件雷達可用
- [ ] 交易計畫可用
- [ ] 設定備份可用
- [ ] CSV 模板可下載
- [ ] 匯入錯誤能顯示
- [ ] 無白屏
- [ ] 無 console critical error
- [ ] Vercel preview 可開啟
- [ ] `/market` 可查詢 2330 報價與 K 線
- [ ] Event Radar「查看 K 線」可導向 `/market?symbol=`
- [ ] Trade Plan 可帶入最新價，並顯示不是建議進場
- [ ] Data Center 顯示報價與 K 線 provider 狀態
- [ ] 未設定 FinMind token 時不白屏
- [ ] Backend `/quotes/latest/2330` 可回應
- [ ] Backend `/kline/2330?interval=1d&range=1y` 可回應
- [ ] Backend `pytest` 通過，或 PR 說明列出依賴 / 環境限制
- [ ] Data Center 可顯示 TWSE / TPEx / MOPS / CSV / Demo 狀態
- [ ] 官方資料 fetch 失敗時不白屏
- [ ] CSV 匯入 validation 正常
- [ ] price_snapshot 匯入後可重新計分
- [ ] institutional_flow 匯入後可重新計分
- [ ] market_warnings 匯入後可增加風險扣分
- [ ] Event Radar 可切換資料模式
- [ ] Event Radar 顯示資料來源與 confidence
- [ ] Reports 有資料來源摘要
- [ ] Settings 可切換 Demo / Hybrid / Real mode
- [ ] Playwright smoke test 通過
- [ ] `npm run typecheck` 通過
- [ ] `npm run lint` 通過或只有可接受 warning
- [ ] `npm run build` 通過
- [ ] 無投顧禁用字眼
- [ ] Demo / Official / Imported / Manual 標示清楚

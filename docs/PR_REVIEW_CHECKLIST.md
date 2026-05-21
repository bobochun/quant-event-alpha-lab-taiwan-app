# PR / Preview / Merge 檢查清單

## 流程

1. 建立 branch：`git switch -c <branch-name>`
2. 完成功能後執行：
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - `npm run test:e2e`（若 Playwright browsers 可用）
3. Push branch：`git push origin <branch-name>`
4. 到 GitHub 建立 PR。
5. 等 Vercel 產生 preview deployment。
6. 打開 preview 網址，確認沒有白屏。
7. 手動測試首頁、事件雷達、交易計畫、設定與備份。
8. 測試 JSON 備份。
9. 測試 CSV template download。
10. 測試 events.csv 匯入錯誤能顯示中文。
11. 確認 demo / imported / manual 資料來源標示清楚。
12. 確認無投顧高風險字眼。
13. 通過後再 merge main。
14. 確認 Vercel production deploy 成功。

## PR Checklist

- [ ] 首頁可用
- [ ] 事件雷達可用
- [ ] 交易計畫可用
- [ ] 設定備份可用
- [ ] CSV 模板可下載
- [ ] 匯入錯誤能顯示
- [ ] 無白屏
- [ ] 無 console critical error
- [ ] `npm run typecheck` 通過
- [ ] `npm run lint` 通過或僅有可接受 warning
- [ ] `npm run build` 通過
- [ ] `npm run test:e2e` 通過或註明瀏覽器環境限制
- [ ] Vercel preview 正常

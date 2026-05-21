# 部署說明

本專案採 Vercel-first 架構，可用 GitHub + Vercel Dashboard 或 Vercel CLI 部署。

## 需求

- Node.js 20 LTS 或更新
- npm
- Git
- GitHub 帳號
- Vercel 帳號

## 環境變數

本機可複製 `.env.example`，Vercel 專案也請設定：

```bash
NEXT_PUBLIC_APP_NAME=Quant Event Alpha Lab Taiwan
NEXT_PUBLIC_DATA_MODE=Demo
NEXT_PUBLIC_ENABLE_DEMO_DATA=true
```

## 本機啟動

```bash
npm install
npm run dev
```

打開 `http://localhost:3000`。

## 本機檢查

```bash
npm run typecheck
npm run lint
npm run build
```

## 方法 A：GitHub + Vercel Dashboard

1. Push 到 GitHub。
2. 打開 Vercel Dashboard。
3. Add New Project。
4. 匯入 GitHub repo。
5. Framework 選 Next.js。
6. Build command：`npm run build`。
7. Output directory：`.next`。
8. 加入環境變數。
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

# 部署說明

本專案採 Vercel-first 架構，可用 GitHub + Vercel Dashboard 或 Vercel CLI 部署。

前端與後端現在可分離部署：Next.js 前端部署到 Vercel；FastAPI 後端可部署到 Render、Railway、Fly.io、自有 VPS 或任何支援 Python 3.11+ 的平台。前端若連不到後端，`/market` 會使用明確標示的示範 fallback，不會白屏。

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
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ENABLE_FINMIND=false
FINMIND_API_TOKEN=
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

## FastAPI 後端部署

本機：

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Production 建議：

- Python 3.11+
- `pip install -r backend/requirements.txt`
- Start command：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `DATABASE_URL` 可用 PostgreSQL；未設定時使用 SQLite local fallback
- `FINMIND_API_TOKEN` 不要提交到 Git
- 免費 / fallback 資料不得標示為正式即時行情

後端部署完成後，在 Vercel 前端設定：

```bash
NEXT_PUBLIC_BACKEND_URL=https://<BACKEND_HOST>
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

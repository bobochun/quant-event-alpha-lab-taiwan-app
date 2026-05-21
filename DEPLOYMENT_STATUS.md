# Deployment Status

Current status: project files are prepared for GitHub + Vercel, but this machine cannot complete the live link/deploy step because `git`, `npm`, `gh`, `winget`, and `vercel` are not available on PATH.

GitHub connector status:

- Authenticated GitHub login detected: `bobochun`
- GitHub repository detected: `bobochun/quant-event-alpha-lab-taiwan-app`
- Repository URL: `https://github.com/bobochun/quant-event-alpha-lab-taiwan-app`
- Repository permissions through the connector include admin and push.
- The current Codex GitHub connector can write individual files, but this session does not expose a bulk folder push equivalent to `git push`.

Browser deployment attempt:

- Opening `https://github.com/new` redirected to GitHub login and could not be completed from this embedded environment.
- Opening `https://vercel.com/new` also requires account login/import authorization.
- No live GitHub repository or Vercel project was created from this environment.

Current authorization/import links:

- GitHub repository: `https://github.com/bobochun/quant-event-alpha-lab-taiwan-app`
- Vercel new project import: `https://vercel.com/new`
- Vercel GitHub integration authorization: `https://vercel.com/integrations/github`
- Suggested Vercel import target after the repo contains the app: `bobochun/quant-event-alpha-lab-taiwan-app`

## What Is Ready

- `vercel.json` is configured for Next.js on Vercel.
- `package.json` includes `dev`, `build`, `start`, `lint`, and `typecheck`.
- `.env.example` includes demo-mode environment variables.
- The app is Vercel-first and does not require a database, FastAPI, broker API, or server process outside Next.js.
- Former placeholder pages are now implemented as MVP demo-data pages:
  - `/backtest-lab`
  - `/event-study`
  - `/strategy-studio`
  - `/signal-radar`
  - `/event-calendar`
- Latest optimized ZIP exists locally at:
  - `C:\Users\peace\Documents\Codex\2026-03-17\files-mentioned-by-the-user-quanteventalphalabtaiwan\QuantEventAlphaLabTaiwan_MVP_optimized.zip`

## Required Manual Link Steps

1. Install Node.js 20 LTS or newer.
2. Install Git for Windows.
3. Open a new terminal.
4. Run:

```bash
npm install
npm run typecheck
npm run build
git init
git add .
git commit -m "Build Quant Event Alpha Lab Super MVP"
git branch -M quant-event-alpha-lab-super-mvp
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin quant-event-alpha-lab-super-mvp
```

5. In Vercel Dashboard, import the GitHub repository.
6. Framework: Next.js.
7. Build command: `npm run build`.
8. Output directory: `.next`.
9. Environment variables:

```bash
NEXT_PUBLIC_APP_NAME=Quant Event Alpha Lab Taiwan
NEXT_PUBLIC_DATA_MODE=Demo
NEXT_PUBLIC_ENABLE_DEMO_DATA=true
```

After Vercel imports the GitHub repository, future pushes to the production branch will auto deploy.

## CLI Deployment Alternative

If Vercel CLI is available and logged in:

```bash
npm i -g vercel
vercel login
vercel link
vercel deploy
vercel deploy --prod
```

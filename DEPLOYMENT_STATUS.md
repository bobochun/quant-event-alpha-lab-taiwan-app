# Deployment Status

Current status: deployed to GitHub and Vercel production.

Production URL:

- `https://files-mentioned-by-the-user-quantev.vercel.app`

Deployment URL:

- `https://files-mentioned-by-the-user-quanteventalphalabtaiwan-1jqlfovfb.vercel.app`

GitHub repository:

- `https://github.com/bobochun/quant-event-alpha-lab-taiwan-app`

GitHub connector status:

- Authenticated GitHub login detected: `bobochun`
- GitHub repository detected and pushed: `bobochun/quant-event-alpha-lab-taiwan-app`
- Latest pushed branch: `main`
- Latest local commit after deployment cleanup: `419d03f`

Vercel deployment status:

- Vercel login: `bobochun`
- Vercel project: `bobochuns-projects/files-mentioned-by-the-user-quanteventalphalabtaiwan`
- Deployment id: `dpl_xA4Fxxfs8Q8j1D7RCt9bLWs324DH`
- Vercel build status: Ready
- GitHub repository connected in Vercel.
- SSO deployment protection was disabled so the `.vercel.app` URLs are publicly reachable.

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

## Verification Results

Local:

- `npm install`: passed
- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run build`: passed with Next.js 16.2.6
- Local production server: `http://localhost:3000` returns HTTP 200

Vercel:

- Production build: passed
- Production deployment URL returns HTTP 200
- Production alias returns HTTP 200

Security/audit note:

- Next.js was upgraded from 14.2.16 to 16.2.6.
- `npm audit` still reports a moderate advisory through Next's internal PostCSS dependency range.
- `npm audit fix --force` currently suggests a breaking downgrade path, so it was not applied.

## Future Update Steps

After editing locally:

```bash
npm install
npm run lint
npm run typecheck
npm run build
git add .
git commit -m "Update Quant Event Alpha Lab"
git push
```

Vercel is connected to GitHub, so pushes to `main` should deploy automatically.

Environment variables used for deployment:

```bash
NEXT_PUBLIC_APP_NAME=Quant Event Alpha Lab Taiwan
NEXT_PUBLIC_DATA_MODE=Demo
NEXT_PUBLIC_ENABLE_DEMO_DATA=true
```

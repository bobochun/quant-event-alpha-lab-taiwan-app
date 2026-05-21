# Quant Event Alpha Lab Taiwan Handoff

Generated: 2026-05-21

Product name: Quant Event Alpha Lab Taiwan

Purpose: a personal Taiwan stock quant event research terminal.

Important disclaimer:

> This tool is for personal research, strategy simulation, event tracking, and risk control only. It is not investment advice. All trading decisions and risks are your own responsibility.

This project is not an investment advisory site. It does not provide stock tips, guaranteed returns, copy trading, broker API integration, or automated orders.

## What Was Built

The project is a Vercel-first Next.js App Router MVP using:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- Next.js Route Handlers
- Client-side localStorage
- JSON import/export backup flow
- Demo data clearly marked as non-real-time
- Vercel deployment config
- GitHub Actions CI config

## Main Files

- `package.json`
- `.env.example`
- `vercel.json`
- `.github/workflows/ci.yml`
- `app/layout.tsx`
- `app/page.tsx`
- `app/components/AppShell.tsx`
- `app/components/ui.tsx`
- `app/lib/types.ts`
- `app/lib/mockData.ts`
- `app/lib/eventScoring.ts`
- `app/lib/alphaEngine.ts`
- `app/lib/positionSizing.ts`
- `app/lib/strategyModules.ts`
- `app/lib/tradePlan.ts`
- `app/lib/storage.ts`
- `app/lib/exporters.ts`
- `app/api/**/route.ts`
- `README.md`
- `DEPLOYMENT.md`
- `DEPLOYMENT_STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/DATA_SOURCES.md`
- `docs/MANUAL_TESTING.md`
- `docs/API_ROUTES.md`
- `docs/LOCAL_DATA_TEMPLATES.md`

## Completed Pages

Formal pages:

1. `/` Command Center
2. `/event-radar`
3. `/theme-radar`
4. `/trade-plan`
5. `/portfolio`
6. `/risk-center`
7. `/journal`
8. `/reports`
9. `/data-center`
10. `/settings`
11. `/backtest-lab`
12. `/event-study`
13. `/strategy-studio`
14. `/signal-radar`
15. `/event-calendar`

Latest additions:

- `/backtest-lab` strategy scorecard, validation rules, and plan-risk summary.
- `/event-study` historical event reaction analysis and priced-in diagnostics.
- `/strategy-studio` strategy module playbooks and matched signal cards.
- `/signal-radar` factor-level alpha queue for the next 14 days.
- `/event-calendar` 30-day date-grouped event schedule with risk clusters.

## Real Calculation Features

The MVP includes actual calculation logic:

- Catalyst Score
- Combined Alpha Score
- Quant Trend Score
- Flow Confirmation Score
- Theme Momentum Score
- Risk Adjusted Momentum
- Market Regime Classification
- Market Regime Alignment
- Relative Strength Score
- Overheat Risk Detection
- Priced-In Risk Detection
- Catalyst Timing Score
- Adaptive Position Sizing
- Portfolio Exposure Analysis
- Behavior Risk Analysis
- Trade Plan Position Sizing
- Journal Statistics
- Weekly Report Export

## Demo Data

The MVP includes demo data for testing:

- 20 Taiwan stocks / ETFs
- 30 future events
- 20 historical events
- 8 themes
- 10 risk alerts
- 5 trade plans
- 1 portfolio
- 8 journal entries

All demo data is marked:

```text
dataSource: "Demo"
sourceNote: "Demo data for MVP testing. Not real-time market data."
```

## Local Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build And Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## GitHub Push

```bash
git init
git add .
git commit -m "Build Quant Event Alpha Lab Super MVP"
git branch -M quant-event-alpha-lab-super-mvp
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin quant-event-alpha-lab-super-mvp
```

## Vercel Deploy

Dashboard:

1. Push to GitHub.
2. Import the repo in Vercel.
3. Framework preset: Next.js.
4. Build command: `npm run build`.
5. Output directory: `.next`.
6. Add environment variables from `.env.example`.
7. Deploy.

CLI:

```bash
npm i -g vercel
vercel login
vercel link
vercel deploy
vercel deploy --prod
```

## Cross-Device Workflow

Code moves through GitHub.

User data moves through `/settings` JSON backup:

1. Export full JSON backup on the old computer.
2. Move the JSON file to the new computer.
3. Open `/settings`.
4. Import the JSON backup.

## Current Validation Status

Available static scans were completed in the Codex workspace. Live `npm run lint`, `npm run typecheck`, and `npm run build` could not be executed in that shell because `npm` was not available on PATH.

The latest complete ZIP handoff is:

```text
C:\Users\t03\Documents\New project\QuantEventAlphaLabTaiwan_MVP.zip
```

## Next Version Ideas

- Real data adapters for TWSE/TPEX public sources
- Manual CSV import templates for prices and flows
- More robust event-study analytics with imported historical OHLCV
- Backtest Lab expansion with user-defined rule sets
- Strategy Studio expansion with editable weights
- User-defined scoring weights
- Cloud sync option
- Authentication for private multi-device use

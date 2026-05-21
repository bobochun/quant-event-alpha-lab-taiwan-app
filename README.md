# Quant Event Alpha Lab Taiwan

Quant Event Alpha Lab Taiwan is a personal research terminal for Taiwan stock event-driven quant workflows.

It is designed to help review possible catalysts over the next 7 days, compare catalyst strength, theme heat, technical structure, flow confirmation, overheat risk, priced-in risk, position sizing, portfolio exposure, and trading discipline.

This is not an investment advisory website. It does not provide stock tips, guaranteed returns, copy trading, broker API integration, or automated order placement.

Important disclaimer shown in the app:

> This tool is for personal research, strategy simulation, event tracking, and risk control only. It is not investment advice. All trading decisions and risks are your own responsibility.

## What Is Included

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- Next.js Route Handlers
- Client-side `localStorage` for MVP user data
- JSON import/export backup flow for moving data across computers
- Demo data clearly marked as non-real-time
- Vercel-first deployment config

## Local Development

Requirements:

- Node.js 20 LTS or newer
- npm
- Git

Run locally:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Checks And Build

```bash
npm run lint
npm run typecheck
npm run build
```

If `npm` or `git` is not recognized on Windows, install Node.js and Git for Windows, then open a new terminal so `PATH` is refreshed.

## GitHub Push

Create an empty GitHub repository first, then run:

```bash
git init
git add .
git commit -m "Build Quant Event Alpha Lab Super MVP"
git branch -M quant-event-alpha-lab-super-mvp
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin quant-event-alpha-lab-super-mvp
```

## Vercel Deployment

Method A, Vercel Dashboard:

1. Push this project to GitHub.
2. Open Vercel Dashboard.
3. Import the GitHub repository.
4. Framework preset: Next.js.
5. Build command: `npm run build`.
6. Output directory: `.next`.
7. Add the environment variables from `.env.example`.
8. Deploy.

Method B, Vercel CLI:

```bash
npm i -g vercel
vercel login
vercel link
vercel deploy
vercel deploy --prod
```

After Vercel imports the GitHub repository, future pushes to the production branch will auto deploy.

## Continue On Another Computer

1. Push code to GitHub.
2. Clone the repo on the other computer.
3. Run `npm install`.
4. Export local user data from `/settings`.
5. Import that JSON backup from `/settings` on the new computer.

## Data Backup

User data is stored in browser `localStorage` for the MVP:

- events
- tradePlans
- portfolio
- journal
- settings

Use `/settings` to export or import a full JSON backup.

Demo data is clearly marked with:

```text
dataSource: "Demo"
sourceNote: "Demo data for MVP testing. Not real-time market data."
```

## Main Docs

- `DEPLOYMENT.md`
- `DEPLOYMENT_STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/DATA_SOURCES.md`
- `docs/MANUAL_TESTING.md`
- `docs/API_ROUTES.md`
- `docs/LOCAL_DATA_TEMPLATES.md`

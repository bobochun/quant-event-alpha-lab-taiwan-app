# Architecture

- Next.js App Router for pages and API route handlers.
- TypeScript for all domain models and scoring engines.
- Tailwind CSS for dense dark research-dashboard UI.
- Recharts for theme heat visualization.
- `localStorage` for MVP client-side user data.
- JSON import/export for moving data between computers.

Important modules:

- `app/lib/types.ts`: domain types.
- `app/lib/mockData.ts`: clearly marked demo dataset.
- `app/lib/eventScoring.ts`: catalyst scoring.
- `app/lib/alphaEngine.ts`: combined alpha, market regime, risk, portfolio and behavior analytics.
- `app/lib/positionSizing.ts`: adaptive position sizing.
- `app/lib/storage.ts`: client-only localStorage.
- `app/lib/exporters.ts`: CSV/Markdown/JSON exports.

# API Routes

All route handlers return this shape:

```ts
{
  ok: boolean;
  data: unknown;
  error: string | null;
  dataSource: "Real" | "Cached" | "Manual" | "Imported" | "Estimated" | "Demo" | "Missing";
  sourceNote: string;
  generatedAt: string;
}
```

Routes:

- `GET /api/health`
- `GET /api/data-status`
- `GET /api/events`
- `POST /api/events`
- `GET /api/event-radar`
- `GET /api/themes/heat`
- `POST /api/trade-plan/generate`
- `POST /api/portfolio/analyze`
- `POST /api/risk/analyze`
- `POST /api/journal/analyze`
- `POST /api/reports/weekly`

The MVP route handlers use demo or request payload data only. They do not connect to broker APIs, databases, or paid research content.

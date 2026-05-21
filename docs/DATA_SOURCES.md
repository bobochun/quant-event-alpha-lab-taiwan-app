# Data Sources

MVP data is demo-only unless the user imports or enters manual data.

Supported source states:

- Real
- Cached
- Manual
- Imported
- Estimated
- Demo
- Missing

Every demo row includes:

```json
{
  "dataSource": "Demo",
  "sourceNote": "Demo data for MVP testing. Not real-time market data."
}
```

Future real/manual datasets should avoid paid report full-text scraping and should store only source metadata unless permission exists.

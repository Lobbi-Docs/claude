---
name: Linear Rate Limiting
description: This skill should be used when designing bulk operations against Linear — complexity budgets, exponential backoff, request pacing, and avoiding 429s. Activates on "linear rate limit", "linear 429", "linear throttle", "complexity budget".
version: 1.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear Rate Limiting

Reference: https://linear.app/developers/rate-limiting

## Two budgets

Linear bills against:
1. **Request rate** — per-IP, per-token (tier dependent: free ~1500/h, paid higher)
2. **Complexity points** — per-token (~5000/h typical)

The **complexity** budget is what bites large queries. Each query has a cost based on:
- Field count
- Connection sizes (`first: 100` costs more than `first: 10`)
- Nested resolves

## Headers

Every response includes:
- `X-RateLimit-Limit` — allowance per window
- `X-RateLimit-Remaining` — remaining
- `X-RateLimit-Reset` — epoch when budget resets
- `X-Complexity` — this query's cost
- `X-Complexity-Limit`, `X-Complexity-Remaining`, `X-Complexity-Reset`

The `lib/linear-client.mjs` GraphQL client exposes these as a callback:
```ts
client.onRateLimit((info) => {
  if (info.complexityRemaining < 1000) backoff(info.resetIn);
});
```

## Backoff strategy

When you receive a 429 (or `complexity_limit` GraphQL error):
- Read `X-RateLimit-Reset` / `X-Complexity-Reset`
- Sleep until that epoch + 1s jitter
- Retry once; second 429 → DLQ + alert (don't bury the user under retries)

```ts
async function withBackoff<T>(fn: () => Promise<T>, max = 3): Promise<T> {
  for (let i = 0; i < max; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (e.status !== 429) throw e;
      const reset = Number(e.headers["x-ratelimit-reset"]) * 1000 - Date.now();
      await new Promise(r => setTimeout(r, Math.max(reset, 1000) + Math.random() * 500));
    }
  }
  throw new Error("rate-limit retries exhausted");
}
```

## Pacing for bulk operations

For >50 mutations, pace explicitly:
- 10 in flight max (token bucket capacity)
- 1 per 100ms refill
- Pause if `complexity_remaining < 30%`

Implementation in `lib/rate-limit.ts` (token bucket).

## Webhook back-pressure

Don't poll Linear when you can webhook instead. The bridge agents:
- Subscribe to webhooks for real-time changes
- Only poll for **reconciliation** (every 6h) or after webhook DLQ replay

## Tips
- Prefer one big query with all fields you need over many small ones (fewer round-trips, often lower total complexity)
- Don't request `first: 250` if you only need 10
- Cache slow-moving data (team list, label list) for the duration of a process
- Avoid `every:` and `none:` filters on large connections — they're expensive

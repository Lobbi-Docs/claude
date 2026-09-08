---
name: Linear Pagination + Filtering
description: This skill should be used when fetching large result sets from Linear — cursor pagination, filter DSL, sorting, and complexity budgeting. Activates on "linear pagination", "linear filter", "linear cursor", "linear filtering".
version: 1.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear Pagination + Filtering

References:
- Pagination: https://linear.app/developers/pagination
- Filtering: https://linear.app/developers/filtering

## Cursor pagination

Linear uses opaque forward cursors. Pattern:
```graphql
query Page($cursor: String, $filter: IssueFilter) {
  issues(first: 50, after: $cursor, filter: $filter, orderBy: updatedAt) {
    pageInfo { hasNextPage endCursor }
    nodes { id }
  }
}
```

`first` ranges 1-250. **No `last`/`before`** — Linear is forward-only. To paginate descending, use `orderBy` with the appropriate direction (e.g. `createdAt`).

Helper in `lib/pagination.ts`:
```ts
async function* paginateAll<T>(
  fetch: (cursor: string | null) => Promise<{ nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string } }>
): AsyncGenerator<T> {
  let cursor: string | null = null;
  while (true) {
    const page = await fetch(cursor);
    yield* page.nodes;
    if (!page.pageInfo.hasNextPage) return;
    cursor = page.pageInfo.endCursor;
  }
}
```

## Filter DSL

Filters are nested JSON trees:
```graphql
filter: {
  and: [
    { state: { type: { eq: "started" } } },
    { priority: { lte: 2 } },
    { or: [
      { assignee: { isMe: { eq: true } } },
      { team: { key: { eq: "ENG" } } }
    ] },
    { labels: { some: { name: { in: ["bug", "regression"] } } } }
  ]
}
```

### Comparison operators
| Op | Strings | Numbers | Booleans | Dates |
|----|---------|---------|----------|-------|
| `eq` | ✓ | ✓ | ✓ | ✓ |
| `neq` | ✓ | ✓ | ✓ | ✓ |
| `in` / `nin` | ✓ | ✓ | — | — |
| `contains` / `startsWith` | ✓ | — | — | — |
| `lt` / `lte` / `gt` / `gte` | — | ✓ | — | ✓ |
| `null` | ✓ | ✓ | ✓ | ✓ |

### Connection filters
- `some: { ... }` — at least one related entity matches
- `every: { ... }` — all related entities match
- `none: { ... }` — no related entity matches

### Common filter recipes

**Open issues in current cycle assigned to me:**
```graphql
filter: {
  and: [
    { state: { type: { neq: "completed" } } },
    { cycle: { isActive: { eq: true } } },
    { assignee: { isMe: { eq: true } } }
  ]
}
```

**Issues blocked by something:**
```graphql
filter: { hasRelatedRelations: { eq: true } }
```

**Triage queue for ENG team older than 24h:**
```graphql
filter: {
  and: [
    { team: { key: { eq: "ENG" } } },
    { state: { type: { eq: "triage" } } },
    { createdAt: { lt: "2026-04-29T00:00:00Z" } }
  ]
}
```

## Sorting

`orderBy: updatedAt | createdAt | priority | manual`. For complex sorts, fetch unsorted and sort client-side (only feasible for small result sets).

## Complexity budgeting

Each filter clause adds to query complexity. Reduce by:
- Selecting only needed fields
- Using `first: <smaller>` on connections within nodes
- Splitting one big query into two parallel smaller ones (Linear allows up to 4 in-flight)

---
name: Linear SDK Usage
description: This skill should be used when implementing Linear integrations using the official @linear/sdk — creating issues programmatically, advanced fetch/modify patterns, error handling, and type safety. Activates on "linear sdk", "@linear/sdk", "linear client", "linear typescript".
version: 1.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear SDK (@linear/sdk)

References:
- SDK overview: https://linear.app/developers/sdk
- Advanced usage: https://linear.app/developers/advanced-usage
- Fetch / modify: https://linear.app/developers/sdk-fetching-and-modifying-data
- Errors: https://linear.app/developers/sdk-errors
- Create issues with `linearCreate`: https://linear.app/developers/create-issues-using-linear-new

## Initialisation
```ts
import { LinearClient } from "@linear/sdk";
const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
```
For OAuth:
```ts
const client = new LinearClient({ accessToken: token });
```
For actor mode:
```ts
const client = new LinearClient({
  accessToken: token,
  // Attribution is set by `actor=app` at authorize time, not per call
});
```

## Fetching with lazy connections
The SDK returns `LinearFetch<T>` — promises that auto-resolve nested connections:
```ts
const team = await client.team("ENG");
const issues = await team.issues({ first: 50 });
for (const issue of issues.nodes) {
  const assignee = await issue.assignee;  // lazy fetch — second round-trip
}
```
**Pitfall:** lazy access fires N+1 queries. Use `client.issues({ filter, includeArchived: false })` with a GraphQL query that selects nested fields up front (drop into raw GraphQL via `client.client.rawRequest()`).

## Mutations
```ts
const result = await client.createIssue({
  teamId, title, description, priority: 1
});
if (!result.success) throw new Error("Create failed");
const issue = await result.issue;
```

## Errors
The SDK throws typed errors:
- `AuthenticationError` — token bad
- `UserError` — your input invalid (validation)
- `RatelimitedError` — back off; check `headers.get("X-RateLimit-Reset")`
- `NetworkError` — retry with exponential backoff
- `GraphqlError` — server-side; capture `errors[].extensions.code`
- See: https://linear.app/developers/sdk-errors

## Pagination helper
```ts
async function* paginate(query, vars) {
  let cursor;
  do {
    const page = await query({ ...vars, after: cursor });
    yield* page.nodes;
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
}
```
Used by `lib/pagination.ts`.

## Creating issues with linear.new
For UI-mediated creation (deep-link), see https://linear.app/developers/create-issues-using-linear-new — useful for triage flows that need user input.

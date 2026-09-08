---
name: Linear GraphQL Patterns
description: This skill should be used when writing or reviewing GraphQL queries against the Linear API — selecting fragments, navigating connection types, batching, and avoiding deprecated fields. Activates on "linear graphql", "linear query", "linear api", "linear schema".
version: 1.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear GraphQL Patterns

Reference: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference

## Connection pattern (cursor pagination)
Every list query in Linear returns a `Connection` type:
```graphql
{
  issues(first: 50, after: $cursor, filter: {...}, orderBy: updatedAt) {
    pageInfo { hasNextPage endCursor }
    nodes { id identifier title state { name } }
  }
}
```
Always select `pageInfo { hasNextPage endCursor }` for cursors. Use `first: 50-100` typically; max 250.

## Fragment library
Define re-usable fragments in `lib/queries/fragments.graphql.ts`:
```graphql
fragment IssueCore on Issue {
  id
  identifier
  title
  priority
  estimate
  dueDate
  url
  state { id name type }
  team { id key name }
  assignee { id email displayName }
  parent { id identifier }
  cycle { id name }
  project { id name }
  labels { nodes { id name color } }
}
```

## Mutation patterns
Mutations return a `Payload` with `success` + the entity:
```graphql
mutation {
  issueCreate(input: { ... }) {
    success
    issue { ...IssueCore }
    lastSyncId
  }
}
```
Always check `success` before treating the entity as created.

## Sync IDs
Each mutation returns `lastSyncId`. Pass on subsequent reads (`syncId` arg) to ensure consistency in eventual-consistency scenarios. Webhook payloads include `dataSyncId` you can match.

## Avoiding the N+1 trap
Use `nodes` connections aggressively to fetch labels/assignees in one query rather than per-issue resolves.

## Deprecation handling
- Schema: https://linear.app/developers/deprecations
- The `linear-graphql-expert` agent inspects PRs touching `lib/queries/` and warns on `@deprecated` fields
- Common deprecations to watch: legacy `archivedAt` (now `trashed`), `state` string (now `state { id name type }`)

## Complexity-aware queries
- Each query has a complexity cost (visible in response headers `X-Complexity`)
- Keep cost < 1000 per query; split heavy joins across multiple
- See: https://linear.app/developers/rate-limiting

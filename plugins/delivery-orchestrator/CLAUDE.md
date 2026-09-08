# Linear Orchestrator Plugin Guide

## Purpose
Operational guide for working safely in `plugins/linear-orchestrator`. Keep edits
scoped, minimal, and aligned with this plugin's existing architecture.

## Commands

| Command | Purpose |
|---|---|
| `setup` | Auth (API key / OAuth), MCP, webhooks, VCS provider |
| `issue` | CRUD, sub-issues, templates |
| `assign` · `comment` · `relations` | Issue mutation surface |
| `triage` | Triage queue and routing |
| `cycle` · `project` · `initiative` · `team` | Planning hierarchy |
| `documents` · `customer` · `sla` · `workflow` | Supporting surfaces |
| `agent` | Agent sessions, activities, delegation, guidance, Agent Skills |
| `swarm` | Parallel conductor over the backlog (`lib/swarm/`) |
| `sync` | Two-way Linear ↔ GitHub / Harness Code bridge (`lib/vcs/`) |
| `review` | Linear Diffs — in-Linear review of GitHub PRs |
| `mcp` | Linear's remote MCP server |
| `webhook` · `attachment` · `query` | Plumbing |
| `harness-git` · `harness-platform` | Harness-specific depth |

## Architecture

### Runtime is `.mjs`, not TypeScript
`lib/` is plain ES modules with JSDoc types, zero dependencies, tested with
`node:test`. The plugin is loaded straight from disk by Claude Code with no
build step and no `node_modules`, so anything requiring compilation or an
install is dead code. The 1.0.0 `lib/*.ts` imported `@linear/sdk`, which was
never a declared dependency — it could not have run.

Run the suite with `pnpm test:linear-plugin` from the repo root.

### Layers
```
commands/*.md          user-facing behaviour specs
  |
lib/linear-client.mjs  GraphQL: auth, retry, rate-limit + complexity headers
lib/agent-session.mjs  Agent sessions and activities (the Linear-native status surface)
lib/webhooks.mjs       signature verification, normalisation, delivery dedupe
lib/oauth.mjs          OAuth 2.0 incl. actor=app
lib/attachments.mjs    upload -> attach flow
lib/vcs/               provider contract + GitHub + Harness adapters
lib/swarm/             conductor, delegation ledger, worktree workspaces
```

### VCS providers
One contract (`lib/vcs/provider.mjs`), two adapters. Selected by
`LINEAR_VCS_PROVIDER`. Behaviour above the interface is written once.

The asymmetry to remember: **Linear's Diffs/Reviews product is GitHub-only.**
Check `provider.supportsLinearDiffs` before routing to `/linear:review`; the
Harness path mirrors reviews as issue comments and attachments.

Deep PR driving (review boards, CI drive-to-green, merge trains) belongs to the
`github-orchestrator` plugin. Do not reimplement it here.

## Facts that are easy to get wrong

- **AIG is Agent Interaction Guidelines**, a set of UX rules. It is not a
  gateway or a message bus. There is no `agentSignalCreate`, no `agents:signal`
  scope, and no `lib/aig.ts`.
- **Agent activity types** are `thought`, `action`, `elicitation`, `response`,
  `error`. `response` and `error` are terminal.
- **Assigning an issue to an agent is delegation.** The human assignee stays
  the owner.
- **Linear signatures are bare hex.** GitHub's are `sha256=` prefixed. Verify
  against the raw body, never a re-serialised object.
- **An API key is sent verbatim** in `Authorization`; only OAuth tokens get
  `Bearer`.
- **Linear's MCP is remote**: `https://mcp.linear.app/mcp` over Streamable HTTP.
  There is no `npx @linear/mcp` stdio server. `/sse` is deprecated.
- **Agent scopes** are `app:assignable` and `app:mentionable`.

## Prohibited Actions
- Do not commit secrets. Use `LINEAR_API_KEY`, `LINEAR_OAUTH_CLIENT_SECRET`,
  `LINEAR_WEBHOOK_SECRET`, `GITHUB_TOKEN`, `HARNESS_API_TOKEN`.
- Do not delete or rename `.claude-plugin/plugin.json`.
- Do not bypass webhook signature verification.
- Do not poll Linear faster than the rate limit allows — webhooks first.
- Do not add a runtime dependency to `lib/`. Zero-dependency is a design
  constraint, not an accident.
- Do not reintroduce Microsoft Planner sync. It was removed in 2.0.0; Planner
  orchestration lives in `plugins/tvs-microsoft-deploy`.

## Required Validation
```bash
pnpm test:linear-plugin      # 82 tests, must be green
pnpm check:marketplace       # manifest + frontmatter
pnpm check:plugin-indexes    # commands/agents index.json freshness
```
Regenerate indexes with `pnpm generate:plugin-indexes` after adding or renaming
a command, agent, or skill.

## Rate limits
| Auth | Requests/hr | Complexity/hr |
|---|---|---|
| API key | 2,500 | 3,000,000 |
| OAuth | 5,000 | 2,000,000 |
| Unauthenticated | 600 | 100,000 |

A single query is capped at 10,000 complexity points. Read `X-Complexity` off
the response rather than guessing; `estimateComplexity()` is only a planning aid.

## Context Budget
1. `CONTEXT_SUMMARY.md`
2. The specific `commands/<name>.md`
3. Related `skills/<name>/SKILL.md` only if implementing
4. `lib/` only when modifying behaviour

## Escalation Path
- **Schema drift**: run `/linear:agent verify-schema`, which introspects the
  live schema rather than trusting hardcoded mutation names.
- **Missed webhooks**: run `/linear:sync reconcile`. Do not build delivery
  replay — reconcile also repairs drift from manual edits.
- **Missing VCS credentials**: degrade to Linear-only mode, warn, never
  silently skip writes.

## Key References
- Linear developers: https://linear.app/developers
- Conceptual model: https://linear.app/docs/conceptual-model
- Agents: https://linear.app/docs/agents-in-linear
- Coding sessions: https://linear.app/docs/coding-sessions
- Diffs / Reviews: https://linear.app/docs/diffs
- MCP: https://linear.app/docs/mcp
- Schema reference: https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference
- Harness API: https://apidocs.harness.io

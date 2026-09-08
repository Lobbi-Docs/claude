# Changelog

## 2.0.0 — 2026-09-08

Breaking release. Removes API surface that never existed, replaces the
TypeScript runtime with tested ES modules, generalises the Harness bridge to
cover GitHub, and adds a parallel swarm conductor.

### Removed — fabricated API surface

Version 1.0.0 documented several Linear APIs that do not exist. Anything built
against them could not have worked.

| Removed | Reality |
|---|---|
| "AIG = Agent Intelligence Gateway" agent-to-agent bus | **AIG = Agent Interaction Guidelines**, UX rules, not a service |
| `agentSignalCreate`, signal kinds `progress` / `completion` / `request_input` | `agentActivityCreate` with typed `content`; activity types `thought` / `action` / `elicitation` / `response` / `error` |
| Scopes `agents:create`, `agents:signal` | `app:assignable`, `app:mentionable` |
| `lib/aig.ts`, `aigPublish()`, `aigSubscribe()` | Never existed |
| `Linear-Actor-Token` header, 5-minute backend-minted JWTs, `lib/auth.ts` `mintActorToken()` | Attribution is chosen by the `actor` parameter at authorize time, not per call |
| `lib/webhook-dlq.ts`, `/linear:webhook replay` | Never existed; recovery is `/linear:sync reconcile` |
| `/linear:diff` as "change-history views" over nightly SQLite snapshots | Linear **Diffs** are code review of GitHub pull requests |
| Linear MCP as a local stdio server (`npx -y @linear/mcp`) | Remote Streamable HTTP server at `https://mcp.linear.app/mcp` |

### Removed — Microsoft Planner

The Linear ↔ Microsoft Planner bridge is gone: `commands/planner-sync.md`,
`lib/planner-bridge.ts`, `agents/planner-linear-bridge.md`,
`skills/planner-bridge/`, the Graph credentials and permissions, and the
Planner state tables.

It was off-mission for a Linear plugin and duplicated
`plugins/tvs-microsoft-deploy`, which already ships a `planner-orchestration`
skill, a `planner-orchestrator-agent`, and a Graph endpoint reference. Planner
orchestration lives there.

### Changed — runtime rewritten as tested ES modules

`lib/*.ts` imported `@linear/sdk`, which was never a declared dependency, and
the repository's `tsconfig.json` excludes `plugins/` — so none of it was ever
compiled, type-checked, or run.

Replaced with dependency-free `.mjs` + JSDoc, covered by **82 tests**
(`pnpm test:linear-plugin`):

| New | Replaces |
|---|---|
| `lib/linear-client.mjs` | `lib/client.ts`, `lib/pagination.ts`, `lib/rate-limit.ts` |
| `lib/agent-session.mjs` | the fabricated agent-signal surface |
| `lib/webhooks.mjs` | `lib/webhook-verify.ts` |
| `lib/oauth.mjs` | `lib/auth.ts` |
| `lib/attachments.mjs` | `lib/attachment-upload.ts` |
| `lib/vcs/` | `lib/harness-bridge.ts` |
| `lib/swarm/` | — new |

### Added — GitHub as a first-class provider

`lib/vcs/provider.mjs` defines one contract; `github.mjs` and `harness.mjs`
implement it; `LINEAR_VCS_PROVIDER` selects. Everything above the interface —
issue-key extraction, closing keywords, branch naming, transition intent — is
written once.

`/linear:sync` replaces `/linear:harness-sync` and works with both hosts.
`/linear:review` is new and covers Linear Diffs (GitHub only; the Harness path
mirrors reviews as issue comments and attachments).

Deep pull-request driving is deliberately delegated to `github-orchestrator`
rather than duplicated here.

### Added — swarm conductor

`/linear:swarm` and `lib/swarm/` dispatch a filtered backlog across parallel
Claude Code workers. Modelled on OpenAI's Symphony, with Linear agent sessions
as the status surface instead of a separate dashboard.

- `DelegationLedger` — exclusive leased claims. The failure it prevents is two
  workers taking one issue and opening two pull requests.
- `WorkspaceManager` — a git worktree per issue, with lifecycle hooks. Issue
  keys are validated, not sanitised, so a title cannot escape the root.
- `Conductor` — serialised dispatch, bounded concurrency, exponential backoff,
  stall detection, and a guarantee that every run terminates its agent session
  even when the worker crashes.

### Added — current Linear features

Documented and wired up: agent sessions and activities, **coding sessions**
(Claude Code / Codex in a managed sandbox), **Loops**, **Agent Skills**,
**agent guidance** (workspace and team), Linear **Diffs / Reviews**, the
`linear.review/<owner>/<repo>/pull/<n>` URL form, and the Code & reviews
automations that transition issues without this plugin's involvement.

### Fixed

- **Stall timeout could never fire.** `Conductor._withStallTimeout` called
  `unref()` on its timer. A pending promise does not hold the Node event loop
  open, so in a quiet process the timeout was skipped — exactly the situation a
  stalled worker creates. Covered by a regression test.
- API keys are sent verbatim in `Authorization`; only OAuth tokens get `Bearer`.
- Rate-limit headers are read under both current and legacy spellings, and
  reset values are normalised whether sent in seconds or milliseconds.
- `RATELIMITED` on HTTP 400 is now treated as rate limiting and retried, rather
  than surfaced as a query error.
- Documented limits corrected: 2,500 req/hr + 3M complexity for API keys,
  5,000 + 2M for OAuth, 10,000 complexity cap per query.
- Command, agent and skill counts in the manifest now match the directories.

### Migration

| 1.0.0 | 2.0.0 |
|---|---|
| `/linear:harness-sync …` | `/linear:sync --provider harness …` |
| `/linear:planner-sync …` | removed — see `tvs-microsoft-deploy` |
| `/linear:diff …` | `/linear:review …` (different feature; re-read the command) |
| `skills/harness-bridge/` | `skills/vcs-bridge/` |
| `agents/harness-linear-bridge` | `agents/vcs-linear-bridge` |
| `GRAPH_CLIENT_SECRET`, `GRAPH_TENANT_ID` | no longer used |
| `npx -y @linear/mcp` in `.mcp.json` | `claude mcp add --transport http linear-server https://mcp.linear.app/mcp` |

## 1.0.0 — 2026-04-30

- Initial release.

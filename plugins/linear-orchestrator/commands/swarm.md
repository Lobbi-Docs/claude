---
name: linear:swarm
intent: Run many Claude Code workers in parallel against a Linear backlog, each in an isolated git worktree, reporting into Linear agent sessions
tags:
  - linear-orchestrator
  - command
  - swarm
  - orchestration
  - conductor
inputs:
  - action
risk: high
cost: high
description: Symphony-style conductor dispatching Linear issues to parallel isolated workers (lib/swarm/)
---

# /linear:swarm

Dispatches a Linear backlog across parallel Claude Code workers. Each issue gets
its own git worktree; each run reports as a Linear **agent session** so the work
is visible where the team already looks.

## Architecture

Adapted from OpenAI's Symphony (https://github.com/openai/symphony), which uses
an issue tracker as the control plane for a fleet of coding agents. The
substitution here: Symphony ships an optional operator dashboard, but Linear
already is one — so run-state transitions become agent activities on the issue
instead of a separate surface.

```
  Linear issues (source)
         |
         v
  +----------------+   claim (exclusive, leased)
  |   Conductor    |-----------------------------> DelegationLedger
  |  (serialised   |   unclaimed -> claimed -> running -> complete
  |    dispatch)   |                         \-> failed -> retry (backoff)
  +----------------+
         | bounded concurrency
         v
  +----------------+   git worktree per issue
  |    Worker      |-----------------------------> WorkspaceManager
  | (Claude Code)  |   /ws/ENG-123 on branch linear/eng-123
  +----------------+
         |
         +--> AgentSession: thought -> action* -> response | error
         +--> VcsProvider:  branch -> commit -> pull request
```

Dispatch is serialised on purpose: only the conductor loop claims work, so two
workers can never take the same issue. Workers then run concurrently. The
property under test in `tests/swarm.test.mjs` is exactly this — one issue, one
worker, even across overlapping ticks.

## Why a ledger

The failure that actually bites a swarm is two workers picking up one issue and
opening two pull requests for it. The ledger prevents that with leased,
exclusive claims:

- A claim is held by one `workerId`; anyone else is refused.
- Claims carry a lease. A worker that dies stops heartbeating, the lease lapses,
  and the sweep returns the issue to the pool — this is the only retry path.
- Retries back off `min(10s * 2^(n-1), 5m)` and stop at `maxAttempts`.
- Only the holding worker may advance its own claim.

## Actions

### `start [--concurrency N] [--filter <linear-filter>] [--dry-run]`
Begins the dispatch loop.

- `--concurrency` (default 3) — parallel workers. Raise cautiously: each worker
  is a full Claude Code session and a worktree.
- `--filter` — which issues are eligible, e.g. a label, cycle, or assignee.
  Scope this tightly. A swarm pointed at an ungroomed backlog burns budget on
  issues nobody wanted built.
- `--dry-run` — show the dispatch plan and claims without running workers.

### `status`
In-flight count, active claims, and each claim's state, attempts and last error.

### `stop [--drain]`
Stops claiming new work. `--drain` waits for in-flight runs to finish rather
than leaving them.

### `reclaim [--issue <key>]`
Force-expires a lease. Use when a worker is known dead and you do not want to
wait out the lease.

### `workspaces [--prune]`
Lists worktrees; `--prune` removes those with no active claim.

## Configuration

| Setting | Default | Notes |
|---|---|---|
| `concurrency` | 3 | Parallel workers |
| `pollIntervalMs` | 30000 | Between dispatch passes |
| `leaseMs` | 900000 | Claim lifetime without a heartbeat |
| `stallTimeoutMs` | 600000 | A silent worker is failed, not left hanging |
| `maxAttempts` | 3 | Then the issue is parked for a human |
| `workspaceRoot` | — | Must be outside the repo checkout |
| `baseRef` | `main` | What worktrees fork from |

## Guardrails

- **Every run terminates its session.** A crashed worker still emits `error`;
  an issue never sits in `active` forever without a human learning it failed.
- **Acknowledge within 10 seconds.** The conductor emits a `thought` before any
  git work, so Linear does not mark the session `stale`.
- **Stalled workers are failed.** A worker that goes silent past
  `stallTimeoutMs` is treated as crashed and its claim released.
- **Workspace keys are validated, not sanitised.** A key that is not a
  well-formed Linear identifier is rejected outright, so an issue title can
  never escape the workspace root.
- **Removal is bounded to the workspace root.** The manager refuses to delete a
  path outside it.

## Cost

Each worker is a full Claude Code session. Concurrency 5 on a 20-issue backlog
is 20 sessions, not 5. Start at 2–3, watch `status`, and raise only once you
trust the filter. Prefer `--dry-run` first on any new filter.

## Relationship to Linear coding sessions

Linear can run coding sessions itself. Use those for one-at-a-time GitHub work
with no infrastructure; use the swarm for parallel work, non-GitHub hosts, or
when you need your own runners. See `skills/linear-agents/SKILL.md` for the full
comparison.

## See also
- `lib/swarm/conductor.mjs`, `lib/swarm/ledger.mjs`, `lib/swarm/workspace.mjs`
- `skills/swarm-orchestration/SKILL.md`
- `tests/swarm.test.mjs`

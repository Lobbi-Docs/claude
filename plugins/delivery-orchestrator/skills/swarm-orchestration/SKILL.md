---
name: Swarm Orchestration for Linear
description: This skill should be used when running many parallel coding agents against a Linear backlog — conductor/worker dispatch, exclusive claims, workspace isolation, retry and stall handling. Activates on "swarm", "parallel agents", "conductor", "fan out issues", "symphony", "worktree isolation", "delegation ledger".
version: 1.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Swarm Orchestration

Reference implementation: `lib/swarm/` in this plugin.
Pattern origin: OpenAI Symphony — https://github.com/openai/symphony

## The shape

A swarm over an issue tracker has four parts. Getting any one wrong produces a
characteristic failure, so they are worth naming separately.

| Part | Responsibility | Failure if missing |
|---|---|---|
| **Source** | Which issues are eligible | Agents work on whatever they find, including issues nobody groomed |
| **Ledger** | Who holds what, exclusively | Two workers, one issue, two pull requests |
| **Workspace** | Filesystem isolation per issue | Concurrent workers corrupt each other's checkout |
| **Conductor** | Serialised dispatch, bounded concurrency | Unbounded fan-out; cost and rate limits blow out |

## Serialise dispatch, parallelise work

Only the conductor claims. Workers never claim for themselves. This is the
whole concurrency-safety argument: claiming happens in one place, in one
sequence, so exclusivity is a local property rather than a distributed one.

Workers then run concurrently, bounded by `concurrency`.

## Leases, not locks

A lock held by a dead process is a deadlock. A **lease** expires.

- The holder heartbeats while working.
- The sweep returns lapsed claims to the pool.
- That sweep is the only retry mechanism — there is no separate retry queue to
  drift out of sync with the claim state.

Set the lease well above the p99 run time. Too short and healthy long runs get
stolen mid-flight; too long and a crash parks the issue for ages.

## Worktrees over clones

For a swarm on one repository, `git worktree` beats N clones: the object store
is shared (so N workers is not N× disk or N× fetch) while each worker gets an
independent working tree, index and HEAD.

Use `-B` when creating so a retry after a failed attempt is idempotent rather
than erroring on an existing branch.

Validate the issue key before it reaches a path. Reject anything that is not a
well-formed identifier rather than trying to sanitise it — an issue title is
attacker-controlled input in any workspace with external intake.

## Terminate every run, always

The rule that matters most in practice: **a run must never end silently.**

A crashed worker that does not close its agent session leaves the issue showing
`active` forever, and nobody learns it failed. Wrap the work so the terminal
activity is emitted on both paths, and never let the failure-reporting error
mask the original one.

`AgentSession.guard()` in `lib/agent-session.mjs` does this for a single unit of
work. `Conductor._dispatch` does not call `guard()` — it implements the same
contract inline, because it must also settle the *ledger claim*, which `guard()`
knows nothing about.

The subtlety both must get right: **announcing an outcome is not the same as
deciding it.** Record the outcome first, then report it best-effort. If a
transient failure while posting the closing activity is allowed to fall into the
crash path, successful work gets reported as crashed — which is worse than a
missing activity, because it actively misinforms.

## Backoff and giving up

- Retry backoff `min(10s * 2^(attempt-1), cap)`.
- Cap attempts. After `maxAttempts` the issue is parked for a human.
- Repeated identical failures are a signal about the issue, not the runner.
  Three failures on one issue means the issue is under-specified — escalate it
  rather than burning a fourth attempt.

## Stall detection

A worker that hangs is worse than one that crashes: it holds a slot and a claim
while producing nothing. Race the work against a timeout and treat a silent
worker as failed.

Do not `unref()` that timer. A pending promise does not hold the Node event
loop open, so an unref'd timeout can be skipped entirely in a quiet
process — exactly the situation a stalled worker creates. (This plugin shipped
that bug; `tests/swarm.test.mjs` now covers it.)

## Scope the source tightly

The most expensive mistake is not a bug — it is pointing a swarm at an
ungroomed backlog. Filter by label, cycle, or an explicit "ready for agent"
status. Dry-run any new filter before running it.

## Observability

Emit structured events for every state transition (`run.state`,
`run.complete`, `run.failed`, `run.crashed`, `claim.reclaimed`). When something
goes wrong at concurrency 5, the event stream is the only way to reconstruct
what happened.

Where the tracker has a native agent surface, report there too — the team
should not need a second dashboard to see what the agents did.

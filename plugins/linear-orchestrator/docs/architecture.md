---
name: Linear Orchestrator Architecture
description: Architecture overview of the linear-orchestrator plugin — bridges, state, auth, and event flow
---

# Architecture

## High-level

```
                 ┌─────────────────┐
                 │     Linear      │
                 │  GraphQL + WH   │
                 └────────┬────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │   linear-orchestrator       │
            │                             │
            │  ┌──────────────────────┐   │
            │  │  Webhook ingestion   │   │
            │  │  - signature verify  │   │
            │  │  - idempotency       │   │
            │  │  - DLQ               │   │
            │  └──────────┬───────────┘   │
            │             │               │
            │  ┌──────────▼───────────┐   │
            │  │  Bridge dispatcher   │   │
            │  │  - issue-curator     │   │
            │  │  - triage-officer    │   │
            │  │  - customer-liaison  │   │
            │  │  - sla-monitor       │   │
            │  └──────┬────────┬──────┘   │
            │         │        │          │
            │  ┌──────▼──┐  ┌──▼───────┐  │
            │  │ Harness │  │ Planner  │  │
            │  │ Bridge  │  │ Bridge   │  │
            │  └────┬────┘  └────┬─────┘  │
            │       │            │         │
            │  Delegation ledger (lib/swarm) │
            └───────┼────────────┼─────────┘
                    │            │
                    ▼            ▼
        ┌──────────────────┐  ┌─────────────────┐
        │ Harness Code     │  │ Microsoft       │
        │ (REST + webhooks)│  │ Planner / Graph │
        └──────────────────┘  └─────────────────┘
```

## Layer responsibilities

| Layer | Role |
|-------|------|
| Webhook ingestion | Verify, dedupe, queue to dispatcher |
| Bridge dispatcher | Choose handler agent based on event type + labels |
| Linear-side agents | Pure Linear actions (curator, triage, customer, SLA, etc.) |
| Harness bridge | Two-way sync with Harness Code (PRs, deploys, Git Experience, approvals, triggers, tags) |
| Planner bridge | Two-way sync via Microsoft Graph delta queries |
| State | SQLite — augmenting only; not load-bearing |

## Source of truth rules

- **Linear is canonical** for issues, cycles, projects, initiatives, customers
- **Harness is canonical** for PR/deploy state
- **Planner is canonical** for Planner-only fields (categories, exact `percentComplete` ticks)
- On conflict, newest-writer wins for un-versioned fields

## Auth model

| Surface | Auth |
|---------|------|
| Linear GraphQL | API key (service flow) OR OAuth 2.0 (user flow) OR OAuth-actor (agent on behalf of user) |
| Linear webhooks | HMAC-SHA256 signature verification |
| Linear file storage | Same Bearer token as API |
| Harness REST | `x-api-key` header |
| Harness webhooks | HMAC signature (configured at registration) |
| Microsoft Graph | App-only (client credentials) → Bearer token |

## Event flow examples

### "Issue moved to In Progress"

```
Linear → webhook → bridge dispatcher → vcs-linear-bridge
  → check if PR exists for issue
    if yes: PATCH /v1/repos/{repo}/pullreq/{n} { state: "open" }
    if no: log warning, no auto-create (would surprise the user)
  → planner-linear-bridge
    → find Planner task by issue ID
    → PATCH /planner/tasks/{taskId} { percentComplete: 50, bucketId: <inProgressBucket> }
```

### "Harness deploy succeeded"

```
Harness → webhook → bridge dispatcher → vcs-linear-bridge
  → extract Linear keys from deploy artifact metadata + PR title
  → for each Linear issue: comment + label `deployed:<env>`
  → if any issue is in state "Done", mark deploy as "shipped"
```

### "Planner task moved to Done bucket"

```
Graph delta poll → planner-linear-bridge
  → for each task with bucketId change to "Done":
    → find linked Linear issue ID
    → if found: issueUpdate(id, { stateId: <doneStateId> })
    → if not: create issue in mapped Linear team's triage with task body
```

## Reconciliation

Every 6h:
1. Page recently-updated Linear issues, walk to mapped the VCS provider state
2. Page Harness PRs / Planner tasks, walk back to Linear
3. Diff; auto-heal links (safe), report state drift (manual review)

## Failure modes

See `skills/harness-bridge/SKILL.md` and `skills/planner-bridge/SKILL.md` for the per-bridge failure tables.

## SLOs

- Webhook P95 latency: < 200ms
- Reconciliation lag: < 6h
- Deduplication: zero double-effects in production
- Bridge availability: 99.9% (degrade gracefully when downstreams are down)

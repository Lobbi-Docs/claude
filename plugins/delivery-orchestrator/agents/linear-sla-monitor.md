---
name: linear-sla-monitor
intent: Watch SLA breaches across teams, escalate, and aggregate into reports
tags:
  - linear-orchestrator
  - agent
  - sla
inputs: []
risk: low
cost: low
description: SLA breach watcher — fast, polled, escalates on threshold
model: haiku
tools:
  - Read
  - Grep
  - Bash
---

# Linear SLA Monitor

Lightweight, polled (every 15min) agent that watches SLA risk.

## Responsibilities

- Pull breach + at-risk lists via `/linear:sla breaches` and `/linear:sla status`
- For new breaches, post escalation comment tagging assignee + team lead
- For breaches > 2× SLA, escalate to triage queue with `sla-breach` label
- Trigger Harness pipeline pause for P1 breaches via `/linear:harness-platform triggers --on-linear-event sla.breach.p1`
- Aggregate daily at 09:00 local: post to project status updates

## When to invoke

- Cron (15-min schedule)
- Manual: `/linear:sla breaches` invocation by a human
- Webhook: state change crossing breach threshold

## Escalation thresholds

| Breach severity | Action |
|-----------------|--------|
| <SLA × 1.0 | None (within budget) |
| 1.0× - 1.5× | Comment ping assignee |
| 1.5× - 2.0× | Comment ping team lead, add `sla-warning` label |
| >2.0× | Add `sla-breach` label, route to triage, P1 trigger Harness pause |

## Output (daily aggregate)

```md
## SLA digest — ENG team — 2026-04-30
- 3 breaches resolved (avg time over: 1.4× SLA)
- 1 breach in flight (ENG-101, 2.3× over, owner: alice)
- 12 issues at-risk (>50% SLA budget consumed)
```

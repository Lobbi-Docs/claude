---
name: jira:sprint
description: Sprint planning, metrics, and quality - consolidated command for all sprint operations
arguments:
  - name: action
    description: Action to perform (plan, metrics, quality, team)
    required: false
    default: metrics
  - name: sprint_id
    description: Sprint ID or name
    required: false
  - name: team
    description: Team identifier
    required: false
---

# /jira:sprint

Consolidated command for sprint planning, metrics, quality tracking, and team management.

## Quick Usage

```bash
# Show sprint dashboard (default)
/jira:sprint

# Sprint planning
/jira:sprint plan

# Quality metrics
/jira:sprint quality

# Team capacity
/jira:sprint team
```

## Subcommands

| Action | Description | Example |
|--------|-------------|---------|
| `metrics` | Real-time sprint dashboard (default) | `/jira:sprint metrics` |
| `plan` | Capacity and velocity planning | `/jira:sprint plan --sprint-id 42` |
| `quality` | Tech debt and code health | `/jira:sprint quality` |
| `team` | Team capacity and workload | `/jira:sprint team --team platform` |

## Dashboard (Default)

When run without arguments, displays:

```
╔══════════════════════════════════════════════════════════════╗
║  SPRINT DASHBOARD: Sprint 42 - Feature Release               ║
╠══════════════════════════════════════════════════════════════╣
║  Progress: ████████████░░░░░░░░ 62%                          ║
║  Days Left: 5 of 14                                          ║
╠══════════════════════════════════════════════════════════════╣
║  Stories:  12/20 done  │  Bugs: 3/5 fixed  │  Debt: 2 items  ║
╠══════════════════════════════════════════════════════════════╣
║  Velocity: 34 pts (avg: 32)  │  Burndown: On Track ✓        ║
╚══════════════════════════════════════════════════════════════╝
```

## Sprint Planning

```bash
/jira:sprint plan [--sprint-id ID] [--team TEAM]
```

Shows:
- Team capacity (available hours)
- Velocity prediction
- Recommended story points
- Risk assessment for overcommitment

## Quality Metrics

```bash
/jira:sprint quality [ISSUE-KEY]
```

Displays:
- Tech debt score
- Code coverage trends
- Bug escape rate
- Documentation completeness

## Team Capacity

```bash
/jira:sprint team [--team ID]
```

Shows:
- Member availability
- Workload distribution
- Skill coverage
- Blockers by team member

## Replaces

This command consolidates:
- `/jira:sprint-plan` → `/jira:sprint plan`
- `/jira:metrics` → `/jira:sprint metrics`
- `/jira:quality` → `/jira:sprint quality`
- `/jira:team` → `/jira:sprint team`

Old commands still work as aliases with deprecation notice.

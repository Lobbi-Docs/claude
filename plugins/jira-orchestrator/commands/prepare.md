---
name: jira:prepare
description: Analyze task, decompose into subtasks, enrich with details
arguments:
  - name: issue_key
    description: Jira issue key
    required: true
  - name: depth
    description: Level of detail (basic|standard|comprehensive)
    required: false
    default: standard
  - name: include_estimates
    description: Include time/point estimates
    required: false
    default: true
version: 1.0.0
---

# Prepare Task for Work

Analyze issue, break into subtasks, enrich with descriptions/criteria/estimates.

## Params

- **Issue Key:** ${issue_key}
- **Depth:** ${depth:-standard} | basic (2-4) | standard (4-8) | comprehensive (8-15)
- **Estimates:** ${include_estimates:-true}

## 4-Phase Workflow

| Phase | Agent | Output |
|-------|-------|--------|
| 1. Analyze | `requirements-analyzer` | Scope, complexity, components, AC |
| 2. Decompose | `epic-decomposer` | Subtask tree + dependency graph |
| 3. Enrich | `task-enricher` | Desc, AC, tech notes, testing, estimates |
| 4. Update Jira | `tag-manager` | Create subtasks, apply labels |

## Depth Guide

| Depth | Size | Detail | Count | Best For |
|-------|------|--------|-------|----------|
| basic | Large | High-level | 2-4 | Simple tasks |
| standard | Day | Moderate | 4-8 | Typical sprint |
| comprehensive | Hour | Full | 8-15 | Complex/audit |

## Enrichment per Subtask

- **Title:** Clear, actionable
- **AC:** Specific, testable criteria
- **Tech Notes:** Files, dependencies, considerations
- **Testing:** Unit, integration, manual
- **Estimates:** Points [1/2/3/5/8], time, confidence

## Jira Actions

- Create all subtasks under parent
- Set descriptions and AC
- Set points/time estimates
- Establish dependency links
- Add "prepared" label
- Post summary comment

## Usage

```bash
/jira:prepare issue_key=PROJ-123
/jira:prepare issue_key=PROJ-123 depth=comprehensive
```

## Issue Templates

**Story:** Setup → Design → Implement → Test → Polish → Document

**Bug:** Reproduce → Investigate → Fix → Test → Verify

**Tech Debt:** Audit → Plan → Refactor → Test → Document

**Feature:** Requirements → Design → Backend → Frontend → Integration → Test → Deploy → Document

## Next Commands

- `/jira:work ${issue_key}` - Start working on prepared task
- `/jira:metrics target=${issue_key}` - Track progress

**⚓ Golden Armada** | *The Fleet Stands Ready*

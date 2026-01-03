---
name: jira:commit-template
description: Generate conventional commit templates from Jira issue context with smart commits
arguments:
  - name: issue-key
    description: Jira issue key (auto-detect from branch)
    required: false
  - name: --time
    description: Time (e.g., 2h, 30m, 1d)
    required: false
  - name: --auto-time
    description: Auto-estimate from git diff
    required: false
  - name: --transition
    description: Target transition (e.g., "In Review")
    required: false
  - name: --scope
    description: Override scope
    required: false
  - name: --clipboard
    description: Copy to clipboard
    required: false
---

# Commit Template Generator

Detect issue → Fetch details → Determine scope → Auto-time → Build template → Output

## Workflow

1. Detect issue key (branch > arg > env > session)
2. Fetch from Jira (type, summary, components)
3. Scope: arg > components > modified files > empty
4. Auto-time: 15m + Files×5m + (Lines/100)×10m
5. Build: `type(scope): summary` + smart commits
6. Output: Print/clipboard

## Type Mapping

Bug→fix | Story→feat | Task→chore | Epic→feat | Technical Debt→refactor | Docs→docs

## Usage

```bash
/jira:commit-template
/jira:commit-template PROJ-123
/jira:commit-template --time 2h --transition "In Review"
/jira:commit-template --auto-time --scope auth --clipboard
```

## Smart Commits

- `#comment {text}`
- `#time {value}` (w/d/h/m)
- `#transition "{name}"`

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
Scope: api, auth, ui, db, config, deps, ci
Subject: max 72 chars, lowercase, imperative, no period

## Config

**ENV:** `JIRA_CLOUD_ID`, `JIRA_DEFAULT_TRANSITION`, `JIRA_AUTO_TIME`, `JIRA_AUTO_CLIPBOARD`

**.jirarc.json:** scopeMappings, typeOverrides, defaultTransition, autoTime

## Errors

| Issue | Fix |
|-------|-----|
| Key not found | Use feature/PROJ-123 pattern or --scope |
| API fail | Check auth, fallback to minimal |
| Not in repo | Clone/init |
| Clipboard fail | Install xclip/pbcopy/clip |

## Best Practices

1. Specific: `fix(auth): Prevent race` not `fix: Bug`
2. Imperative: `Add` not `Added`
3. Explain why in body
4. Subject ≤72 chars
5. Adjust auto-time as needed
6. Match project scope conventions

**⚓ Golden Armada** | *The Fleet Stands Ready*
